'use strict';

const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const createReviewSchema = z.object({
  studioId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(10, 'Review must be at least 10 characters.').max(1000),
});

const ownerReplySchema = z.object({
  ownerReply: z.string().min(1).max(500),
});

// GET /api/reviews?studioId=...
router.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.studioId) {
      where.studioId = parseInt(req.query.studioId, 10);
    }

    const reviews = await prisma.review.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(reviews);
  } catch (err) {
    return next(err);
  }
});

// POST /api/reviews — must be a completed booking client
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = createReviewSchema.parse(req.body);

    const studio = await prisma.studio.findUnique({ where: { id: data.studioId } });
    if (!studio) return res.status(404).json({ error: 'Studio not found.' });

    // Studio owners cannot review their own studio
    if (studio.ownerId === req.user.id) {
      return res.status(403).json({ error: 'Studio owners cannot review their own studio.' });
    }

    // Must have a completed booking to leave a review
    const completedBooking = await prisma.booking.findFirst({
      where: {
        studioId: data.studioId,
        userId: req.user.id,
        status: 'COMPLETED',
      },
    });

    if (!completedBooking) {
      return res.status(403).json({ error: 'You can only review a studio after a completed booking.' });
    }

    const review = await prisma.review.create({
      data: {
        studioId: data.studioId,
        userId: req.user.id,
        rating: data.rating,
        content: data.content,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Recalculate studio rating
    const stats = await prisma.review.aggregate({
      where: { studioId: data.studioId },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.studio.update({
      where: { id: data.studioId },
      data: {
        rating: Math.round((stats._avg.rating || 0) * 10) / 10,
        reviewCount: stats._count,
      },
    });

    return res.status(201).json(review);
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/reviews/:id/reply — studio owner only
router.patch('/:id/reply', requireAuth, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid review id.' });

    const { ownerReply } = ownerReplySchema.parse(req.body);

    const review = await prisma.review.findUnique({
      where: { id },
      include: { studio: true },
    });
    if (!review) return res.status(404).json({ error: 'Review not found.' });

    if (req.user.role === 'OWNER' && review.studio.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only reply to reviews for your own studio.' });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { ownerReply },
      include: { user: { select: { id: true, name: true } } },
    });

    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/reviews/:id — admin only
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid review id.' });

    await prisma.review.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
