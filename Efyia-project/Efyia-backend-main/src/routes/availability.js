'use strict';

const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { checkAvailability } = require('../lib/availability');

const router = express.Router();

const scheduleSchema = z.array(z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string(),
  closeTime: z.string(),
  isOpen: z.boolean(),
}));

const blockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().optional(),
});

function parseStudioId(value) {
  const studioId = parseInt(value, 10);
  if (Number.isNaN(studioId)) return null;
  return studioId;
}

async function ensureStudioOwnerOrAdmin(studioId, user) {
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) {
    const err = new Error('Studio not found.');
    err.status = 404;
    throw err;
  }

  if (user.role !== 'ADMIN' && studio.ownerId !== user.id) {
    const err = new Error('Access denied.');
    err.status = 403;
    throw err;
  }

  return studio;
}

function defaultSchedule() {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    openTime: '09:00',
    closeTime: '22:00',
    isOpen: dayOfWeek !== 0,
  }));
}

router.get('/:studioId/schedule', async (req, res, next) => {
  try {
    const studioId = parseStudioId(req.params.studioId);
    if (!studioId) {
      return res.status(404).json({ error: 'Studio not found.' });
    }

    const schedules = await prisma.studioSchedule.findMany({
      where: { studioId },
      orderBy: { dayOfWeek: 'asc' },
    });

    if (!schedules.length) {
      return res.json(defaultSchedule());
    }

    return res.json(schedules);
  } catch (err) {
    return next(err);
  }
});

router.post('/:studioId/schedule', requireAuth, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const studioId = parseStudioId(req.params.studioId);
    if (!studioId) {
      return res.status(404).json({ error: 'Studio not found.' });
    }

    await ensureStudioOwnerOrAdmin(studioId, req.user);

    const payload = scheduleSchema.parse(req.body);

    for (const item of payload) {
      await prisma.studioSchedule.upsert({
        where: {
          studioId_dayOfWeek: {
            studioId,
            dayOfWeek: item.dayOfWeek,
          },
        },
        create: {
          studioId,
          dayOfWeek: item.dayOfWeek,
          openTime: item.openTime,
          closeTime: item.closeTime,
          isOpen: item.isOpen,
        },
        update: {
          openTime: item.openTime,
          closeTime: item.closeTime,
          isOpen: item.isOpen,
        },
      });
    }

    const updated = await prisma.studioSchedule.findMany({
      where: { studioId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

router.get('/:studioId/blocks', async (req, res, next) => {
  try {
    const studioId = parseStudioId(req.params.studioId);
    if (!studioId) {
      return res.status(404).json({ error: 'Studio not found.' });
    }

    const where = { studioId };
    if (req.query.from || req.query.to) {
      where.date = {};
      if (req.query.from) where.date.gte = String(req.query.from);
      if (req.query.to) where.date.lte = String(req.query.to);
    }

    const blocks = await prisma.availabilityBlock.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return res.json(blocks);
  } catch (err) {
    return next(err);
  }
});

router.post('/:studioId/blocks', requireAuth, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const studioId = parseStudioId(req.params.studioId);
    if (!studioId) {
      return res.status(404).json({ error: 'Studio not found.' });
    }

    await ensureStudioOwnerOrAdmin(studioId, req.user);

    const payload = blockSchema.parse(req.body);

    const blockDate = new Date(payload.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (blockDate < today) {
      return res.status(400).json({ error: 'Block date cannot be in the past.' });
    }

    const block = await prisma.availabilityBlock.create({
      data: {
        studioId,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        reason: payload.reason,
      },
    });

    return res.status(201).json(block);
  } catch (err) {
    return next(err);
  }
});

router.delete('/:studioId/blocks/:blockId', requireAuth, requireRole('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const studioId = parseStudioId(req.params.studioId);
    const blockId = parseInt(req.params.blockId, 10);
    if (!studioId || Number.isNaN(blockId)) {
      return res.status(404).json({ error: 'Not found.' });
    }

    await ensureStudioOwnerOrAdmin(studioId, req.user);

    const block = await prisma.availabilityBlock.findUnique({ where: { id: blockId } });
    if (!block || block.studioId !== studioId) {
      return res.status(404).json({ error: 'Block not found.' });
    }

    await prisma.availabilityBlock.delete({ where: { id: blockId } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.get('/:studioId/check', async (req, res, next) => {
  try {
    const studioId = parseStudioId(req.params.studioId);
    if (!studioId) {
      return res.status(404).json({ error: 'Studio not found.' });
    }

    const query = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().min(1),
      hours: z.coerce.number().int().min(1).max(12),
    }).parse(req.query);

    const result = await checkAvailability(prisma, studioId, query.date, query.time, query.hours);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
