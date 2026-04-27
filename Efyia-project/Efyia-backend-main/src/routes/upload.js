'use strict';

const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Cloudinary is configured from env vars at startup (see app.js)

const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024;  // 10 MB
const AUDIO_SIZE_LIMIT = 100 * 1024 * 1024; // 100 MB

// Multer — store in memory, then stream to Cloudinary.
// Hard limit is the audio ceiling; image overage is caught after upload so we
// can return a helpful per-type error message instead of a generic 413.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AUDIO_SIZE_LIMIT },
  fileFilter: (_req, file, cb) => {
    const allowed = /^(image\/(jpeg|png|webp|gif|svg\+xml)|audio\/(mpeg|mp3|x-mpeg|wav|x-wav|wave|aac|x-aac|aacp|ogg|x-ogg|flac|x-flac|mp4|x-m4a|x-mp4))$/;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('File type not supported.'), { status: 400 }));
    }
  },
});

// POST /api/upload  — authenticated users only
router.post('/', requireAuth, upload.single('file'), (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided.' });
  }

  // Per-type size enforcement: images are capped lower than the multer hard limit
  if (req.file.mimetype.startsWith('image/') && req.file.size > IMAGE_SIZE_LIMIT) {
    return res.status(400).json({ error: 'Image files must be 10 MB or smaller.' });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return res.status(503).json({ error: 'File storage not configured on the server.' });
  }

  const resourceType = 'auto';

  const stream = cloudinary.uploader.upload_stream(
    {
      resource_type: resourceType,
      folder: 'efyia',
      // Strip EXIF data for privacy
      exif: false,
    },
    (error, result) => {
      if (error) return next(error);
      return res.json({ url: result.secure_url, publicId: result.public_id });
    },
  );

  stream.end(req.file.buffer);
});

module.exports = router;
