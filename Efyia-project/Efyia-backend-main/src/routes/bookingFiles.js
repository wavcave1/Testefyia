'use strict';

const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { requireAuth } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();
const BOOKING_FILE_SIZE_LIMIT = 200 * 1024 * 1024; // 200 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: BOOKING_FILE_SIZE_LIMIT },
  fileFilter: (_req, file, cb) => {
    // Allow: images, audio, video, PDF, ZIP
    const allowed =
      /^(image\/(jpeg|png|webp|gif)|audio\/(mpeg|wav|aac|ogg|flac|mp4)|video\/(mp4|quicktime|webm)|application\/(pdf|zip))$/;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('File type not supported.'), { status: 400 }));
    }
  },
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

function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'efyia/session-files',
      },
      (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      },
    );

    stream.end(file.buffer);
  });
}

router.get('/:bookingId/files', requireAuth, async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (Number.isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking id.' });
    }

    await getBookingWithAccess(bookingId, req.user);

    const files = await prisma.bookingFile.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });

    return res.json(files);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
});

router.post('/:bookingId/files', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (Number.isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking id.' });
    }

    // getBookingWithAccess enforces that CLIENTs can only reach their own booking
    // and OWNERs can only reach bookings for their studio, so no extra role gate needed.
    await getBookingWithAccess(bookingId, req.user);

    if (!req.file) {
      return res.status(400).json({ error: 'File is required.' });
    }

    const result = await uploadToCloudinary(req.file);

    const created = await prisma.bookingFile.create({
      data: {
        bookingId,
        uploadedBy: req.user.id,
        fileName: req.file.originalname,
        fileUrl: result.secure_url,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
});

router.delete('/:bookingId/files/:fileId', requireAuth, async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    const fileId = parseInt(req.params.fileId, 10);

    if (Number.isNaN(bookingId) || Number.isNaN(fileId)) {
      return res.status(400).json({ error: 'Invalid id.' });
    }

    await getBookingWithAccess(bookingId, req.user);

    const file = await prisma.bookingFile.findUnique({ where: { id: fileId } });
    if (!file || file.bookingId !== bookingId) {
      return res.status(404).json({ error: 'File not found.' });
    }

    if (req.user.role !== 'ADMIN' && file.uploadedBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await prisma.bookingFile.delete({ where: { id: fileId } });
    return res.status(204).send();
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
});

module.exports = router;
