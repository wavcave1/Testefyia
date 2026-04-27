'use strict';

const express = require('express');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const updateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email('Invalid email address.').optional(),
});

const adminUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  role: z.enum(['ADMIN', 'OWNER', 'CLIENT']).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.').max(128),
});

// GET /api/users — admin only
router.get('/', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        _count: { select: { bookings: true, studios: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(users);
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/users/me — update own profile (name and/or email)
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    if (data.email) {
      data.email = data.email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ error: 'An account with that email already exists.' });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        stripePaymentMethodId: true,
        stripePaymentMethodBrand: true,
        stripePaymentMethodLast4: true,
        stripePaymentMethodExpMonth: true,
        stripePaymentMethodExpYear: true,
        stripePaymentMethodSavedAt: true,
        stripePaymentMethodStudioId: true,
      },
    });
    return res.json(user);
  } catch (err) {
    return next(err);
  }
});

// POST /api/users/me/change-password — change own password
router.post('/me/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });

    return res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/users/:id — admin: update role or status
router.patch('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id.' });

    const data = adminUpdateSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    return res.json(user);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
