'use strict';

const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// ─── Validation schemas ──────────────────────────────────────────────────────

const createWebsiteSchema = z.object({
  studioId: z.number().int().positive('Invalid studio ID'),
  subdomain: z.string().min(1).max(63).regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/, 'Invalid subdomain'),
});

const updateSettingsSchema = z.object({
  globalSettings: z.any().optional().nullable(),
  customDomain: z.string().max(255).optional().nullable(),
  domainStatus: z.string().optional().nullable(),
  dnsConfigured: z.boolean().optional(),
});

const pageSchema = z.object({
  slug: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  isHome: z.boolean().optional().default(false),
  isPublished: z.boolean().optional().default(false),
  navLabel: z.string().max(255).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
});

const sectionSchema = z.object({
  type: z.string().min(1).max(100),
  sortOrder: z.number().int().optional().default(0),
  isHidden: z.boolean().optional().default(false),
  data: z.any().optional().nullable(),
});

const reorderPagesSchema = z.object({
  pageIds: z.array(z.number().int()).min(1),
});

const saveSectionsSchema = z.object({
  sections: z.array(sectionSchema),
});

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

// ─── GET /api/website/:studioId ──────────────────────────────────────────

router.get('/:studioId', requireAuth, async (req, res, next) => {
  try {
    const studioId = parseInt(req.params.studioId);

    const hasAccess = await verifyStudioAccess(req.user.id, studioId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    let website = await prisma.website.findFirst({
      where: { studioId: studioId },
      include: {
        pages: {
          include: { sections: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!website) {
      const studio = await prisma.studio.findUnique({
        where: { id: studioId },
        select: { slug: true }
      });

      if (!studio) {
        return res.status(404).json({ error: 'Studio not found.' });
      }

      website = await prisma.website.create({
        data: {
          studioId: studioId,
          subdomain: studio.slug
        },
        include: {
          pages: {
            include: { sections: true },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });
    }

    return res.json(website);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/website ───────────────────────────────────────────────────

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = createWebsiteSchema.parse(req.body);

    const hasAccess = await verifyStudioAccess(req.user.id, data.studioId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const existing = await prisma.website.findFirst({
      where: { studioId: data.studioId }
    });

    if (existing) {
      return res.status(409).json({ error: 'Website already exists for this studio.' });
    }

    const website = await prisma.website.create({
      data: {
        studioId: data.studioId,
        subdomain: data.subdomain
      },
      include: {
        pages: {
          include: { sections: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    return res.status(201).json(website);
  } catch (err) {
    return next(err);
  }
});

// ─── PATCH /api/website/:websiteId/settings ──────────────────────────────

router.patch('/:websiteId/settings', requireAuth, async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.websiteId);
    const data = updateSettingsSchema.parse(req.body);

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

    const updated = await prisma.website.update({
      where: { id: websiteId },
      data: data,
      include: {
        pages: {
          include: { sections: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/website/:websiteId/pages ────────────────────────────────────

router.get('/:websiteId/pages', requireAuth, async (req, res, next) => {
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

    const pages = await prisma.websitePage.findMany({
      where: { websiteId: websiteId },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' }
    });

    return res.json(pages);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/website/:websiteId/pages ───────────────────────────────────

router.post('/:websiteId/pages', requireAuth, async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.websiteId);
    const data = pageSchema.parse(req.body);

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

    const existing = await prisma.websitePage.findFirst({
      where: { websiteId: websiteId, slug: data.slug }
    });

    if (existing) {
      return res.status(409).json({ error: 'Page with this slug already exists.' });
    }

    const page = await prisma.websitePage.create({
      data: {
        websiteId: websiteId,
        ...data
      },
      include: { sections: true }
    });

    return res.status(201).json(page);
  } catch (err) {
    return next(err);
  }
});

// ─── PATCH /api/website/pages/:pageId ────────────────────────────────────

router.patch('/pages/:pageId', requireAuth, async (req, res, next) => {
  try {
    const pageId = parseInt(req.params.pageId);
    const data = pageSchema.partial().parse(req.body);

    const page = await prisma.websitePage.findUnique({
      where: { id: pageId },
      include: { website: true }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found.' });
    }

    const hasAccess = await verifyStudioAccess(req.user.id, page.website.studioId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const updated = await prisma.websitePage.update({
      where: { id: pageId },
      data: data,
      include: { sections: { orderBy: { sortOrder: 'asc' } } }
    });

    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

// ─── DELETE /api/website/pages/:pageId ───────────────────────────────────

router.delete('/pages/:pageId', requireAuth, async (req, res, next) => {
  try {
    const pageId = parseInt(req.params.pageId);

    const page = await prisma.websitePage.findUnique({
      where: { id: pageId },
      include: { website: true }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found.' });
    }

    const hasAccess = await verifyStudioAccess(req.user.id, page.website.studioId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await prisma.websitePage.delete({
      where: { id: pageId }
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

// ─── PATCH /api/website/:websiteId/pages/order ────────────────────────────

router.patch('/:websiteId/pages/order', requireAuth, async (req, res, next) => {
  try {
    const websiteId = parseInt(req.params.websiteId);
    const data = reorderPagesSchema.parse(req.body);

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

    // Update sortOrder for each page
    for (let i = 0; i < data.pageIds.length; i++) {
      await prisma.websitePage.update({
        where: { id: data.pageIds[i] },
        data: { sortOrder: i }
      });
    }

    const pages = await prisma.websitePage.findMany({
      where: { websiteId: websiteId },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' }
    });

    return res.json(pages);
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/website/pages/:pageId/sections ──────────────────────────────

router.get('/pages/:pageId/sections', requireAuth, async (req, res, next) => {
  try {
    const pageId = parseInt(req.params.pageId);

    const page = await prisma.websitePage.findUnique({
      where: { id: pageId },
      include: { website: true }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found.' });
    }

    const hasAccess = await verifyStudioAccess(req.user.id, page.website.studioId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const sections = await prisma.websiteSection.findMany({
      where: { pageId: pageId },
      orderBy: { sortOrder: 'asc' }
    });

    return res.json(sections);
  } catch (err) {
    return next(err);
  }
});

// ─── PUT /api/website/pages/:pageId/sections ──────────────────────────────

router.put('/pages/:pageId/sections', requireAuth, async (req, res, next) => {
  try {
    const pageId = parseInt(req.params.pageId);
    const data = saveSectionsSchema.parse(req.body);

    const page = await prisma.websitePage.findUnique({
      where: { id: pageId },
      include: { website: true }
    });

    if (!page) {
      return res.status(404).json({ error: 'Page not found.' });
    }

    const hasAccess = await verifyStudioAccess(req.user.id, page.website.studioId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Delete existing sections
    await prisma.websiteSection.deleteMany({
      where: { pageId: pageId }
    });

    // Create new sections
    const sections = await Promise.all(
      data.sections.map((section, index) =>
        prisma.websiteSection.create({
          data: {
            pageId: pageId,
            type: section.type,
            sortOrder: index,
            isHidden: section.isHidden || false,
            data: section.data || null
          }
        })
      )
    );

    return res.json(sections);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
