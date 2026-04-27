'use strict';

const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { mapStudioLocationInput } = require('../lib/location');

const router = Router();

// Accepts a string or array of strings, joins arrays to comma string
const stringOrArray = z
  .union([
    z.string().max(500),
    z.array(z.string().max(100)).max(50),
  ])
  .optional()
  .nullable()
  .transform(function (v) {
    if (!v) return null;
    if (Array.isArray(v)) return v.length ? v.join(', ') : null;
    return v || null;
  });

const profileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional().or(z.literal('')),
  richDescription: z.string().max(10000).optional().nullable(),
  logoUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  coverUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  themeOverride: z.enum(['light', 'dark']).optional().nullable(),
  fontPairing: z.enum(['modern', 'editorial', 'minimal', 'bold', 'warm']).optional(),
  layoutType: z.enum(['minimal', 'hero', 'split', 'grid', 'magazine', 'card']).optional(),
  socialLinks: z
    .object({
      instagram: z.string().max(200).optional().or(z.literal('')),
      twitter: z.string().max(200).optional().or(z.literal('')),
      facebook: z.string().max(200).optional().or(z.literal('')),
      youtube: z.string().max(200).optional().or(z.literal('')),
      soundcloud: z.string().max(200).optional().or(z.literal('')),
      tiktok: z.string().max(200).optional().or(z.literal('')),
      website: z.string().max(200).optional().or(z.literal('')),
    })
    .optional()
    .nullable(),
  contactInfo: z
    .object({
      phone: z.string().max(30).optional().or(z.literal('')),
      email: z.string().max(200).optional().or(z.literal('')),
      bookingUrl: z.string().max(200).optional().or(z.literal('')),
    })
    .optional()
    .nullable(),
  services: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        price: z.number().positive().optional(),
        unit: z.string().max(30).optional(),
      })
    )
    .max(20)
    .optional()
    .nullable(),
  genres: z.array(z.string().max(50)).max(30).optional(),
  amenities: z.array(z.string().max(100)).max(30).optional(),
  gallery: z
    .array(
      z.object({
        url: z.string().url().max(500),
        caption: z.string().max(200).optional(),
      })
    )
    .max(50)
    .optional()
    .nullable(),
  credits: z
    .array(
      z.object({
        artistName: z.string().max(100),
        projectName: z.string().max(100).optional(),
        role: z.string().max(100).optional(),
        year: z.string().max(10).optional(),
        link: z.string().max(500).optional().or(z.literal('')),
      })
    )
    .max(100)
    .optional()
    .nullable(),
  achievements: z
    .array(
      z.object({
        title: z.string().max(200),
        org: z.string().max(100).optional(),
        year: z.string().max(10).optional(),
      })
    )
    .max(50)
    .optional()
    .nullable(),
  portfolio: z
    .array(
      z.object({
        title: z.string().max(200).optional().or(z.literal('')),
        artistName: z.string().max(100).optional(),
        trackName: z.string().max(100).optional(),
        serviceType: z.string().max(100).optional(),
        embedUrl: z.string().max(500).optional().or(z.literal('')),
        audioUrl: z.string().max(500).optional().nullable().or(z.literal('')),
      })
    )
    .max(50)
    .optional()
    .nullable(),
  team: z
    .array(
      z.object({
        name: z.string().max(100),
        role: z.string().max(100).optional(),
        bio: z.string().max(500).optional(),
        photoUrl: z.string().max(500).optional().nullable().or(z.literal('')),
      })
    )
    .max(20)
    .optional()
    .nullable(),
  studioSpecs: z
    .object({
      consoleType: z.string().max(200).optional().nullable(),
      daws: stringOrArray,
      mics: stringOrArray,
      outboardGear: stringOrArray,
      rooms: z.string().max(1000).optional().nullable(),
    })
    .optional()
    .nullable(),
  bookingInfo: z
    .object({
      minHours: z.coerce.number().positive().optional().nullable(),
      maxHours: z.coerce.number().positive().optional().nullable(),
      advanceNoticeDays: z.coerce.number().nonnegative().optional().nullable(),
      notes: z.string().max(1000).optional().nullable(),
      cancellationPolicy: z.string().max(2000).optional().nullable(),
      requireDeposit: z.boolean().optional().nullable(),
      depositPercent: z.coerce.number().min(10).max(100).optional().nullable(),
    })
    .optional()
    .nullable(),
  testimonials: z
    .array(
      z.object({
        quote: z.string().max(1000),
        authorName: z.string().max(100),
        authorRole: z.string().max(100).optional(),
      })
    )
    .max(20)
    .optional()
    .nullable(),
  addressLine1: z.string().min(3).max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().min(2).max(100).optional().nullable(),
  state: z.string().min(2).max(50).optional().nullable(),
  postalCode: z.string().min(3).max(20).optional().nullable(),
  country: z.string().min(2).max(100).optional().nullable(),
  publicLocationLabel: z.string().min(2).max(120).optional().nullable(),
  arrivalInstructions: z.string().max(1000).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  address: z.string().min(3).max(200).optional(),
  zip: z.string().min(3).max(20).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  sectionOrder: z.any().optional().nullable(),
  hiddenSections: z.any().optional().nullable(),
});

// PATCH /api/studio/profile
router.patch('/', requireAuth, async function (req, res, next) {
  try {
    const studioId = req.query.studioId ? parseInt(req.query.studioId) : null;
    
    let studio;
    if (studioId) {
      studio = await prisma.studio.findFirst({
        where: {
          id: studioId,
          OR: [
            { ownerId: req.user.id },
            {
              members: {
                some: {
                  userId: req.user.id,
                  inviteStatus: 'ACCEPTED',
                  role: { in: ['OWNER', 'MANAGER'] }
                }
              }
            }
          ]
        }
      });
    } else {
      studio = await prisma.studio.findFirst({
        where: { ownerId: req.user.id }
      });
    }

    if (!studio) {
      return res.status(404).json({ error: 'No studio found for your account.' });
    }

    var data = mapStudioLocationInput(profileSchema.parse(req.body));

    if (data.studioSpecs) {
      var cleaned = {};
      var specs = data.studioSpecs;
      var keys = Object.keys(specs);

      for (var i = 0; i < keys.length; i++) {
        if (specs[keys[i]] !== undefined) {
          cleaned[keys[i]] = specs[keys[i]];
        }
      }

      data.studioSpecs = Object.keys(cleaned).length ? cleaned : null;
    }

    // AUD-010: auto-update pricePerHour to the minimum service price
    if (Array.isArray(data.services) && data.services.length) {
      const prices = data.services.map((s) => s.price).filter((p) => p > 0);
      if (prices.length) {
        data.pricePerHour = Math.min(...prices);
      }
    }

    var updated = await prisma.studio.update({
      where: { id: studio.id },
      data: data,
    });

    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

// GET /api/studio/profile
router.get('/', requireAuth, async function (req, res, next) {
  try {
    const studioId = req.query.studioId ? parseInt(req.query.studioId) : null;
    
    let studio;
    if (studioId) {
      studio = await prisma.studio.findFirst({
        where: {
          id: studioId,
          OR: [
            { ownerId: req.user.id },
            {
              members: {
                some: {
                  userId: req.user.id,
                  inviteStatus: 'ACCEPTED'
                }
              }
            }
          ]
        },
        include: {
          reviews: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        }
      });
    } else {
      studio = await prisma.studio.findFirst({
        where: { ownerId: req.user.id },
        include: {
          reviews: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        }
      });
    }

    if (!studio) {
      return res.status(404).json({ error: 'No studio found for your account.' });
    }

    return res.json(studio);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
