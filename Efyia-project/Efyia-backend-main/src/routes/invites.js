'use strict';

const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = Router();

const acceptSchema = z.object({
  // Can accept without additional data, or user can provide signup data
  name: z.string().min(2).max(80).optional(),
});

// GET /api/invites/:token
router.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const invite = await prisma.studioMember.findUnique({
      where: { inviteToken: token },
      include: {
        studio: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found.' });
    }

    // Check if expired
    if (invite.inviteExpiredAt && new Date() > invite.inviteExpiredAt) {
      return res.status(410).json({ error: 'Invite has expired.' });
    }

    // Check if already accepted
    if (invite.inviteStatus === 'ACCEPTED') {
      return res.status(409).json({ error: 'This invite has already been accepted.' });
    }

    return res.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      studio: invite.studio,
      inviteStatus: invite.inviteStatus,
      createdAt: invite.createdAt
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/invites/:token/accept
router.post('/:token/accept', async (req, res, next) => {
  try {
    const { token } = req.params;
    const data = acceptSchema.parse(req.body);

    const invite = await prisma.studioMember.findUnique({
      where: { inviteToken: token }
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found.' });
    }

    // Check if expired
    if (invite.inviteExpiredAt && new Date() > invite.inviteExpiredAt) {
      return res.status(410).json({ error: 'Invite has expired.' });
    }

    // Check if already accepted
    if (invite.inviteStatus === 'ACCEPTED') {
      return res.status(409).json({ error: 'This invite has already been accepted.' });
    }

    let userId = invite.userId;

    // If no user associated, create one or find existing
    if (!userId) {
      const user = await prisma.user.findUnique({
        where: { email: invite.email }
      });

      if (user) {
        userId = user.id;
      } else {
        return res.status(400).json({ error: 'User account not found. Please sign up first.' });
      }
    } else if (data.name) {
      // Update user name if provided
      await prisma.user.update({
        where: { id: userId },
        data: { name: data.name }
      });
    }

    // Accept the invite
    const updated = await prisma.studioMember.update({
      where: { id: invite.id },
      data: {
        userId: userId,
        inviteStatus: 'ACCEPTED',
        acceptedAt: new Date(),
        inviteToken: null,
        inviteExpiredAt: null
      },
      include: {
        studio: {
          select: { id: true, name: true, slug: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
