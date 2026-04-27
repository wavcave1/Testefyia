'use strict';

const { Router } = require('express');
const { z } = require('zod');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = Router();

const inviteSchema = z.object({
  email: z.string().email('Invalid email address.'),
  role: z.enum(['OWNER', 'MANAGER', 'ENGINEER']),
  studioId: z.number().int().positive('Invalid studio ID'),
});

const updateRoleSchema = z.object({
  role: z.enum(['OWNER', 'MANAGER', 'ENGINEER']),
});

// GET /api/studio/team
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const studioId = req.query.studioId ? parseInt(req.query.studioId) : null;

    if (!studioId) {
      return res.status(400).json({ error: 'studioId query parameter is required.' });
    }

    const studio = await prisma.studio.findUnique({
      where: { id: studioId }
    });

    if (!studio) {
      return res.status(404).json({ error: 'Studio not found.' });
    }

    // Verify user has access to this studio
    const member = await prisma.studioMember.findFirst({
      where: {
        studioId: studioId,
        userId: req.user.id,
        inviteStatus: 'ACCEPTED'
      }
    });

    if (!member && studio.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const members = await prisma.studioMember.findMany({
      where: { studioId: studioId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.json(members);
  } catch (err) {
    return next(err);
  }
});

// POST /api/studio/team/invite
router.post('/invite', requireAuth, async (req, res, next) => {
  try {
    const data = inviteSchema.parse(req.body);

    const studio = await prisma.studio.findUnique({
      where: { id: data.studioId }
    });

    if (!studio) {
      return res.status(404).json({ error: 'Studio not found.' });
    }

    // Only owner or manager can invite
    if (studio.ownerId !== req.user.id) {
      const member = await prisma.studioMember.findFirst({
        where: {
          studioId: data.studioId,
          userId: req.user.id,
          inviteStatus: 'ACCEPTED',
          role: { in: ['OWNER', 'MANAGER'] }
        }
      });

      if (!member) {
        return res.status(403).json({ error: 'You do not have permission to invite team members.' });
      }
    }

    // Check if member already exists
    const existing = await prisma.studioMember.findUnique({
      where: {
        studioId_email: {
          studioId: data.studioId,
          email: data.email.toLowerCase()
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'User with this email is already a team member.' });
    }

    // Check if user with email exists
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() }
    });

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiredAt = new Date();
    inviteExpiredAt.setDate(inviteExpiredAt.getDate() + 7); // 7 days

    const member = await prisma.studioMember.create({
      data: {
        studioId: data.studioId,
        userId: user ? user.id : null,
        email: data.email.toLowerCase(),
        role: data.role,
        inviteStatus: 'PENDING',
        inviteToken: inviteToken,
        inviteExpiredAt: inviteExpiredAt
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return res.status(201).json(member);
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/studio/team/:memberId
router.patch('/:memberId', requireAuth, async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const data = updateRoleSchema.parse(req.body);

    const member = await prisma.studioMember.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return res.status(404).json({ error: 'Team member not found.' });
    }

    const studio = await prisma.studio.findUnique({
      where: { id: member.studioId }
    });

    // Only owner or manager can update roles
    if (studio.ownerId !== req.user.id) {
      const requester = await prisma.studioMember.findFirst({
        where: {
          studioId: member.studioId,
          userId: req.user.id,
          inviteStatus: 'ACCEPTED',
          role: { in: ['OWNER', 'MANAGER'] }
        }
      });

      if (!requester) {
        return res.status(403).json({ error: 'You do not have permission to modify team members.' });
      }
    }

    const updated = await prisma.studioMember.update({
      where: { id: memberId },
      data: { role: data.role },
      include: {
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

// DELETE /api/studio/team/:memberId
router.delete('/:memberId', requireAuth, async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.memberId);

    const member = await prisma.studioMember.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return res.status(404).json({ error: 'Team member not found.' });
    }

    const studio = await prisma.studio.findUnique({
      where: { id: member.studioId }
    });

    // Only owner or manager can remove members
    if (studio.ownerId !== req.user.id) {
      const requester = await prisma.studioMember.findFirst({
        where: {
          studioId: member.studioId,
          userId: req.user.id,
          inviteStatus: 'ACCEPTED',
          role: { in: ['OWNER', 'MANAGER'] }
        }
      });

      if (!requester) {
        return res.status(403).json({ error: 'You do not have permission to remove team members.' });
      }
    }

    await prisma.studioMember.delete({
      where: { id: memberId }
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
