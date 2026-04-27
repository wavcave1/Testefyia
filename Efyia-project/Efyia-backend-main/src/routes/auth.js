'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { signToken } = require('../lib/jwt');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(80),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
  role: z.enum(['CLIENT', 'OWNER']).default('CLIENT'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

function buildToken(user) {
  return signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
}

function safeUser(user) {
  const { password: _, ...rest } = user;
  return rest;
}

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const hash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hash,
        role: data.role,
      },
    });

    const token = buildToken(user);
    return res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = buildToken(user);
    return res.json({ token, user: safeUser(user) });
  } catch (err) {
    return next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        studioMemberships: {
          where: { inviteStatus: 'ACCEPTED' },
          include: {
            studio: {
              select: { id: true, name: true, slug: true }
            }
          }
        }
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    
    const safeUserData = safeUser(user);
    return res.json({
      ...safeUserData,
      studioMemberships: user.studioMemberships
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
