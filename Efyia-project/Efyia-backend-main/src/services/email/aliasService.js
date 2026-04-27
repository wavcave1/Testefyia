'use strict';

const prisma = require('../../lib/prisma');
const { buildEmailProvider } = require('./providerFactory');

class AliasService {
  constructor(adapter = buildEmailProvider()) {
    this.adapter = adapter;
  }

  async getDomainForUser(domainId, user) {
    const domain = await prisma.emailDomain.findUnique({
      where: { id: domainId },
      include: { studio: true },
    });
    if (!domain) {
      const err = new Error('Domain not found.');
      err.status = 404;
      throw err;
    }

    if (user.role !== 'ADMIN' && (user.role !== 'OWNER' || domain.studio.ownerId !== user.id)) {
      const err = new Error('Access denied.');
      err.status = 403;
      throw err;
    }

    return domain;
  }

  async createAlias({ domainId, localPart, forwardTo, user }) {
    const domain = await this.getDomainForUser(domainId, user);
    if (domain.aliasEligibilityStatus !== 'ELIGIBLE') {
      const err = new Error('Domain is not yet eligible for alias creation. Complete DNS/email verification first.');
      err.status = 409;
      throw err;
    }
    const fullEmail = `${localPart}@${domain.domain}`.toLowerCase();
    const providerAlias = await this.adapter.createForwardingAlias(fullEmail, forwardTo);

    return prisma.emailAlias.create({
      data: {
        domainId,
        localPart: localPart.toLowerCase(),
        fullEmail,
        forwardTo: forwardTo.toLowerCase(),
        providerAliasId: providerAlias.id || null,
        enabled: true,
        createdByUserId: user.id,
      },
    });
  }

  async updateAlias({ aliasId, forwardTo, enabled, user }) {
    const alias = await prisma.emailAlias.findUnique({
      where: { id: aliasId },
      include: { domain: { include: { studio: true } } },
    });
    if (!alias) {
      const err = new Error('Alias not found.');
      err.status = 404;
      throw err;
    }

    if (user.role !== 'ADMIN' && (user.role !== 'OWNER' || alias.domain.studio.ownerId !== user.id)) {
      const err = new Error('Access denied.');
      err.status = 403;
      throw err;
    }

    return prisma.emailAlias.update({
      where: { id: aliasId },
      data: {
        ...(forwardTo ? { forwardTo: forwardTo.toLowerCase() } : {}),
        ...(typeof enabled === 'boolean' ? { enabled } : {}),
      },
    });
  }

  async deleteAlias({ aliasId, user }) {
    const alias = await prisma.emailAlias.findUnique({
      where: { id: aliasId },
      include: { domain: { include: { studio: true } } },
    });
    if (!alias) {
      const err = new Error('Alias not found.');
      err.status = 404;
      throw err;
    }

    if (user.role !== 'ADMIN' && (user.role !== 'OWNER' || alias.domain.studio.ownerId !== user.id)) {
      const err = new Error('Access denied.');
      err.status = 403;
      throw err;
    }

    if (alias.providerAliasId) {
      await this.adapter.deleteForwardingAlias(alias.providerAliasId);
    }

    await prisma.emailAlias.delete({ where: { id: aliasId } });
    return { deleted: true };
  }
}

module.exports = { AliasService };
