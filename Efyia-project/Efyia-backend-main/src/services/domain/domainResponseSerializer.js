'use strict';

function computeDomainCapabilities(domain) {
  const canManageDns = domain.sourceType !== 'EXTERNAL_CONNECTED'
    || domain.providerType === 'MANUAL'
    || domain.providerType === 'CLOUDFLARE';
  const canCreateAliases = domain.aliasEligibilityStatus === 'ELIGIBLE';
  const requiresExternalDnsAction = domain.sourceType === 'EXTERNAL_CONNECTED';

  return {
    canManageDns,
    canCreateAliases,
    requiresExternalDnsAction,
  };
}

function serializeEmailDomain(domain) {
  return {
    id: domain.id,
    studioId: domain.studioId,
    domain: domain.domain,
    sourceType: domain.sourceType,
    providerType: domain.providerType,
    setupStatus: domain.setupStatus,
    domainStatus: domain.domainStatus,
    verificationStatus: domain.verificationStatus,
    dnsStatus: domain.dnsStatus,
    emailEligibilityStatus: domain.emailEligibilityStatus,
    aliasEligibilityStatus: domain.aliasEligibilityStatus,
    ...computeDomainCapabilities(domain),
    createdAt: domain.createdAt,
    updatedAt: domain.updatedAt,
  };
}

module.exports = {
  computeDomainCapabilities,
  serializeEmailDomain,
};
