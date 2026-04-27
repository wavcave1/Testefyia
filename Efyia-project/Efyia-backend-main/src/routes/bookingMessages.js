'use strict';

const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

const createMessageSchema = z.object({
  message: z.string().min(1).max(2000),
});

async function getBookingWithAccess(bookingId, user) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { studio: true },
  });

  if (!booking) {
    const err = new Error('Booking not found.');
    err.status = 404;
    throw err;
  }

  if (user.role === 'ADMIN') return booking;

  if (user.role === 'CLIENT' && booking.userId !== user.id) {
    const err = new Error('Access denied.');
    err.status = 403;
    throw err;
  }

  if (user.role === 'OWNER' && booking.studio.ownerId !== user.id) {
    const err = new Error('Access denied.');
    err.status = 403;
    throw err;
  }

  if (!['CLIENT', 'OWNER', 'ADMIN'].includes(user.role)) {
    const err = new Error('Access denied.');
    err.status = 403;
    throw err;
  }

  return booking;
}

router.get('/:bookingId/messages', requireAuth, async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (Number.isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking id.' });
    }

    await getBookingWithAccess(bookingId, req.user);

    const messages = await prisma.bookingMessage.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.json(messages);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
});

router.post('/:bookingId/messages', requireAuth, async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (Number.isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking id.' });
    }

    await getBookingWithAccess(bookingId, req.user);

    const payload = createMessageSchema.parse(req.body);

    const message = await prisma.bookingMessage.create({
      data: {
        bookingId,
        senderId: req.user.id,
        message: payload.message,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(201).json(message);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
});

module.exports = router;
