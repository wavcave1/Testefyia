'use strict';

class NoopEmailAdapter {
  get isConfigured() {
    return false;
  }

  async sendEmail(payload) {
    return {
      id: `noop-${Date.now()}`,
      status: 'FAILED',
      raw: { message: 'Email provider not configured.', payload },
    };
  }

  async createDomain(domain) {
    return {
      domain: {
        name: domain,
        state: 'unverified',
      },
      receiving_dns_records: [],
      sending_dns_records: [],
      message: 'No provider configured.',
    };
  }

  async getDomain(domain) {
    return {
      domain: {
        name: domain,
        state: 'unverified',
      },
      receiving_dns_records: [],
      sending_dns_records: [],
      message: 'No provider configured.',
    };
  }

  async createForwardingAlias(aliasEmail) {
    return { id: `noop-${aliasEmail}` };
  }

  async deleteForwardingAlias() {
    return { deleted: true };
  }
}

module.exports = { NoopEmailAdapter };
