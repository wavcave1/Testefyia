'use strict';

const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { getStripe, calculateApplicationFee, createOffSessionCharge, ensureStripeCustomer } = require('../lib/stripe');
const { checkAvailability } = require('../lib/availability');
const { attachAuthorizedBookingLocation, buildPublicLocationLabel } = require('../lib/location');
const { EmailService } = require('../services/email/emailService');

const router = express.Router();
const emailService = new EmailService();

function calcPlatformFee(subtotal) {
  const flatFee = Number(process.env.STRIPE_FLAT_FEE_CENTS ?? 200) / 100;
  const cap = Number(process.env.STRIPE_FEE_CAP_CENTS ?? 1500) / 100;
  const percent = Number(process.env.STRIPE_FEE_PERCENT ?? 2) / 100;
  const percentFee = Math.round(subtotal * percent * 100) / 100;
  return Math.min(Math.max(flatFee, percentFee), cap);
}

const createBookingSchema = z.object({
  studioId: z.coerce.number().int().positive(),
  sessionType: z.string().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.'),
  time: z.string().min(1),
  hours: z.coerce.number().int().min(1).max(12),
  depositAmount: z.number().nonnegative().optional(),
  depositPercent: z.number().min(0).max(100).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'AWAITING_FINAL_PAYMENT', 'COMPLETED', 'CANCELLED']),
});

function getServicePrice(services, sessionType) {
  if (!Array.isArray(services) || !sessionType) return null;

  const lower = sessionType.toLowerCase();
  const match = services.find((s) =>
    s.name?.toLowerCase() === lower ||
    s.name?.toLowerCase().includes(lower) ||
    lower.includes(s.name?.toLowerCase())
  );

  return match?.price || null;
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Helper: Calculate remaining balance for a booking
function calculateBalance(booking) {
  const total = booking.total || 0;
  const deposit = booking.depositAmount || 0;

  if (deposit === 0) {
    // Full payment booking (already paid up front)
    return {
      totalBalance: 0,
      depositAmount: 0,
      finalPaymentAmount: 0,
      hasDeposit: false,
      requiresPayment: false,
      valid: true,
    };
  }

  // Deposit booking - validate deposit is paid
  const hasSuccessfulDepositTxn = Array.isArray(booking.transactions)
    && booking.transactions.some(
      (txn) => txn.status === 'SUCCEEDED' && txn.paymentType === 'DEPOSIT'
    );

  if (!booking.depositPaid && !hasSuccessfulDepositTxn) {
    return {
      error: 'Deposit must be paid before completion',
      valid: false,
    };
  }

  const remaining = total - deposit;
  return {
    totalBalance: remaining,
    depositAmount: deposit,
    finalPaymentAmount: remaining,
    hasDeposit: true,
    requiresPayment: remaining > 0 && !booking.finalPaymentPaid,
    valid: true,
  };
}

// Helper: Attempt to auto-charge the remaining balance
async function attemptAutoCharge(booking, amountCents, studio) {
  if (!booking.stripePaymentMethodId) {
    return { succeeded: false, reason: 'no_saved_method' };
  }

  // Off-session reuse of a saved payment method requires the customer the
  // method was attached to. Prefer the customer recorded on the booking;
  // fall back to the user's saved customer if the saved card is for this
  // same studio (customers are scoped per connected account).
  let customerId = booking.stripeCustomerId;
  if (!customerId) {
    const user = await prisma.user.findUnique({
      where: { id: booking.userId },
      select: { stripeCustomerId: true, stripePaymentMethodStudioId: true },
    });
    if (user?.stripeCustomerId && user.stripePaymentMethodStudioId === studio.id) {
      customerId = user.stripeCustomerId;
      await prisma.booking.update({
        where: { id: booking.id },
        data: { stripeCustomerId: customerId },
      });
    }
  }
  if (!customerId) {
    return { succeeded: false, reason: 'no_saved_customer' };
  }

  try {
    const paymentResult = await createOffSessionCharge(
      amountCents,
      booking.stripePaymentMethodId,
      studio.stripeConnectAccountId,
      {
        bookingId: String(booking.id),
        studioId: String(studio.id),
        userId: String(booking.userId),
        type: 'final_payment',
        paymentType: 'final',
      },
      customerId,
    );

    if (paymentResult.id) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { finalPaymentIntentId: paymentResult.id },
      });
    }

    return {
      succeeded: paymentResult.status === 'succeeded',
      intentId: paymentResult.id,
      status: paymentResult.status,
    };
  } catch (err) {
    console.error('[bookings] auto-charge failed for booking ' + booking.id + ':', err.message);
    return { succeeded: false, reason: 'charge_failed', error: err.message };
  }
}

// Helper: Create manual payment intent for final payment
async function createManualPaymentIntent(booking, studio, amountCents) {
  const platformFeeCents = calculateApplicationFee(amountCents);

  const user = await prisma.user.findUnique({
    where: { id: booking.userId },
    select: {
      id: true, email: true, name: true,
      stripeCustomerId: true, stripePaymentMethodStudioId: true,
    },
  });
  const reusableCustomerId =
    booking.stripeCustomerId
      || (user?.stripePaymentMethodStudioId === studio.id ? user.stripeCustomerId : null);
  const customerId = await ensureStripeCustomer({
    user: user || { id: booking.userId },
    connectedAccountId: studio.stripeConnectAccountId,
    existingCustomerId: reusableCustomerId,
  });

  const paymentIntent = await getStripe().paymentIntents.create(
    {
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      application_fee_amount: platformFeeCents,
      setup_future_usage: 'off_session',
      metadata: {
        bookingId: String(booking.id),
        studioId: String(studio.id),
        userId: String(booking.userId),
        type: 'final_payment',
        paymentType: 'final',
      },
      automatic_payment_methods: { enabled: true },
    },
    {
      stripeAccount: studio.stripeConnectAccountId,
      idempotencyKey: `booking-final-${booking.id}`,
    }
  );

  if (booking.stripeCustomerId !== customerId) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // Create transaction record
  await prisma.transaction.upsert({
    where: { stripePaymentIntentId: paymentIntent.id },
    update: { status: 'PENDING' },
    create: {
      bookingId: booking.id,
      stripePaymentIntentId: paymentIntent.id,
      amount: amountCents / 100,
      platformFee: platformFeeCents / 100,
      netAmount: (amountCents - platformFeeCents) / 100,
      studioId: studio.id,
      userId: booking.userId,
      status: 'PENDING',
      paymentType: 'FINAL',
    },
  });

  return {
    intentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
  };
}

// Helper: Complete booking after payment confirmed or zero balance
async function completeBooking(booking, updates = {}) {
  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'COMPLETED',
      ...updates,
    },
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

  // Send completion email
  try {
    await emailService.sendBookingCompletion({
      to: updatedBooking.user.email,
      customerName: updatedBooking.user.name,
      studioName: updatedBooking.studio.name,
      bookingId: updatedBooking.id,
      actorUserId: booking.userId,
      studioId: updatedBooking.studio.id,
    });
  } catch (emailErr) {
    console.error('[email] booking completion email failed:', emailErr.message);
  }

  return updatedBooking;
}

// GET /api/bookings
router.get('/', requireAuth, async (req, res, next) => {
  try {
    let where = {};

    if (req.user.role === 'CLIENT') {
      where = { userId: req.user.id };
    } else if (req.user.role === 'OWNER') {
      const ownedStudios = await prisma.studio.findMany({
        where: { ownerId: req.user.id },
        select: { id: true },
      });

      where = { studioId: { in: ownedStudios.map((s) => s.id) } };
    } else if (req.user.role === 'ADMIN') {
      // admin sees all
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        studio: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            country: true,
            addressLine1: true,
            addressLine2: true,
            postalCode: true,
            zip: true,
            arrivalInstructions: true,
            publicLocationLabel: true,
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(bookings.map((booking) => attachAuthorizedBookingLocation(booking)));
  } catch (err) {
    return next(err);
  }
});

// GET /api/bookings/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid booking id.' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        studio: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (req.user.role === 'CLIENT' && booking.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (req.user.role === 'OWNER' && booking.studio.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (!['CLIENT', 'OWNER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    return res.json(attachAuthorizedBookingLocation(booking));
  } catch (err) {
    return next(err);
  }
});

// POST /api/bookings
router.post('/', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'CLIENT') {
      return res.status(403).json({ error: 'Only clients can create bookings.' });
    }

    const data = createBookingSchema.parse(req.body);

    const bookingDate = parseLocalDate(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      return res.status(400).json({ error: 'Booking date cannot be in the past.' });
    }

    const studio = await prisma.studio.findUnique({
      where: { id: data.studioId },
    });

    if (!studio) {
      return res.status(404).json({ error: 'Studio not found.' });
    }

    const avail = await checkAvailability(prisma, studio.id, data.date, data.time, data.hours);
    if (!avail.available) {
      return res.status(409).json({ error: avail.reason || 'This time slot is not available.' });
    }

    const hasSessionTypes =
      Array.isArray(studio.sessionTypes) && studio.sessionTypes.length > 0;

    if (hasSessionTypes && !studio.sessionTypes.includes(data.sessionType)) {
      return res.status(400).json({ error: 'Invalid session type for this studio.' });
    }

    const services = Array.isArray(studio.services) ? studio.services : [];
    const servicePrice = getServicePrice(services, data.sessionType);
    const pricePerHour = servicePrice || studio.pricePerHour;

    const subtotal = pricePerHour * data.hours;
    const platformFee = calcPlatformFee(subtotal);
    const total = subtotal + platformFee;

    let finalDepositPercent = null;
    let finalDepositAmount = null;

    if (data.depositPercent !== undefined && data.depositPercent > 0) {
      finalDepositPercent = Number(data.depositPercent);
      finalDepositAmount = Math.round(subtotal * (finalDepositPercent / 100) * 100) / 100;
    } else if (data.depositAmount !== undefined && data.depositAmount > 0) {
      finalDepositAmount = data.depositAmount;
      finalDepositPercent = Math.round((finalDepositAmount / subtotal) * 10000) / 100;
    } else if (studio.bookingInfo?.depositPercent) {
      finalDepositPercent = Number(studio.bookingInfo.depositPercent);
      finalDepositAmount = Math.round(subtotal * (finalDepositPercent / 100) * 100) / 100;
    }

    const booking = await prisma.booking.create({
      data: {
        studioId: studio.id,
        userId: req.user.id,
        sessionType: data.sessionType,
        date: data.date,
        time: data.time,
        hours: data.hours,
        subtotal,
        platformFee,
        total,
        status: 'PENDING',
        depositPercent: finalDepositPercent,
        depositAmount: finalDepositAmount,
        depositPaid: false,
        finalPaymentDue: finalDepositPercent
          ? (function() {
            const d = new Date(data.date + 'T12:00:00');
            d.setDate(d.getDate() - 1);
            return d.toISOString().slice(0, 10);
          })()
          : null,
      },
      include: {
        studio: { select: { id: true, name: true, city: true, state: true } },
      },
    });

    // ✓ Email moved to payment webhook - send only after payment clears
    // This ensures customers only receive confirmation after successful payment

    return res.status(201).json(booking);
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/bookings/:id/status
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid booking id.' });
    }

    let { status } = updateStatusSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        studio: true,
        transactions: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (req.user.role === 'CLIENT') {
      if (booking.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      if (status !== 'CANCELLED') {
        return res.status(403).json({ error: 'Clients can only cancel bookings.' });
      }
    } else if (req.user.role === 'OWNER') {
      if (booking.studio.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      if (!['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
        return res.status(403).json({ error: 'Invalid status transition.' });
      }
    } else if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Handle COMPLETED status with new payment flow
    if (status === 'COMPLETED') {
      const balanceInfo = calculateBalance(booking);

      // If balance calculation failed, return error
      if (!balanceInfo.valid) {
        return res.status(400).json({ error: balanceInfo.error });
      }

      // If no payment required, mark complete immediately
      if (balanceInfo.totalBalance === 0) {
        // Continue to update booking below
      } else {
        // Balance due - handle payment processing
        const amountCents = Math.round(balanceInfo.finalPaymentAmount * 100);

        // Check if Stripe is configured
        if (!booking.studio.stripeConnectAccountId || booking.studio.stripeConnectStatus !== 'ACTIVE') {
          return res.status(400).json({
            error: 'Stripe is not configured for this studio. Final payment cannot be processed.',
          });
        }

        // Try auto-charge if payment method is saved
        if (booking.stripePaymentMethodId) {
          const autoChargeResult = await attemptAutoCharge(booking, amountCents, booking.studio);

          if (autoChargeResult.succeeded) {
            // Auto-charge succeeded - mark COMPLETED
            status = 'COMPLETED';
          } else {
            // Auto-charge failed - create manual intent and mark AWAITING_FINAL_PAYMENT
            try {
              const manualResult = await createManualPaymentIntent(
                booking,
                booking.studio,
                amountCents
              );

              // Update booking with intent ID and status
              const updated = await prisma.booking.update({
                where: { id: booking.id },
                data: {
                  status: 'AWAITING_FINAL_PAYMENT',
                  finalPaymentIntentId: manualResult.intentId,
                },
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

              // Send payment reminder email
              try {
                await emailService.sendFinalPaymentReminder({
                  to: updated.user.email,
                  customerName: updated.user.name,
                  studioName: updated.studio.name,
                  bookingId: updated.id,
                  amount: balanceInfo.finalPaymentAmount,
                  actorUserId: req.user.id,
                  studioId: updated.studio.id,
                });
              } catch (emailErr) {
                console.error('[email] final payment reminder email failed:', emailErr.message);
              }

              return res.json({
                ...updated,
                requiresManualPayment: true,
                finalPaymentDue: updated.finalPaymentDue,
              });
            } catch (paymentErr) {
              console.error('[bookings] manual payment intent creation failed:', paymentErr.message);
              return res.status(500).json({
                error: 'Failed to create payment request. Please try again.',
              });
            }
          }
        } else {
          // No saved payment method - create manual intent and mark AWAITING_FINAL_PAYMENT
          try {
            const manualResult = await createManualPaymentIntent(
              booking,
              booking.studio,
              amountCents
            );

            // Update booking with intent ID and status
            const updated = await prisma.booking.update({
              where: { id: booking.id },
              data: {
                status: 'AWAITING_FINAL_PAYMENT',
                finalPaymentIntentId: manualResult.intentId,
              },
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

            // Send payment reminder email
            try {
              await emailService.sendFinalPaymentReminder({
                to: updated.user.email,
                customerName: updated.user.name,
                studioName: updated.studio.name,
                bookingId: updated.id,
                amount: balanceInfo.finalPaymentAmount,
                actorUserId: req.user.id,
                studioId: updated.studio.id,
              });
            } catch (emailErr) {
              console.error('[email] final payment reminder email failed:', emailErr.message);
            }

            return res.json({
              ...updated,
              requiresManualPayment: true,
              finalPaymentDue: updated.finalPaymentDue,
            });
          } catch (paymentErr) {
            console.error('[bookings] manual payment intent creation failed:', paymentErr.message);
            return res.status(500).json({
              error: 'Failed to create payment request. Please try again.',
            });
          }
        }
      }
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'This booking is already cancelled.' });
    }

    let refundResult = null;

    if (status === 'CANCELLED') {
      const paymentIntentId =
        booking.stripePaymentIntentId ||
        (booking.transactions?.[0] && booking.transactions[0].stripePaymentIntentId);

      const connectedAccountId =
        booking.studio && booking.studio.stripeConnectAccountId;

      if (paymentIntentId && connectedAccountId) {
        try {
          const stripe = getStripe();

          const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
            stripeAccount: connectedAccountId,
          });

          if (pi.status === 'succeeded') {
            const refund = await stripe.refunds.create(
              {
                payment_intent: paymentIntentId,
                reason: 'requested_by_customer',
                
              },
              { stripeAccount: connectedAccountId }
            );

            refundResult = {
              refundId: refund.id,
              status: refund.status,
              amountCents: refund.amount,
            };

            await prisma.transaction.updateMany({
              where: { stripePaymentIntentId: paymentIntentId },
              data: {
                status: 'REFUNDED',
                stripeRefundId: refund.id,
              },
            });
          } else if (pi.status === 'processing') {
            await stripe.paymentIntents.cancel(paymentIntentId, {
              cancellation_reason: 'requested_by_customer',
            });

            refundResult = { status: 'cancelled_before_capture' };
          } else {
            refundResult = { status: 'no_charge', piStatus: pi.status };
          }
        } catch (stripeErr) {
          console.error('[bookings] Refund failed for booking ' + id + ':', stripeErr.message);
          refundResult = { error: stripeErr.message };
        }
      } else {
        refundResult = { status: 'no_payment_found' };
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status },
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

    if (status === 'CONFIRMED') {
      try {
        const isDeposit = updated.depositPaid && updated.depositAmount != null;
        await emailService.sendBookingConfirmation({
          to: updated.user.email,
          customerName: updated.user.name,
          studioName: updated.studio.name,
          bookingId: updated.id,
          date: updated.date,
          time: updated.time,
          sessionType: updated.sessionType,
          addressLine1: updated.studio.addressLine1 || null,
          city: updated.studio.city || null,
          state: updated.studio.state || null,
          postalCode: updated.studio.postalCode || updated.studio.zip || null,
          lat: updated.studio.lat || null,
          lng: updated.studio.lng || null,
          location: buildPublicLocationLabel(updated.studio),
          total: updated.total || null,
          amountPaid: isDeposit ? updated.depositAmount : null,
          amountRemaining: isDeposit ? (updated.total - updated.depositAmount) : null,
          paymentType: isDeposit ? 'deposit' : null,
          actorUserId: req.user.id,
          studioId: updated.studio.id,
        });
      } catch (err) {
        console.error('[email] booking confirmation email failed:', err.message);
      }
    }

    if (status === 'CANCELLED') {
      try {
        await emailService.sendBookingCancellation({
          to: updated.user.email,
          customerName: updated.user.name,
          studioName: updated.studio.name,
          bookingId: updated.id,
          actorUserId: req.user.id,
          studioId: updated.studio.id,
        });
      } catch (err) {
        console.error('[email] booking cancellation email failed:', err.message);
      }
    }

    if (status === 'COMPLETED') {
      try {
        await emailService.sendBookingCompletion({
          to: updated.user.email,
          customerName: updated.user.name,
          studioName: updated.studio.name,
          bookingId: updated.id,
          actorUserId: req.user.id,
          studioId: updated.studio.id,
        });
      } catch (err) {
        console.error('[email] booking completion email failed:', err.message);
      }
    }

    return res.json({
      ...updated,
      refund: refundResult,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
