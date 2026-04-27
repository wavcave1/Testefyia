'use strict';

const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { toPublicStudio } = require('../lib/location');

const router = express.Router();

// GET /api/favorites — current user's favorites
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: {
        studio: {
          include: { owner: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(favorites.map((f) => toPublicStudio(f.studio)));
  } catch (err) {
    return next(err);
  }
});

// POST /api/favorites
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { studioId } = z.object({ studioId: z.number().int().positive() }).parse(req.body);

    const studio = await prisma.studio.findUnique({ where: { id: studioId } });
    if (!studio) return res.status(404).json({ error: 'Studio not found.' });

    const favorite = await prisma.favorite.upsert({
      where: { userId_studioId: { userId: req.user.id, studioId } },
      create: { userId: req.user.id, studioId },
      update: {},
    });

    return res.status(201).json(favorite);
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/favorites/:studioId
router.delete('/:studioId', requireAuth, async (req, res, next) => {
  try {
    const studioId = parseInt(req.params.studioId, 10);
    if (isNaN(studioId)) return res.status(400).json({ error: 'Invalid studio id.' });

    await prisma.favorite.deleteMany({
      where: { userId: req.user.id, studioId },
    });

    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
