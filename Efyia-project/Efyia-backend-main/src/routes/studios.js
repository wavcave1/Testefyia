'use strict';

const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { mapStudioLocationInput, toPublicStudio } = require('../lib/location');

const router = express.Router();

const studioSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(20).max(2000),
  address: z.string().min(5).max(200),
  addressLine1: z.string().min(3).max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(50),
  zip: z.string().min(3).max(20),
  postalCode: z.string().min(3).max(20).optional().nullable(),
  country: z.string().min(2).max(100).optional().nullable(),
  publicLocationLabel: z.string().min(2).max(120).optional().nullable(),
  arrivalInstructions: z.string().max(1000).optional().nullable(),
  pricePerHour: z.number().positive().max(10000),
  lat: z.number().optional(),
  lng: z.number().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  tags: z.array(z.string()).max(10).default([]),
  amenities: z.array(z.string()).max(20).default([]),
  equipment: z.array(z.string()).max(30).default([]),
  sessionTypes: z.array(z.string()).max(10).default([]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#62f3d4'),
});

// GET /api/studios
router.get('/', async (req, res, next) => {
  try {
    const { q, city, maxPrice, minRating, featured, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (q) {
      const term = q.toLowerCase();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { publicLocationLabel: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { state: { contains: term, mode: 'insensitive' } },
        { zip: { contains: term } },
        { postalCode: { contains: term } },
        { country: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (maxPrice) {
      where.pricePerHour = { lte: parseFloat(maxPrice) };
    }

    if (minRating) {
      where.rating = { gte: parseFloat(minRating) };
    }

    if (featured === 'true') {
      where.featured = true;
    }

    const [studios, total] = await Promise.all([
      prisma.studio.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [{ featured: 'desc' }, { rating: 'desc' }],
        include: { owner: { select: { id: true, name: true } } },
      }),
      prisma.studio.count({ where }),
    ]);

    return res.json({
      studios: studios.map(toPublicStudio),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/studios/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid studio id.' });

    const studio = await prisma.studio.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        reviews: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!studio) return res.status(404).json({ error: 'Studio not found.' });
    return res.json(toPublicStudio(studio));
  } catch (err) {
    return next(err);
  }
});

// GET /api/studios/slug/:slug
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const studio = await prisma.studio.findUnique({
      where: { slug: req.params.slug },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        reviews: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!studio) return res.status(404).json({ error: 'Studio not found.' });
    return res.json(toPublicStudio(studio));
  } catch (err) {
    return next(err);
  }
});

// POST /api/studios — owner or admin only
router.post('/', requireAuth, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const data = mapStudioLocationInput(studioSchema.parse(req.body));

    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Ensure slug uniqueness
    const existing = await prisma.studio.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    const studio = await prisma.studio.create({
      data: { ...data, slug: finalSlug, ownerId: req.user.id },
    });

    return res.status(201).json(studio);
  } catch (err) {
    return next(err);
  }
});

// PUT /api/studios/:id — owner (their own studio) or admin
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid studio id.' });

    const studio = await prisma.studio.findUnique({ where: { id } });
    if (!studio) return res.status(404).json({ error: 'Studio not found.' });

    if (req.user.role !== 'ADMIN' && studio.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own studio.' });
    }

    const data = mapStudioLocationInput(studioSchema.partial().parse(req.body));
    const updated = await prisma.studio.update({ where: { id }, data });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/studios/:id — admin only
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid studio id.' });

    await prisma.studio.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
