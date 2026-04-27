'use strict';

const { ZodError } = require('zod');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return res.status(400).json({ error: 'Validation failed.', details: messages });
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(409).json({ error: `A record with that ${field} already exists.` });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found.' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  // Default server error
  const isDev = process.env.NODE_ENV === 'development';
  console.error('[ERROR]', err);

  return res.status(500).json({
    error: 'An unexpected error occurred.',
    ...(isDev && { detail: err.message }),
  });
}

module.exports = { errorHandler };
