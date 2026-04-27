'use strict';

const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// ─── Helper: verify studio access ─────────────────────────────────────────

async function verifyStudioAccess(userId, studioId) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId }
  });

  if (!studio) return false;
  if (studio.ownerId === userId) return true;

  const member = await prisma.studioMember.findFirst({
    where: {
      studioId: studioId,
      userId: userId,
      inviteStatus: 'ACCEPTED'
    }
  });

  return !!member;
}

// GET /api/domains/search?query=
router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const query = req.query.query || '';

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters.' });
    }

    // Stub: return empty results - would integrate with domain registrar API
    return res.json({
      results: [],
      available: false
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/domains/purchase
router.post('/purchase', requireAuth, async (req, res, next) => {
  try {
    const { websiteId, domain } = req.body;

    if (!websiteId || !domain) {
      return res.status(400).json({ error: 'websiteId and domain are required.' });
    }

    const website = await prisma.website.findUnique({
      where: { id: parseInt(websiteId) }
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found.' });
    }

    const hasAccess = await verifyStudioAccess(req.user.id, website.studioId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Stub: would integrate with domain registrar
    const updated = await prisma.website.update({
      where: { id: website.id },
      data: { customDomain: domain }
    });

    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

// GET /api/domains/:websiteId/status
router.get('/:websiteId/status', requireAuth, async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.websiteId);

    const website = await prisma.website.findUnique({
      where: { id: websiteId }
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found.' });
    }

    const hasAccess = await verifyStudioAccess(req.user.id, website.studioId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    return res.json({
      customDomain: website.customDomain,
      domainStatus: website.domainStatus,
      dnsConfigured: website.dnsConfigured
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/domains/:websiteId/verify
router.get('/:websiteId/verify', requireAuth, async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.websiteId);

    const website = await prisma.website.findUnique({
      where: { id: websiteId }
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found.' });
    }

    const hasAccess = await verifyStudioAccess(req.user.id, website.studioId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Stub: would check DNS records
    return res.json({
      verified: website.dnsConfigured || false,
      dnsRecords: []
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
