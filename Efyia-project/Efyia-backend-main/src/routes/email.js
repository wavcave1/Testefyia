'use strict';

const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { EmailService } = require('../services/email/emailService');
const { DomainService } = require('../services/domain/domainService');
const { AliasService } = require('../services/email/aliasService');
const { EmailSetupService } = require('../services/email/emailSetupService');
const { serializeEmailDomain } = require('../services/domain/domainResponseSerializer');

const router = express.Router();
const emailService = new EmailService();
const domainService = new DomainService();
const aliasService = new AliasService();
const emailSetupService = new EmailSetupService();

const domainSchema = z.object({
  studioId: z.number().int().positive(),
  domain: z.string().min(3).max(255).toLowerCase().regex(/^[a-z0-9.-]+$/),
  sourceType: z.enum(['EXTERNAL_CONNECTED', 'EFYIA_REGISTERED']).optional().default('EXTERNAL_CONNECTED'),
  providerType: z.enum(['MANUAL', 'RESELLER', 'CLOUDFLARE', 'OTHER']).optional().default('MANUAL'),
});

const aliasSchema = z.object({
  localPart: z.string().min(1).max(64).regex(/^[a-z0-9._-]+$/),
  forwardTo: z.string().email(),
});


const idParamSchema = z.coerce.number().int().positive();

function parseIdParam(value, label) {
  return idParamSchema.parse(value, {
    errorMap: () => ({ message: `${label} must be a positive integer.` }),
  });
}

const sendSchema = z.object({
  type: z.enum([
    'profile_approved',
    'stripe_onboarding_reminder',
    'booking_confirmation',
    'booking_cancellation',
    'password_reset',
    'payment_receipt',
  ]),
  to: z.string().email(),
  name: z.string().optional(),
  studioName: z.string().optional(),
  bookingId: z.number().int().positive().optional(),
  amount: z.number().positive().optional(),
  onboardingUrl: z.string().url().optional(),
  resetToken: z.string().optional(),
  studioId: z.number().int().positive().optional(),
});

router.use(requireAuth);

router.get('/domains', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const where = req.user.role === 'OWNER' ? { studio: { ownerId: req.user.id } } : {};
    const domains = await prisma.emailDomain.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ domains: domains.map(serializeEmailDomain) });
  } catch (err) {
    return next(err);
  }
});

router.get('/domains/:domainId', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const domainId = parseIdParam(req.params.domainId, 'domainId');
    const domain = await domainService.getDomainForUser(domainId, req.user);
    return res.json({ domain: serializeEmailDomain(domain) });
  } catch (err) {
    return next(err);
  }
});

router.post('/domains', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const data = domainSchema.parse(req.body);
    const domainRecord = await domainService.createDomainRecord({ user: req.user, ...data });
    const domain = data.sourceType === 'EXTERNAL_CONNECTED'
      ? await emailSetupService.connectProviderDomain(domainRecord)
      : domainRecord;

    const serializedDomain = serializeEmailDomain(domain);

    return res.status(201).json({
      domain: serializedDomain,
      setup_steps: ['Add all required DNS records', 'Wait for DNS propagation', 'Refresh verification status'],
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/domains/:domainId/dns-records', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const domainId = parseIdParam(req.params.domainId, 'domainId');
    const domain = await domainService.getDomainForUser(domainId, req.user);
    const serializedDomain = serializeEmailDomain(domain);

    return res.json({
      domain: serializedDomain.domain,
      domainRecord: serializedDomain,
      setupStatus: serializedDomain.setupStatus,
      domainStatus: serializedDomain.domainStatus,
      verificationStatus: serializedDomain.verificationStatus,
      dnsStatus: serializedDomain.dnsStatus,
      emailEligibilityStatus: serializedDomain.emailEligibilityStatus,
      aliasEligibilityStatus: serializedDomain.aliasEligibilityStatus,
      canManageDns: serializedDomain.canManageDns,
      canCreateAliases: serializedDomain.canCreateAliases,
      requiresExternalDnsAction: serializedDomain.requiresExternalDnsAction,
      requiredDnsRecords: domain.requiredDns || [],
      setup_steps: ['Add all required DNS records', 'Wait for DNS propagation', 'Refresh verification status'],
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/domains/:domainId/verify', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const domainId = parseIdParam(req.params.domainId, 'domainId');
    const domain = await domainService.getDomainForUser(domainId, req.user);
    const updated = await emailSetupService.refreshEmailSetupStatus(domain);
    return res.json({
      domain: serializeEmailDomain(updated),
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/domains/:domainId/aliases', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const domainId = parseIdParam(req.params.domainId, 'domainId');
    const domain = await domainService.getDomainForUser(domainId, req.user);

    const aliases = await prisma.emailAlias.findMany({ where: { domainId }, orderBy: { createdAt: 'desc' } });
    return res.json({ domain: domain.domain, aliases });
  } catch (err) {
    return next(err);
  }
});

router.post('/domains/:domainId/aliases', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const domainId = parseIdParam(req.params.domainId, 'domainId');
    const data = aliasSchema.parse(req.body);
    const alias = await aliasService.createAlias({ domainId, ...data, user: req.user });
    return res.status(201).json({ alias });
  } catch (err) {
    return next(err);
  }
});

router.patch('/aliases/:aliasId', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const aliasId = parseIdParam(req.params.aliasId, 'aliasId');
    const data = z.object({ forwardTo: z.string().email().optional(), enabled: z.boolean().optional() }).parse(req.body);
    const alias = await aliasService.updateAlias({ aliasId, ...data, user: req.user });
    return res.json({ alias });
  } catch (err) {
    return next(err);
  }
});

router.patch('/aliases/:aliasId/toggle', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const aliasId = parseIdParam(req.params.aliasId, 'aliasId');
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    const alias = await aliasService.updateAlias({ aliasId, enabled, user: req.user });
    return res.json({ alias });
  } catch (err) {
    return next(err);
  }
});

router.delete('/aliases/:aliasId', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const aliasId = parseIdParam(req.params.aliasId, 'aliasId');
    const result = await aliasService.deleteAlias({ aliasId, user: req.user });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.get('/events', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const studioId = req.query.studioId ? parseIdParam(req.query.studioId, 'studioId') : null;
    const where = {};

    if (req.user.role === 'OWNER') {
      const ownedStudios = await prisma.studio.findMany({ where: { ownerId: req.user.id }, select: { id: true } });
      where.OR = [{ studioId: { in: ownedStudios.map((s) => s.id) } }, { domain: { studioId: { in: ownedStudios.map((s) => s.id) } } }];
    }

    if (studioId) where.studioId = studioId;

    const events = await prisma.emailEvent.findMany({
      where,
      include: {
        domain: { select: { id: true, domain: true, studioId: true } },
        alias: { select: { id: true, fullEmail: true, forwardTo: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return res.json({ events });
  } catch (err) {
    return next(err);
  }
});

router.post('/transactional/send', requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const data = sendSchema.parse(req.body);
    let result;

    switch (data.type) {
      case 'profile_approved':
        result = await emailService.sendProfileApprovedEmail({ to: data.to, ownerName: data.name || 'there', studioName: data.studioName || 'your studio', actorUserId: req.user.id, studioId: data.studioId });
        break;
      case 'stripe_onboarding_reminder':
        result = await emailService.sendStripeOnboardingReminder({ to: data.to, ownerName: data.name || 'there', studioName: data.studioName || 'your studio', onboardingUrl: data.onboardingUrl || process.env.APP_BASE_URL || 'https://efyiabook.com', actorUserId: req.user.id, studioId: data.studioId });
        break;
      case 'booking_confirmation':
        result = await emailService.sendBookingConfirmation({ to: data.to, customerName: data.name || 'there', studioName: data.studioName || 'your studio', bookingId: data.bookingId || 0, actorUserId: req.user.id, studioId: data.studioId });
        break;
      case 'booking_cancellation':
        result = await emailService.sendBookingCancellation({ to: data.to, customerName: data.name || 'there', studioName: data.studioName || 'your studio', bookingId: data.bookingId || 0, actorUserId: req.user.id, studioId: data.studioId });
        break;
      case 'password_reset':
        result = await emailService.sendPasswordReset({ to: data.to, userName: data.name || 'there', resetToken: data.resetToken || 'reset-token', actorUserId: req.user.id });
        break;
      case 'payment_receipt':
        result = await emailService.sendPaymentReceipt({ to: data.to, customerName: data.name || 'there', bookingId: data.bookingId || 0, amount: data.amount || 0, actorUserId: req.user.id, studioId: data.studioId });
        break;
      default:
        return res.status(400).json({ error: 'Unsupported transactional email type.' });
    }

    return res.status(202).json({
      message: 'Transactional email queued.',
      ...result,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
