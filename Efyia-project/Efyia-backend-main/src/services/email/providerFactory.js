'use strict';

const { MailgunAdapter } = require('./adapters/mailgunAdapter');
const { ResendAdapter } = require('./adapters/resendAdapter');
const { NoopEmailAdapter } = require('./adapters/noopAdapter');

function buildEmailProvider() {
  const provider = (process.env.EMAIL_PROVIDER || 'mailgun').toLowerCase();

  if (provider === 'resend') {
    const adapter = new ResendAdapter();
    if (adapter.isConfigured) return adapter;
  }

  if (provider === 'mailgun') {
    const adapter = new MailgunAdapter();
    if (adapter.isConfigured) return adapter;
  }

  return new NoopEmailAdapter();
}

module.exports = { buildEmailProvider };
