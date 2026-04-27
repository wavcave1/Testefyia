'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v2: cloudinary } = require('cloudinary');
const { errorHandler } = require('./middleware/errors');

// ─── Configure Cloudinary ─────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const authRoutes = require('./routes/auth');
const studiosRoutes = require('./routes/studios');
const bookingsRoutes = require('./routes/bookings');
const reviewsRoutes = require('./routes/reviews');
const favoritesRoutes = require('./routes/favorites');
const usersRoutes = require('./routes/users');
const publicRoutes = require('./routes/public');
const studioProfileRoutes = require('./routes/studioProfile');
const studioTeamRoutes = require('./routes/studioTeam');
const invitesRoutes = require('./routes/invites');
const websiteRoutes = require('./routes/website');
const domainsRoutes = require('./routes/domains');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const paymentsRoutes = require('./routes/payments');
const webhooksRoutes = require('./routes/webhooks');
const connectRoutes = require('./routes/connect');
const transactionsRoutes = require('./routes/transactions');
const availabilityRoutes = require('./routes/availability');
const bookingFilesRoutes = require('./routes/bookingFiles');
const bookingMessagesRoutes = require('./routes/bookingMessages');
const analyticsRoutes = require('./routes/analytics');
const emailRoutes = require('./routes/email');

const app = express();

// Behind a proxy (Railway.app, Render, Heroku, etc) we need to trust the
// forwarded headers so express-rate-limit can read the client IP safely.
// Use 'true' to trust all proxies (Railway, Render handle this securely)
app.set('trust proxy', true);

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'https://efiyaapp.netlify.app')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

// ─── Stripe webhooks (raw body required for signature verification) ───────────
// These routes apply their own express.raw() parser and must be mounted BEFORE
// the global express.json() middleware so the body stream is not consumed first.
app.use('/api/webhooks', webhooksRoutes);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/studios', studiosRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/studio/profile', studioProfileRoutes);
app.use('/api/studio/team', studioTeamRoutes);
app.use('/api/invites', invitesRoutes);
app.use('/api/website', websiteRoutes);
app.use('/api/domains', domainsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/connect', connectRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/booking-files', bookingFilesRoutes);
app.use('/api/booking-messages', bookingMessagesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/email', emailRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
