'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/transactions
// CLIENT sees own transactions; OWNER sees transactions for their studios; ADMIN sees all.
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
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        booking: { select: { id: true, date: true, sessionType: true, hours: true } },
        studio: { select: { id: true, name: true, city: true, state: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(transactions);
  } catch (err) {
    return next(err);
  }
});

// GET /api/transactions/summary/by-studio
// Aggregated revenue breakdown per studio (OWNER and ADMIN only).
router.get('/summary/by-studio', requireAuth, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    let studioFilter = {};
    if (req.user.role === 'OWNER') {
      const ownedStudios = await prisma.studio.findMany({
        where: { ownerId: req.user.id },
        select: { id: true },
      });
      studioFilter = { studioId: { in: ownedStudios.map((s) => s.id) } };
    }

    const summary = await prisma.transaction.groupBy({
      by: ['studioId', 'status'],
      where: studioFilter,
      _sum: { amount: true, platformFee: true, netAmount: true },
      _count: { id: true },
    });

    const studioIds = [...new Set(summary.map((row) => row.studioId))];
    const studios = await prisma.studio.findMany({
      where: { id: { in: studioIds } },
      select: { id: true, name: true, city: true, state: true },
    });
    const studioMap = Object.fromEntries(studios.map((s) => [s.id, s]));

    return res.json(
      summary.map((row) => ({
        studio: studioMap[row.studioId],
        status: row.status,
        count: row._count.id,
        totalAmount: row._sum.amount,
        totalPlatformFee: row._sum.platformFee,
        totalNetAmount: row._sum.netAmount,
      })),
    );
  } catch (err) {
    return next(err);
  }
});

// GET /api/transactions/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid transaction id.' });

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        booking: true,
        studio: { select: { id: true, name: true, city: true, state: true, ownerId: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found.' });

    if (req.user.role === 'CLIENT' && transaction.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user.role === 'OWNER' && transaction.studio.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    return res.json(transaction);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
