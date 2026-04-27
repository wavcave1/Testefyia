'use strict';

const prisma = require('../../lib/prisma');

class DomainService {
  async assertStudioOwnership({ studioId, user }) {
    const studio = await prisma.studio.findUnique({ where: { id: studioId } });
    if (!studio) {
      const err = new Error('Studio not found.');
      err.status = 404;
      throw err;
    }

    if (user.role !== 'ADMIN' && (user.role !== 'OWNER' || studio.ownerId !== user.id)) {
      const err = new Error('Access denied.');
      err.status = 403;
      throw err;
    }

    return studio;
  }

  async createDomainRecord({ user, studioId, domain, sourceType, providerType }) {
    await this.assertStudioOwnership({ studioId, user });

    return prisma.emailDomain.create({
      data: {
        studioId,
        createdByUserId: user.id,
        domain,
        sourceType,
        providerType,
        registrationStatus: sourceType === 'EFYIA_REGISTERED' ? 'PENDING' : 'NOT_APPLICABLE',
        setupStatus: sourceType === 'EFYIA_REGISTERED' ? 'pending_registration' : 'pending_dns',
      },
    });
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

  // Future-safe reseller extension points (not implemented yet):
  // - search availability
  // - register domain
  // - transfer domain
  // - renew domain
  // - sync registrar status
  // - manage nameservers/DNS
}

module.exports = { DomainService };
