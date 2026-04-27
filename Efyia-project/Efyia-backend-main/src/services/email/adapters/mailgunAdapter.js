'use strict';

class MailgunAdapter {
  constructor() {
    this.apiKey = process.env.EMAIL_PROVIDER_API_KEY;
    this.baseUrl = process.env.EMAIL_PROVIDER_BASE_URL || 'https://api.mailgun.net/v3';
  }

  get isConfigured() {
    return Boolean(this.apiKey);
  }

  buildAuthHeader() {
    return `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`;
  }

  async request(path, { method = 'GET', json, form, query } = {}) {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const headers = {
      Authorization: this.buildAuthHeader(),
    };

    let body;
    if (json) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(json);
    } else if (form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(form).toString();
    }

    const response = await fetch(url, { method, headers, body });
    const text = await response.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }

    if (!response.ok) {
      const error = new Error(parsed?.message || `Mailgun request failed: ${response.status}`);
      error.status = response.status;
      error.payload = parsed;
      throw error;
    }

    return parsed;
  }

  async sendEmail(payload) {
    const sendingDomain =
      payload.sendingDomain || process.env.EMAIL_SENDING_DOMAIN || process.env.EMAIL_PROVIDER_DOMAIN;

    if (!sendingDomain) {
      throw new Error('EMAIL_SENDING_DOMAIN (or EMAIL_PROVIDER_DOMAIN) is required to send email.');
    }

    const form = {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      'h:Reply-To': payload.replyTo,
    };

    const data = await this.request(`/${sendingDomain}/messages`, {
      method: 'POST',
      form,
    });

    return {
      id: data.id,
      status: 'SENT',
      raw: data,
    };
  }

  async createDomain(domain) {
    return this.request('/domains', {
      method: 'POST',
      form: {
        name: domain,
        smtp_password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
      },
    });
  }

  async getDomain(domain) {
    return this.request(`/domains/${encodeURIComponent(domain)}`);
  }

  async createForwardingAlias(aliasEmail, forwardTo) {
    const data = await this.request('/routes', {
      method: 'POST',
      form: {
        priority: '10',
        description: `Efyia alias ${aliasEmail}`,
        expression: `match_recipient('${aliasEmail}')`,
        action: `forward('${forwardTo}')`,
      },
    });

    return {
      id: data.route?.id,
      raw: data,
    };
  }

  async deleteForwardingAlias(providerAliasId) {
    return this.request(`/routes/${providerAliasId}`, { method: 'DELETE' });
  }

  async listForwardingAliases(limit = 100) {
    return this.request('/routes', { query: { limit } });
  }
}

module.exports = { MailgunAdapter };
