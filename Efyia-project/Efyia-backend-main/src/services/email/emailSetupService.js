'use strict';

const prisma = require('../../lib/prisma');
const { buildEmailProvider } = require('./providerFactory');

function mapDnsStatus(records) {
  if (!records.length) return 'PENDING';
  const valid = records.filter((r) => r.valid === true).length;
  if (valid === records.length) return 'VERIFIED';
  if (valid > 0) return 'PARTIAL';
  return 'PENDING';
}

class EmailSetupService {
  constructor(adapter = buildEmailProvider()) {
    this.adapter = adapter;
  }

  deriveEligibility({ verificationStatus, dnsStatus }) {
    const eligible = verificationStatus === 'VERIFIED' && dnsStatus === 'VERIFIED';
    return {
      emailEligibilityStatus: eligible ? 'ELIGIBLE' : 'PENDING',
      aliasEligibilityStatus: eligible ? 'ELIGIBLE' : 'PENDING',
    };
  }

  async connectProviderDomain(existingDomain) {
    const providerDomain = await this.adapter.createDomain(existingDomain.domain);
    const dnsRecords = [
      ...(providerDomain.receiving_dns_records || []),
      ...(providerDomain.sending_dns_records || []),
    ];

    const verificationStatus = providerDomain.domain?.state === 'active' ? 'VERIFIED' : 'PENDING';
    const dnsStatus = mapDnsStatus(dnsRecords);
    const eligibility = this.deriveEligibility({ verificationStatus, dnsStatus });

    return prisma.emailDomain.update({
      where: { id: existingDomain.id },
      data: {
        providerDomainId: providerDomain.domain?.id ? String(providerDomain.domain.id) : null,
        provider: 'mailgun',
        domainStatus: verificationStatus,
        verificationStatus,
        dnsStatus,
        setupStatus: verificationStatus === 'VERIFIED' ? 'ready' : 'pending_dns',
        requiredDns: dnsRecords,
        verificationMeta: providerDomain,
        ...eligibility,
      },
    });
  }

  async refreshEmailSetupStatus(existingDomain) {
    const providerDomain = await this.adapter.getDomain(existingDomain.domain);
    const dnsRecords = [
      ...(providerDomain.receiving_dns_records || []),
      ...(providerDomain.sending_dns_records || []),
    ];

    const verificationStatus = providerDomain.domain?.state === 'active' ? 'VERIFIED' : 'PENDING';
    const dnsStatus = mapDnsStatus(dnsRecords);
    const eligibility = this.deriveEligibility({ verificationStatus, dnsStatus });

    return prisma.emailDomain.update({
      where: { id: existingDomain.id },
      data: {
        providerDomainId: providerDomain.domain?.id ? String(providerDomain.domain.id) : existingDomain.providerDomainId,
        domainStatus: verificationStatus,
        verificationStatus,
        dnsStatus,
        setupStatus: verificationStatus === 'VERIFIED' ? 'ready' : 'pending_dns',
        requiredDns: dnsRecords,
        verificationMeta: providerDomain,
        ...eligibility,
        lastVerifiedAt: new Date(),
      },
    });
  }
}

module.exports = { EmailSetupService };
