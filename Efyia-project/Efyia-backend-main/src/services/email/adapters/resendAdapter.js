'use strict';

const { Resend } = require('resend');

class ResendAdapter {
  constructor() {
    this.client = new Resend(process.env.RESEND_API_KEY);
  }

  get isConfigured() {
    return Boolean(process.env.RESEND_API_KEY);
  }

  async sendEmail(payload) {
    const { data, error } = await this.client.emails.send({
      from: payload.from,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      reply_to: payload.replyTo,
    });

    if (error) {
      const err = new Error(error.message || 'Resend send failed');
      err.status = 502;
      err.payload = error;
      throw err;
    }

    return {
      id: data.id,
      status: 'SENT',
      raw: data,
    };
  }

  _normalizeRecords(records = []) {
    return records.map((r) => ({
      ...r,
      valid: r.status === 'verified',
    }));
  }

  _normalizeDomainResponse(domain) {
    return {
      domain: {
        id: domain.id,
        name: domain.name,
        state: domain.status === 'verified' ? 'active' : 'pending',
      },
      receiving_dns_records: [],
      sending_dns_records: this._normalizeRecords(domain.records),
    };
  }

  async createDomain(domainName) {
    const { data, error } = await this.client.domains.create({ name: domainName });

    if (error) {
      const err = new Error(error.message || 'Resend domain create failed');
      err.status = 502;
      err.payload = error;
      throw err;
    }

    return this._normalizeDomainResponse(data);
  }

  async getDomain(domainName) {
    const { data: list, error: listError } = await this.client.domains.list();

    if (listError) {
      const err = new Error(listError.message || 'Resend domain list failed');
      err.status = 502;
      err.payload = listError;
      throw err;
    }

    const match = (list?.data || []).find((d) => d.name === domainName);

    if (!match) {
      return {
        domain: { id: null, name: domainName, state: 'pending' },
        receiving_dns_records: [],
        sending_dns_records: [],
      };
    }

    const { data, error } = await this.client.domains.get(match.id);

    if (error) {
      const err = new Error(error.message || 'Resend domain get failed');
      err.status = 502;
      err.payload = error;
      throw err;
    }

    return this._normalizeDomainResponse(data);
  }

  // Resend does not support forwarding aliases — these are no-ops.
  async createForwardingAlias(_aliasEmail, _forwardTo) {
    return { id: null };
  }

  async deleteForwardingAlias(_providerAliasId) {
    return { deleted: true };
  }

  async listForwardingAliases(_limit) {
    return { items: [] };
  }
}

module.exports = { ResendAdapter };
