'use strict';

const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getStripe, calculateApplicationFee, ensureStripeCustomer } = require('../lib/stripe');
const { EmailService } = require('../services/email/emailService');

const router = express.Router();
const emailService = new EmailService();
const setupIntentSchema = z.object({
  studioId: z.number().int().positive().optional(),
});

// POST /api/payments/intents
// Creates a Stripe PaymentIntent for a pending booking.
// Charges the full booking total; platform fee is retained by Efyia,
// net amount is transferred to the studio's connected Stripe account.
router.post('/intents', requireAuth, async (req, res, next) => {
  try {
    const { bookingId } = z.object({
      bookingId: z.number().int().positive(),
    }).parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { studio: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ error: 'Booking is not in a payable state.' });
    }
    if (booking.stripePaymentIntentId) {
      return res.status(400).json({ error: 'Payment already initiated for this booking.' });
    }

    const { studio } = booking;
    if (!studio.stripeConnectAccountId || studio.stripeConnectStatus !== 'ACTIVE') {
      return res.status(400).json({ error: 'This studio is not yet set up to accept payments.' });
    }

    const amountCents = Math.round(booking.total * 100);
    const platformFeeCents = Math.round(booking.platformFee * 100);

    const userRecord = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, name: true,
        stripeCustomerId: true, stripePaymentMethodStudioId: true,
      },
    });
    const reusableCustomerId =
      userRecord?.stripePaymentMethodStudioId === studio.id ? userRecord.stripeCustomerId : null;
    const customerId = await ensureStripeCustomer({
      user: userRecord || req.user,
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
          userId: String(req.user.id),
          paymentType: 'full',
        },
        automatic_payment_methods: { enabled: true },
      },
      {
        // Direct charge: PaymentIntent lives on the connected account
        stripeAccount: studio.stripeConnectAccountId,
        idempotencyKey: `booking-${booking.id}`,
      },
    );

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: { stripePaymentIntentId: paymentIntent.id, stripeCustomerId: customerId },
      }),
      prisma.transaction.create({
        data: {
          bookingId: booking.id,
          stripePaymentIntentId: paymentIntent.id,
          amount: booking.total,
          platformFee: booking.platformFee,
          netAmount: booking.subtotal,
          studioId: studio.id,
          userId: req.user.id,
          status: 'PENDING',
        },
      }),
    ]);

    return res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      connectedAccountId: studio.stripeConnectAccountId,
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/payments/intents/:paymentIntentId/status
router.get('/intents/:paymentIntentId/status', requireAuth, async (req, res, next) => {
  try {
    const { paymentIntentId } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      include: {
        booking: { select: { id: true, status: true, date: true, sessionType: true, hours: true } },
        studio: { select: { id: true, name: true, city: true, state: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found.' });

    if (req.user.role === 'CLIENT' && transaction.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    return res.json(transaction);
  } catch (err) {
    return next(err);
  }
});

// GET /api/payments/saved-card
router.get('/saved-card', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        stripePaymentMethodId: true,
        stripePaymentMethodBrand: true,
        stripePaymentMethodLast4: true,
        stripePaymentMethodExpMonth: true,
        stripePaymentMethodExpYear: true,
        stripePaymentMethodSavedAt: true,
        stripePaymentMethodStudioId: true,
      },
    });

    return res.json({
      hasSavedCard: Boolean(user?.stripePaymentMethodId),
      card: user?.stripePaymentMethodId
        ? {
          brand: user.stripePaymentMethodBrand,
          last4: user.stripePaymentMethodLast4,
          expMonth: user.stripePaymentMethodExpMonth,
          expYear: user.stripePaymentMethodExpYear,
          savedAt: user.stripePaymentMethodSavedAt,
          studioId: user.stripePaymentMethodStudioId,
        }
        : null,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/payments/setup-intent
// Creates a SetupIntent so a client can save a card from account settings.
router.post('/setup-intent', requireAuth, async (req, res, next) => {
  try {
    const { studioId } = setupIntentSchema.parse(req.body || {});

    let targetStudioId = studioId;
    if (!targetStudioId) {
      const latestBooking = await prisma.booking.findFirst({
        where: {
          userId: req.user.id,
          studio: { stripeConnectStatus: 'ACTIVE' },
        },
        select: { studioId: true },
        orderBy: { createdAt: 'desc' },
      });
      targetStudioId = latestBooking?.studioId;
    }

    if (!targetStudioId) {
      return res.status(400).json({
        error: 'A studioId is required to save a card when no prior payable booking exists.',
      });
    }

    const studio = await prisma.studio.findUnique({
      where: { id: targetStudioId },
      select: { id: true, stripeConnectAccountId: true, stripeConnectStatus: true },
    });
    if (!studio?.stripeConnectAccountId || studio.stripeConnectStatus !== 'ACTIVE') {
      return res.status(400).json({ error: 'This studio is not yet set up to accept payments.' });
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, name: true,
        stripeCustomerId: true, stripePaymentMethodStudioId: true,
      },
    });
    const reusableCustomerId =
      userRecord?.stripePaymentMethodStudioId === studio.id ? userRecord.stripeCustomerId : null;
    const customerId = await ensureStripeCustomer({
      user: userRecord || req.user,
      connectedAccountId: studio.stripeConnectAccountId,
      existingCustomerId: reusableCustomerId,
    });

    const setupIntent = await getStripe().setupIntents.create(
      {
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        usage: 'off_session',
        metadata: {
          userId: String(req.user.id),
          studioId: String(studio.id),
          source: 'account_settings',
        },
      },
      {
        stripeAccount: studio.stripeConnectAccountId,
      },
    );

    return res.status(201).json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      connectedAccountId: studio.stripeConnectAccountId,
      studioId: studio.id,
    });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/payments/saved-card
router.delete('/saved-card', requireAuth, async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        stripePaymentMethodId: null,
        stripePaymentMethodBrand: null,
        stripePaymentMethodLast4: null,
        stripePaymentMethodExpMonth: null,
        stripePaymentMethodExpYear: null,
        stripePaymentMethodSavedAt: null,
        stripePaymentMethodStudioId: null,
      },
    });
    return res.json({ message: 'Saved card removed.' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/payments/refunds
// Admin-initiated refund for a booking. Owners can refund their own studio bookings.
router.post('/refunds', requireAuth, requireRole('ADMIN', 'OWNER'), async (req, res, next) => {
  try {
    const { bookingId, reason = 'requested_by_customer' } = z.object({
      bookingId: z.number().int().positive(),
      reason: z.string().optional(),
    }).parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { studio: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    if (req.user.role === 'OWNER' && booking.studio.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (!booking.stripePaymentIntentId) {
      return res.status(400).json({ error: 'No payment found for this booking.' });
    }

    const refund = await getStripe().refunds.create(
      {
        payment_intent: booking.stripePaymentIntentId,
        reason,
        reverse_transfer: true,
        refund_application_fee: true,
      },
      { stripeAccount: booking.studio.stripeConnectAccountId },
    );

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      }),
      prisma.transaction.updateMany({
        where: { stripePaymentIntentId: booking.stripePaymentIntentId },
        data: { status: 'REFUNDED', stripeRefundId: refund.id },
      }),
    ]);

    try {
      const bookingWithUser = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: { select: { name: true, email: true } },
          studio: { select: { id: true, name: true } },
        },
      });
      if (bookingWithUser?.user?.email) {
        await emailService.sendBookingCancellation({
          to: bookingWithUser.user.email,
          customerName: bookingWithUser.user.name,
          studioName: bookingWithUser.studio.name,
          bookingId: bookingId,
          actorUserId: req.user.id,
          studioId: bookingWithUser.studio.id,
        });
      }
    } catch (emailErr) {
      console.error('[payments] booking cancellation email failed:', emailErr.message);
    }

    return res.json({ refundId: refund.id, status: refund.status });
  } catch (err) {
    return next(err);
  }
});


// POST /api/payments/deposit/:bookingId
router.post('/deposit/:bookingId', requireAuth, async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (Number.isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking id.' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { studio: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
    if (booking.depositAmount == null) {
      return res.status(400).json({ error: 'This booking does not require a deposit.' });
    }
    if (booking.depositPaid) {
      return res.status(400).json({ error: 'Deposit already paid.' });
    }
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ error: 'Booking is not in a payable state.' });
    }

    const { studio } = booking;
    if (!studio.stripeConnectAccountId || studio.stripeConnectStatus !== 'ACTIVE') {
      return res.status(400).json({ error: 'This studio is not yet set up to accept payments.' });
    }

    const amountCents = Math.round(booking.depositAmount * 100);
    const platformFeeCents = calculateApplicationFee(amountCents);

    const userRecord = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, name: true,
        stripeCustomerId: true, stripePaymentMethodStudioId: true,
      },
    });
    const reusableCustomerId =
      booking.stripeCustomerId
        || (userRecord?.stripePaymentMethodStudioId === studio.id ? userRecord.stripeCustomerId : null);
    const customerId = await ensureStripeCustomer({
      user: userRecord || req.user,
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
          userId: String(req.user.id),
          type: 'deposit',
          paymentType: 'deposit',
        },
        automatic_payment_methods: { enabled: true },
      },
      {
        stripeAccount: studio.stripeConnectAccountId,
        idempotencyKey: `booking-deposit-${booking.id}`,
      },
    );

    const bookingUpdates = { stripeCustomerId: customerId };
    if (!booking.stripePaymentIntentId) {
      bookingUpdates.stripePaymentIntentId = paymentIntent.id;
    }
    await prisma.booking.update({
      where: { id: bookingId },
      data: bookingUpdates,
    });

    await prisma.transaction.upsert({
      where: { stripePaymentIntentId: paymentIntent.id },
      update: {
        amount: booking.depositAmount,
        platformFee: platformFeeCents / 100,
        netAmount: booking.depositAmount - platformFeeCents / 100,
        status: 'PENDING',
        paymentType: 'DEPOSIT',
      },
      create: {
        bookingId: booking.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: booking.depositAmount,
        platformFee: platformFeeCents / 100,
        netAmount: booking.depositAmount - platformFeeCents / 100,
        studioId: studio.id,
        userId: req.user.id,
        status: 'PENDING',
        paymentType: 'DEPOSIT',
      },
    });

    return res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      connectedAccountId: studio.stripeConnectAccountId,
      amountCents,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/payments/final/:bookingId
router.post('/final/:bookingId', requireAuth, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (Number.isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking id.' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { studio: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (req.user.role === 'OWNER' && booking.studio.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (!booking.depositPaid) {
      return res.status(400).json({ error: 'Deposit must be paid first.' });
    }
    if (!['CONFIRMED', 'AWAITING_FINAL_PAYMENT'].includes(booking.status)) {
      return res.status(400).json({ error: 'Booking must be confirmed before requesting final payment.' });
    }
    if (booking.finalPaymentPaid) {
      return res.status(400).json({ error: 'Final payment already paid.' });
    }

    const { studio } = booking;
    if (!studio.stripeConnectAccountId || studio.stripeConnectStatus !== 'ACTIVE') {
      return res.status(400).json({ error: 'This studio is not yet set up to accept payments.' });
    }

    const remaining = Math.round((booking.total - (booking.depositAmount || 0)) * 100);
    if (remaining <= 0) {
      return res.status(400).json({ error: 'No remaining balance.' });
    }

    const platformFeeCents = calculateApplicationFee(remaining);

    const bookingUser = await prisma.user.findUnique({
      where: { id: booking.userId },
      select: {
        id: true, email: true, name: true,
        stripeCustomerId: true, stripePaymentMethodStudioId: true,
      },
    });
    const reusableCustomerId =
      booking.stripeCustomerId
        || (bookingUser?.stripePaymentMethodStudioId === studio.id ? bookingUser.stripeCustomerId : null);
    const customerId = await ensureStripeCustomer({
      user: bookingUser || { id: booking.userId },
      connectedAccountId: studio.stripeConnectAccountId,
      existingCustomerId: reusableCustomerId,
    });

    const paymentIntent = await getStripe().paymentIntents.create(
      {
        amount: remaining,
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
      },
    );

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          finalPaymentIntentId: paymentIntent.id,
          status: 'AWAITING_FINAL_PAYMENT',
          stripeCustomerId: customerId,
        },
      }),
      prisma.transaction.upsert({
        where: { stripePaymentIntentId: paymentIntent.id },
        update: {
          amount: remaining / 100,
          platformFee: platformFeeCents / 100,
          netAmount: (remaining - platformFeeCents) / 100,
          status: 'PENDING',
          paymentType: 'FINAL',
        },
        create: {
          bookingId: booking.id,
          stripePaymentIntentId: paymentIntent.id,
          amount: remaining / 100,
          platformFee: platformFeeCents / 100,
          netAmount: (remaining - platformFeeCents) / 100,
          studioId: studio.id,
          userId: booking.userId,
          status: 'PENDING',
          paymentType: 'FINAL',
        },
      }),
    ]);

    return res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      connectedAccountId: studio.stripeConnectAccountId,
      amountCents: remaining,
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/payments/final/:bookingId/client-secret
// Allows the booking client to complete a requested final payment.
router.get('/final/:bookingId/client-secret', requireAuth, async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (Number.isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking id.' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { studio: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
    if (!booking.finalPaymentIntentId) {
      return res.status(400).json({ error: 'Final payment has not been requested yet.' });
    }
    if (booking.finalPaymentPaid) {
      return res.status(400).json({ error: 'Final payment already completed.' });
    }
    if (!booking.studio.stripeConnectAccountId) {
      return res.status(400).json({ error: 'Studio payment account is not configured.' });
    }

    const paymentIntent = await getStripe().paymentIntents.retrieve(
      booking.finalPaymentIntentId,
      { stripeAccount: booking.studio.stripeConnectAccountId },
    );

    if (!paymentIntent.client_secret) {
      return res.status(400).json({ error: 'Final payment is not available for confirmation.' });
    }

    return res.json({
      clientSecret: paymentIntent.client_secret,
      connectedAccountId: booking.studio.stripeConnectAccountId,
      amountCents: paymentIntent.amount,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
