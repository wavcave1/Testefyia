'use strict';

const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getStripe } = require('../lib/stripe');
const { EmailService } = require('../services/email/emailService');

const router = express.Router();
const emailService = new EmailService();

function buildReturnUrl(studioId, path = 'return') {
  const base = process.env.APP_BASE_URL || process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
  return `${base}/connect/${path}?studioId=${studioId}`;
}

async function generateOnboardingLink(accountId, studioId) {
  return getStripe().accountLinks.create({
    account: accountId,
    refresh_url: buildReturnUrl(studioId, 'refresh'),
    return_url: buildReturnUrl(studioId, 'return'),
    type: 'account_onboarding',
    collect: 'eventually_due',
  });
}

// POST /api/connect/onboard
// Studio owner initiates Stripe Connect Express onboarding.
// Creates a connected account if none exists, then returns an onboarding link URL.
router.post('/onboard', requireAuth, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const { studioId } = z.object({
      studioId: z.number().int().positive(),
    }).parse(req.body);

    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      include: { owner: true },
    });
    if (!studio) return res.status(404).json({ error: 'Studio not found.' });

    if (req.user.role === 'OWNER' && studio.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    let accountId = studio.stripeConnectAccountId;

    if (!accountId) {
      const account = await getStripe().accounts.create({
        type: 'express',
        country: 'US',
        email: studio.owner?.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'company',
        company: { name: studio.name },
        metadata: { studioId: String(studio.id), efyia: 'true' },
      });
      accountId = account.id;
      await prisma.studio.update({
        where: { id: studio.id },
        data: {
          stripeConnectAccountId: accountId,
          stripeConnectStatus: 'PENDING',
          stripeOnboardingStartedAt: new Date(),
        },
      });
    }

    const accountLink = await generateOnboardingLink(accountId, studio.id);

    return res.json({ url: accountLink.url, accountId });
  } catch (err) {
    return next(err);
  }
});

// POST /api/connect/refresh-link
router.post('/refresh-link', requireAuth, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const { studioId } = z.object({ studioId: z.number().int().positive() }).parse(req.body);

    const studio = await prisma.studio.findUnique({ where: { id: studioId } });
    if (!studio?.stripeConnectAccountId) {
      return res.status(404).json({ error: 'No Stripe account found for this studio.' });
    }
    if (req.user.role === 'OWNER' && studio.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const accountLink = await generateOnboardingLink(studio.stripeConnectAccountId, studio.id);

    const owner = await prisma.user.findUnique({
      where: { id: studio.ownerId },
      select: { email: true, name: true },
    });
    if (owner?.email) {
      try {
        await emailService.sendStripeOnboardingReminder({
          to: owner.email,
          ownerName: owner.name,
          studioName: studio.name || 'your studio',
          onboardingUrl: accountLink.url,
          actorUserId: req.user.id,
          studioId: studio.id,
        });
      } catch (err) {
        console.error('[email] stripe reminder email failed:', err.message);
      }
    }
    return res.json({ url: accountLink.url });
  } catch (err) {
    return next(err);
  }
});

// GET /api/connect/status/:studioId
// Returns the Stripe Connect status for a studio.
router.get('/status/:studioId', requireAuth, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const studioId = parseInt(req.params.studioId, 10);
    if (isNaN(studioId)) return res.status(400).json({ error: 'Invalid studioId.' });

    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: {
        id: true,
        name: true,
        stripeConnectAccountId: true,
        stripeConnectStatus: true,
        ownerId: true,
      },
    });
    if (!studio) return res.status(404).json({ error: 'Studio not found.' });

    if (req.user.role === 'OWNER' && studio.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (studio.stripeConnectAccountId) {
      try {
        const account = await getStripe().accounts.retrieve(studio.stripeConnectAccountId);
        const status =
          account.charges_enabled && account.details_submitted
            ? 'ACTIVE'
            : account.details_submitted
              ? 'RESTRICTED'
              : 'PENDING';

        await prisma.studio.update({
          where: { id: studioId },
          data: {
            stripeConnectStatus: status,
            stripeChargesEnabled: account.charges_enabled,
            stripePayoutsEnabled: account.payouts_enabled,
            stripeDetailsSubmitted: account.details_submitted,
            stripeOnboardingComplete: account.charges_enabled && account.details_submitted,
            ...(account.charges_enabled ? { stripeActivatedAt: new Date() } : {}),
          },
        });

        return res.json({
          studioId: studio.id,
          name: studio.name,
          connected: status === 'ACTIVE',
          status,
          stripeAccountId: studio.stripeConnectAccountId,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          requirements: account.requirements,
        });
      } catch (err) {
        // Fall through to existing status if Stripe fetch fails
        console.error('[connect/status] Stripe retrieve failed', err.message);
      }
    }

    return res.json({
      studioId: studio.id,
      name: studio.name,
      connected: studio.stripeConnectStatus === 'ACTIVE',
      status: studio.stripeConnectStatus,
      stripeAccountId: studio.stripeConnectAccountId,
    });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/connect/disconnect/:studioId — admin only
// Unlinks a studio's Stripe Connect account (does not delete the Stripe account itself).
router.delete('/disconnect/:studioId', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const studioId = parseInt(req.params.studioId, 10);
    if (isNaN(studioId)) return res.status(400).json({ error: 'Invalid studioId.' });

    const studio = await prisma.studio.findUnique({ where: { id: studioId } });
    if (!studio) return res.status(404).json({ error: 'Studio not found.' });

    await prisma.studio.update({
      where: { id: studioId },
      data: { stripeConnectAccountId: null, stripeConnectStatus: 'NOT_CONNECTED' },
    });

    return res.json({ message: 'Connect account unlinked.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
