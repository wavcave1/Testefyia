'use strict';

const express = require('express');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { getStripe } = require('../lib/stripe');
const { EmailService } = require('../services/email/emailService');
const { buildPublicLocationLabel } = require('../lib/location');

const router = express.Router();
const emailWebhookSigningKey = process.env.EMAIL_WEBHOOK_SECRET;
const emailService = new EmailService();

const paymentsSecret =
  process.env.STRIPE_WEBHOOK_SECRET_PAYMENTS ||
  process.env.STRIPE_WEBHOOK_SECRET ||
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
const accountsSecret =
  process.env.STRIPE_WEBHOOK_SECRET_ACCOUNTS ||
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET ||
  process.env.STRIPE_WEBHOOK_SECRET;

async function markEventProcessed(eventId) {
  try {
    await prisma.stripeEvent.update({
      where: { stripeEventId: eventId },
      data: { processed: true },
    });
  } catch (err) {
    console.error('[webhook] failed to mark processed', err.message);
  }
}

async function recordEvent(event) {
  try {
    return await prisma.stripeEvent.upsert({
      where: { stripeEventId: event.id },
      create: {
        stripeEventId: event.id,
        eventType: event.type,
        accountId: event.account ?? null,
        payload: event,
        processed: false,
      },
      update: {},
    });
  } catch (err) {
    console.error('[webhook] failed to record event', err.message);
    return null;
  }
}

async function saveUserCardSnapshot({ userId, paymentMethodId, customerId, connectedAccountId, studioId }) {
  if (!userId || !paymentMethodId || !connectedAccountId) return;

  try {
    const paymentMethod = await getStripe().paymentMethods.retrieve(
      paymentMethodId,
      { stripeAccount: connectedAccountId },
    );
    const card = paymentMethod?.card;
    if (!card) return;

    await prisma.user.update({
      where: { id: userId },
      data: {
        stripePaymentMethodId: paymentMethod.id,
        stripePaymentMethodBrand: card.brand ?? null,
        stripePaymentMethodLast4: card.last4 ?? null,
        stripePaymentMethodExpMonth: card.exp_month ?? null,
        stripePaymentMethodExpYear: card.exp_year ?? null,
        stripePaymentMethodSavedAt: new Date(),
        stripePaymentMethodStudioId: Number.isInteger(studioId) ? studioId : null,
        ...(customerId ? { stripeCustomerId: customerId } : {}),
      },
    });
  } catch (err) {
    console.error('[webhook/payments] failed to save card snapshot:', err.message);
  }
}

// ─── POST /api/webhooks/stripe/payments ──────────────────────────────────────
// Handles payment lifecycle events (succeeded, failed, refunded).
// Must receive the raw request body so Stripe signature verification works.
router.post(
  '/stripe/payments',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    // Debug: Log all webhook attempts
    console.log('[webhook/payments] Received request:', {
      method: req.method,
      path: req.path,
      host: req.get('host'),
      'user-agent': req.get('user-agent'),
      'stripe-signature': req.get('stripe-signature') ? 'present' : 'missing',
      'content-type': req.get('content-type'),
    });

    if (!paymentsSecret) {
      console.error('[webhook/payments] missing STRIPE webhook secret');
      return res.status(500).json({ error: 'Webhook secret not configured.' });
    }
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, paymentsSecret);
    } catch (err) {
      console.error('[webhook/payments] signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    const recorded = await recordEvent(event);
    if (recorded?.processed) {
      return res.json({ received: true, duplicate: true });
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const pi = event.data.object;
          const bookingId = parseInt(pi.metadata?.bookingId, 10);
          const paymentType = pi.metadata?.type || 'full';
          const userId = parseInt(pi.metadata?.userId, 10);
          const studioId = parseInt(pi.metadata?.studioId, 10);
          if (!isNaN(userId) && pi.payment_method && event.account) {
            await saveUserCardSnapshot({
              userId,
              paymentMethodId: pi.payment_method,
              customerId: pi.customer || null,
              connectedAccountId: event.account,
              studioId: isNaN(studioId) ? null : studioId,
            });
          }
          if (!isNaN(bookingId)) {
            const booking = await prisma.booking.findUnique({
              where: { id: bookingId },
              include: {
                studio: {
                  select: {
                    id: true, name: true,
                    addressLine1: true, city: true, state: true, postalCode: true, zip: true,
                    lat: true, lng: true, publicLocationLabel: true,
                  },
                },
                user: { select: { id: true, name: true, email: true } },
              },
            });
            const bookingUpdates = {};
            if (pi.customer) {
              bookingUpdates.stripeCustomerId = pi.customer;
            }
            if (paymentType === 'deposit') {
              bookingUpdates.status = 'CONFIRMED';
              bookingUpdates.depositPaid = true;
              if (pi.payment_method) {
                bookingUpdates.stripePaymentMethodId = pi.payment_method;
              }
            } else if (paymentType === 'final_payment') {
              bookingUpdates.finalPaymentPaid = true;
              // If booking is awaiting final payment, mark it as completed
              if (booking?.status === 'AWAITING_FINAL_PAYMENT') {
                bookingUpdates.status = 'COMPLETED';
              }
            } else {
              bookingUpdates.status = 'CONFIRMED';
              if (pi.payment_method) {
                bookingUpdates.stripePaymentMethodId = pi.payment_method;
              }
            }

            const amount = typeof pi.amount === 'number' ? pi.amount / 100 : 0;
            const fee = typeof pi.application_fee_amount === 'number'
              ? pi.application_fee_amount / 100
              : 0;

            await prisma.$transaction([
              prisma.booking.update({
                where: { id: bookingId },
                data: bookingUpdates,
              }),
              prisma.transaction.upsert({
                where: { stripePaymentIntentId: pi.id },
                update: {
                  status: 'SUCCEEDED',
                  stripeTransferId: pi.transfer ?? null,
                },
                create: {
                  bookingId,
                  stripePaymentIntentId: pi.id,
                  amount,
                  platformFee: fee,
                  netAmount: amount - fee,
                  studioId: booking.studio.id,
                  userId: booking.user.id,
                  status: 'SUCCEEDED',
                  paymentType: paymentType === 'deposit'
                    ? 'DEPOSIT'
                    : paymentType === 'final_payment'
                      ? 'FINAL'
                      : 'FULL',
                },
              }),
            ]);

            if (booking?.user?.email) {
              try {
                if (paymentType !== 'final_payment') {
                  // Send "Booking Received" email first
                  console.log('[webhook/payments] Sending booking created email to:', booking.user.email);
                  await emailService.sendBookingCreated({
                    to: booking.user.email,
                    customerName: booking.user.name,
                    studioName: booking.studio.name,
                    bookingId: booking.id,
                    date: booking.date,
                    time: booking.time,
                    sessionType: booking.sessionType,
                    location: buildPublicLocationLabel(booking.studio),
                    actorUserId: booking.user.id,
                    studioId: booking.studio.id,
                  });
                  console.log('[webhook/payments] Booking created email sent successfully');

                  // Then send confirmation email
                  const amountRemaining = paymentType === 'deposit'
                    ? Math.round((booking.total - amount) * 100) / 100
                    : 0;
                  await emailService.sendBookingConfirmation({
                    to: booking.user.email,
                    customerName: booking.user.name,
                    studioName: booking.studio.name,
                    bookingId: booking.id,
                    date: booking.date,
                    time: booking.time,
                    sessionType: booking.sessionType,
                    addressLine1: booking.studio.addressLine1 || null,
                    city: booking.studio.city || null,
                    state: booking.studio.state || null,
                    postalCode: booking.studio.postalCode || booking.studio.zip || null,
                    lat: booking.studio.lat || null,
                    lng: booking.studio.lng || null,
                    location: buildPublicLocationLabel(booking.studio),
                    total: booking.total || null,
                    amountPaid: amount,
                    amountRemaining,
                    paymentType,
                    actorUserId: booking.user.id,
                    studioId: booking.studio.id,
                  });
                }
                await emailService.sendPaymentReceipt({
                  to: booking.user.email,
                  customerName: booking.user.name,
                  bookingId: booking.id,
                  amount,
                  actorUserId: booking.user.id,
                  studioId: booking.studio.id,
                });
                // Send completion email if booking is now complete
                if (paymentType === 'final_payment' && booking?.status === 'AWAITING_FINAL_PAYMENT') {
                  await emailService.sendBookingCompletion({
                    to: booking.user.email,
                    customerName: booking.user.name,
                    studioName: booking.studio.name,
                    bookingId: booking.id,
                    actorUserId: booking.user.id,
                    studioId: booking.studio.id,
                  });
                }
              } catch (emailErr) {
                console.error('[webhook/payments] email send failed:', {
                  bookingId,
                  email: booking?.user?.email,
                  error: emailErr.message,
                  stack: emailErr.stack,
                });
              }
            } else {
              console.warn('[webhook/payments] No user email found for booking:', bookingId);
            }
          }
          break;
        }
        case 'setup_intent.succeeded': {
          const si = event.data.object;
          const userId = parseInt(si.metadata?.userId, 10);
          const studioId = parseInt(si.metadata?.studioId, 10);
          if (!isNaN(userId) && si.payment_method && event.account) {
            await saveUserCardSnapshot({
              userId,
              paymentMethodId: si.payment_method,
              customerId: si.customer || null,
              connectedAccountId: event.account,
              studioId: isNaN(studioId) ? null : studioId,
            });
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const pi = event.data.object;
          if (pi.metadata?.type === 'final_payment') {
            const bookingId = parseInt(pi.metadata?.bookingId, 10);
            if (!isNaN(bookingId)) {
              await prisma.booking.update({
                where: { id: bookingId },
                data: { finalPaymentPaid: false },
              });
            }
          }
          await prisma.transaction.updateMany({
            where: { stripePaymentIntentId: pi.id },
            data: { status: 'FAILED' },
          });
          break;
        }

        case 'charge.refunded': {
          const charge = event.data.object;
          const piId = charge.payment_intent;
          if (piId) {
            const isFullRefund = charge.amount_refunded === charge.amount;
            const refundId = charge.refunds?.data?.[0]?.id ?? null;
            await prisma.$transaction([
              prisma.transaction.updateMany({
                where: { stripePaymentIntentId: piId },
                data: {
                  status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
                  stripeRefundId: refundId,
                },
              }),
              prisma.booking.updateMany({
                where: {
                  OR: [
                    { stripePaymentIntentId: piId },
                    { finalPaymentIntentId: piId },
                  ],
                },
                data: {
                  status: 'CANCELLED',
                  finalPaymentPaid: false,
                },
              }),
            ]);
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[webhook/payments] handler error:', err);
      return res.status(500).json({ error: 'Internal webhook handler error.' });
    }

    await markEventProcessed(event.id);
    return res.json({ received: true });
  },
);

// ─── POST /api/webhooks/stripe/accounts ──────────────────────────────────────
// Handles Stripe Connect account lifecycle events.
router.post(
  '/stripe/accounts',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!accountsSecret) {
      console.error('[webhook/accounts] missing STRIPE connect webhook secret');
      return res.status(500).json({ error: 'Webhook secret not configured.' });
    }
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, accountsSecret);
    } catch (err) {
      console.error('[webhook/accounts] signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    const recorded = await recordEvent(event);
    if (recorded?.processed) {
      return res.json({ received: true, duplicate: true });
    }

    try {
      switch (event.type) {
        case 'account.updated': {
          const account = event.data.object;
          let status = 'PENDING';
          if (account.charges_enabled && account.details_submitted) {
            status = 'ACTIVE';
          } else if (account.details_submitted) {
            status = 'RESTRICTED';
          }
          await prisma.studio.updateMany({
            where: { stripeConnectAccountId: account.id },
            data: {
              stripeConnectStatus: status,
              stripeChargesEnabled: account.charges_enabled,
              stripePayoutsEnabled: account.payouts_enabled,
              stripeDetailsSubmitted: account.details_submitted,
              stripeOnboardingComplete: account.charges_enabled && account.details_submitted,
              ...(account.charges_enabled ? { stripeActivatedAt: new Date() } : {}),
            },
          });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[webhook/accounts] handler error:', err);
      return res.status(500).json({ error: 'Internal webhook handler error.' });
    }

    await markEventProcessed(event.id);
    return res.json({ received: true });
  },
);

router.post('/email/events', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const signature = req.body.signature || {};

    if (emailWebhookSigningKey && signature.timestamp && signature.token && signature.signature) {
      const digest = crypto
        .createHmac('sha256', emailWebhookSigningKey)
        .update(`${signature.timestamp}${signature.token}`)
        .digest('hex');

      if (digest !== signature.signature) {
        return res.status(401).json({ error: 'Invalid webhook signature.' });
      }
    }

    const eventData = req.body['event-data'] || {};
    const recipient = eventData.recipient || req.body.recipient || null;
    const messageId = eventData['message-id'] || req.body['Message-Id'] || null;
    const eventType = eventData.event || req.body.event || 'provider_event';
    const severity = ['failed', 'rejected', 'bounced'].includes(eventType) ? 'FAILED' : 'DELIVERED';

    const alias = recipient
      ? await prisma.emailAlias.findFirst({ where: { fullEmail: recipient.toLowerCase() } })
      : null;

    await prisma.emailEvent.create({
      data: {
        domainId: alias?.domainId || null,
        aliasId: alias?.id || null,
        eventType,
        providerMessageId: messageId,
        providerEventId: eventData.id || null,
        deliveryStatus: severity,
        payload: eventData,
      },
    });

    return res.json({ received: true });
  } catch (err) {
    console.error('[webhook/email] handler error:', err);
    return res.status(500).json({ error: 'Internal webhook handler error.' });
  }
});

module.exports = router;
