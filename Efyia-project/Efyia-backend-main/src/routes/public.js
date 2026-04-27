'use strict';

const { Router } = require('express');
const prisma = require('../lib/prisma');
const { toPublicStudio } = require('../lib/location');

const router = Router();

// GET /api/public/studios/:slug  — no auth required, returns full public profile
router.get('/studios/:slug', async (req, res, next) => {
  try {
    const studio = await prisma.studio.findUnique({
      where: { slug: req.params.slug },
      include: {
        owner: { select: { id: true, name: true } },
        reviews: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!studio) {
      return res.status(404).json({ error: 'Studio not found.' });
    }

    res.json(toPublicStudio(studio));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
