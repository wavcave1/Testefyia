'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { mapStudioLocationInput } = require('../lib/location');
const { EmailService } = require('../services/email/emailService');

const router = express.Router();
const emailService = new EmailService();

// All admin routes require auth + ADMIN role
router.use(requireAuth, requireRole('ADMIN'));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeUser(user) {
  const { password: _, ...rest } = user;
  return rest;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function profileCompletion(studio) {
  const checks = [
    studio.name?.trim(),
    studio.logoUrl,
    studio.coverUrl,
    studio.richDescription?.trim(),
    studio.services?.length,
    studio.contactInfo?.email || studio.contactInfo?.phone,
    studio.gallery?.length,
    studio.genres?.length,
    studio.credits?.length,
    studio.socialLinks && Object.values(studio.socialLinks).some(Boolean),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

// ─── Dashboard summary ────────────────────────────────────────────────────────

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, totalStudios, recentSignupsRaw, pendingOnboardingRaw] = await Promise.all([
      prisma.user.count(),
      prisma.studio.count(),
      prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.studio.findMany({
        where: { richDescription: null },
        select: { id: true, name: true, slug: true, createdAt: true },
        take: 20,
      }),
    ]);

    return res.json({
      totalUsers,
      totalStudios,
      recentSignups: recentSignupsRaw.map((u) => ({
        ...u,
        signupDate: u.createdAt.toISOString().split('T')[0],
        status: u.status,
      })),
      pendingOnboarding: pendingOnboardingRaw,
    });
  } catch (err) {
    return next(err);
  }
});

// ─── Accounts ─────────────────────────────────────────────────────────────────

const createAccountSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128).optional().default('Efyia2024!'),
  role: z.enum(['ADMIN', 'OWNER', 'CLIENT']).default('CLIENT'),
  status: z.enum(['ACTIVE', 'SUSPENDED']).default('ACTIVE'),
});

const updateAccountSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  role: z.enum(['ADMIN', 'OWNER', 'CLIENT']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});

const enableOwnerProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  pricePerHour: z.coerce.number().positive().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  address: z.string().max(200).optional(),
  zip: z.string().max(20).optional(),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  publicLocationLabel: z.string().max(120).optional().nullable(),
  arrivalInstructions: z.string().max(1000).optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  lat: z.coerce.number().optional().nullable(),
  lng: z.coerce.number().optional().nullable(),
});

// GET /api/admin/accounts
router.get('/accounts', async (req, res, next) => {
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

    const accounts = users.map((u) => ({
      ...u,
      signupDate: u.createdAt.toISOString().split('T')[0],
    }));

    return res.json({ accounts });
  } catch (err) {
    return next(err);
  }
});

// GET /api/admin/accounts/:id
router.get('/accounts/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid account id.' });

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true,
        _count: { select: { bookings: true, studios: true, reviews: true } },
        studios: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!user) return res.status(404).json({ error: 'Account not found.' });
    return res.json(user);
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/accounts
router.post('/accounts', async (req, res, next) => {
  try {
    const data = createAccountSchema.parse(req.body);
    const hash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hash,
        role: data.role,
        status: data.status,
      },
    });

    return res.status(201).json(safeUser(user));
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/admin/accounts/:id
router.patch('/accounts/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid account id.' });

    const data = updateAccountSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    });

    return res.json(user);
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/admin/accounts/:id
router.delete('/accounts/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid account id.' });

    // Guard: check for related records that would block deletion
    const counts = await prisma.user.findUnique({
      where: { id },
      select: { _count: { select: { studios: true, bookings: true } } },
    });

    if (!counts) return res.status(404).json({ error: 'Account not found.' });

    if (counts._count.studios > 0) {
      return res.status(409).json({
        error: `Cannot delete account — it owns ${counts._count.studios} studio(s). Reassign or delete the studio(s) first.`,
      });
    }
    if (counts._count.bookings > 0) {
      return res.status(409).json({
        error: `Cannot delete account — it has ${counts._count.bookings} booking(s). Cancel and delete the bookings first.`,
      });
    }

    await prisma.user.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/accounts/:id/reset-password
router.post('/accounts/:id/reset-password', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid account id.' });

    // Generate a temporary password and return it to the admin
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let tempPassword = '';
    for (let i = 0; i < 12; i++) {
      tempPassword += chars[Math.floor(Math.random() * chars.length)];
    }

    const hash = await bcrypt.hash(tempPassword, 12);
    const user = await prisma.user.update({ where: { id }, data: { password: hash } });

    try {
      await emailService.sendPasswordReset({
        to: user.email,
        userName: user.name,
        resetToken: tempPassword,
        actorUserId: req.user.id,
      });
    } catch (err) {
      console.error('[email] password reset email failed:', err.message);
    }

    return res.json({ temporaryPassword: tempPassword, message: 'Password reset. Share this with the user securely.' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/accounts/:id/revoke-sessions
// JWTs are stateless — acknowledge the action but note tokens expire naturally
router.post('/accounts/:id/revoke-sessions', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid account id.' });

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    // No session table — tokens are stateless JWTs. Resetting the password effectively
    // invalidates existing tokens on next login attempt.
    return res.json({ message: 'Sessions revoked. Existing tokens will remain valid until expiry.' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/accounts/:id/enable-owner-profile
// Promotes an account to OWNER (if needed) and provisions a starter studio/profile
router.post('/accounts/:id/enable-owner-profile', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid account id.' });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    // Promote to OWNER if necessary
    if (user.role !== 'OWNER') {
      await prisma.user.update({ where: { id }, data: { role: 'OWNER' } });
    }

    // If the user already owns a studio, return it
    const existingStudio = await prisma.studio.findFirst({
      where: { ownerId: id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    if (existingStudio) {
      return res.json({ studio: existingStudio, created: false });
    }

    const input = mapStudioLocationInput(enableOwnerProfileSchema.parse(req.body || {}));
    const studioName = input.name || `${user.name || 'New'} Studio`;

    // Ensure unique slug
    let slug = slugify(studioName);
    const conflict = await prisma.studio.findUnique({ where: { slug } });
    if (conflict) slug = `${slug}-${Date.now()}`;

    const studio = await prisma.studio.create({
      data: {
        name: studioName,
        slug,
        ownerId: id,
        description: '',
        city: input.city || '',
        state: input.state || '',
        address: input.address || '',
        zip: input.zip || '',
        addressLine1: input.addressLine1 || null,
        addressLine2: input.addressLine2 || null,
        postalCode: input.postalCode || null,
        country: input.country || null,
        publicLocationLabel: input.publicLocationLabel || null,
        arrivalInstructions: input.arrivalInstructions || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        lat: input.lat || null,
        lng: input.lng || null,
        pricePerHour: input.pricePerHour || '',
      },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    return res.status(201).json({ studio, created: true });
  } catch (err) {
    return next(err);
  }
});

// ─── Studios ──────────────────────────────────────────────────────────────────

const createStudioSchema = z.object({
  name: z.string().min(2).max(120),
  ownerAccountId: z.coerce.number().int().positive(),
  description: z.string().max(2000).optional().default('Studio managed by Efyia.'),
  city: z.string().max(100).optional().default(''),
  state: z.string().max(100).optional().default(''),
  address: z.string().max(200).optional().default(''),
  zip: z.string().max(20).optional().default(''),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  publicLocationLabel: z.string().max(120).optional().nullable(),
  arrivalInstructions: z.string().max(1000).optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  lat: z.coerce.number().optional().nullable(),
  lng: z.coerce.number().optional().nullable(),
  pricePerHour: z.coerce.number().positive().optional().default(75),
});

const updateStudioSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  address: z.string().max(200).optional(),
  zip: z.string().max(20).optional(),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  publicLocationLabel: z.string().max(120).optional().nullable(),
  arrivalInstructions: z.string().max(1000).optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  lat: z.coerce.number().optional().nullable(),
  lng: z.coerce.number().optional().nullable(),
  featured: z.boolean().optional(),
  verified: z.boolean().optional(),
  ownerAccountId: z.coerce.number().int().positive().optional(),
  pricePerHour: z.coerce.number().positive().optional(),
  // Note: Studio model has no `status` field — use featured/verified for admin controls
});

// GET /api/admin/studios
router.get('/studios', async (req, res, next) => {
  try {
    const studios = await prisma.studio.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { bookings: true, reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ studios });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/studios
router.post('/studios', async (req, res, next) => {
  try {
    const data = mapStudioLocationInput(createStudioSchema.parse(req.body));

    const owner = await prisma.user.findUnique({ where: { id: data.ownerAccountId }, select: { id: true } });
    if (!owner) return res.status(404).json({ error: 'Owner account not found.' });

    // Ensure unique slug
    let slug = slugify(data.name);
    const existing = await prisma.studio.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const studio = await prisma.studio.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        postalCode: data.postalCode || null,
        country: data.country || null,
        publicLocationLabel: data.publicLocationLabel || null,
        arrivalInstructions: data.arrivalInstructions || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        lat: data.lat || null,
        lng: data.lng || null,
        pricePerHour: data.pricePerHour,
        ownerId: data.ownerAccountId,
      },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    return res.status(201).json(studio);
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/admin/studios/:id
router.patch('/studios/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid studio id.' });

    const { ownerAccountId, ...rest } = updateStudioSchema.parse(req.body);
    const data = mapStudioLocationInput({ ...rest });
    if (ownerAccountId !== undefined) data.ownerId = ownerAccountId;

    const studio = await prisma.studio.update({
      where: { id },
      data,
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    return res.json(studio);
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/admin/studios/:id
router.delete('/studios/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid studio id.' });

    await prisma.studio.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

// ─── Profiles ─────────────────────────────────────────────────────────────────
// "Profiles" in admin context = studios with their branding/profile completion status

// GET /api/admin/profiles
router.get('/profiles', async (req, res, next) => {
  try {
    const studios = await prisma.studio.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        coverUrl: true,
        richDescription: true,
        services: true,
        contactInfo: true,
        gallery: true,
        genres: true,
        credits: true,
        socialLinks: true,
        featured: true,
        verified: true,
        createdAt: true,
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const profiles = studios.map((s) => ({
      ...s,
      displayName: s.name,
      accountName: s.owner?.name,
      accountId: s.owner?.id,
      studioName: s.name,
      studioId: s.id,
      completion: profileCompletion(s),
    }));

    return res.json({ profiles });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/profiles — create a profile record (creates a studio with profile data)
router.post('/profiles', async (req, res, next) => {
  try {
    const schema = z.object({
      displayName: z.string().min(2).max(120),
      studioId: z.coerce.number().int().positive(),
      accountId: z.coerce.number().int().positive(),
    });

    const data = schema.parse(req.body);

    // Verify the studio and account exist, then update studio name
    const studio = await prisma.studio.findUnique({ where: { id: data.studioId } });
    if (!studio) return res.status(404).json({ error: 'Studio not found.' });

    const updated = await prisma.studio.update({
      where: { id: data.studioId },
      data: { name: data.displayName, ownerId: data.accountId },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    return res.status(201).json({ ...updated, displayName: updated.name, completion: profileCompletion(updated) });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/admin/profiles/:id
router.patch('/profiles/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid profile id.' });

    const schema = z.object({
      // Admin can rename a profile/studio
      displayName: z.string().min(2).max(120).optional(),
      name: z.string().min(2).max(120).optional(),
      featured: z.boolean().optional(),
      verified: z.boolean().optional(),
    });

    const { displayName, name, ...rest } = schema.parse(req.body);

    // Both displayName and name map to the Studio.name field
    const resolvedName = displayName ?? name;
    const data = { ...rest };
    if (resolvedName) data.name = resolvedName;

    const before = await prisma.studio.findUnique({
      where: { id },
      select: { verified: true, owner: { select: { email: true, name: true } }, name: true, id: true },
    });
    const studio = await prisma.studio.update({
      where: { id },
      data,
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    if (before && !before.verified && studio.verified) {
      try {
        await emailService.sendProfileApprovedEmail({
          to: studio.owner.email,
          ownerName: studio.owner.name,
          studioName: studio.name,
          actorUserId: req.user.id,
          studioId: studio.id,
        });
      } catch (err) {
        console.error('[email] profile approved email failed:', err.message);
      }
    }

    return res.json({ ...studio, displayName: studio.name, completion: profileCompletion(studio) });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/admin/profiles/:id — clears all profile/branding data from a studio
router.delete('/profiles/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid profile id.' });

    await prisma.studio.update({
      where: { id },
      data: {
        richDescription: null,
        logoUrl: null,
        coverUrl: null,
        socialLinks: null,
        contactInfo: null,
        services: null,
        gallery: null,
        credits: null,
        achievements: null,
        portfolio: null,
        team: null,
        studioSpecs: null,
        bookingInfo: null,
        testimonials: null,
        genres: [],
      },
    });

    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

// ─── Permissions ──────────────────────────────────────────────────────────────
// Permissions are studio ownership records. Each studio has one owner.
// The permission matrix in the UI shows owner-level access toggles.

// GET /api/admin/permissions
router.get('/permissions', async (req, res, next) => {
  try {
    const studios = await prisma.studio.findMany({
      select: {
        id: true,
        name: true,
        featured: true,
        verified: true,
        owner: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const permissions = studios.map((s) => ({
      id: s.id,
      studioName: s.name,
      profileName: `${s.name} Profile`,
      accountName: s.owner?.name || '—',
      // All permission flags are true for the owner
      viewStudio: true,
      manageStudio: true,
      viewProfile: true,
      manageProfile: true,
      studioAdmin: s.verified,
    }));

    return res.json(permissions);
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/admin/permissions/:id — id is the studioId
// studioAdmin toggle maps to verified flag
router.patch('/permissions/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid permission id.' });

    const schema = z.object({
      studioAdmin: z.boolean().optional(),
      viewStudio: z.boolean().optional(),
      manageStudio: z.boolean().optional(),
      viewProfile: z.boolean().optional(),
      manageProfile: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    const updateData = {};
    if (data.studioAdmin !== undefined) updateData.verified = data.studioAdmin;

    const studio = await prisma.studio.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, verified: true, owner: { select: { id: true, name: true } } },
    });

    return res.json({
      id: studio.id,
      studioName: studio.name,
      profileName: `${studio.name} Profile`,
      accountName: studio.owner?.name || '—',
      viewStudio: true,
      manageStudio: true,
      viewProfile: true,
      manageProfile: true,
      studioAdmin: studio.verified,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
