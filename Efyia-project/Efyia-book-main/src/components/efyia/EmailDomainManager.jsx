import { useCallback, useEffect, useMemo, useState } from 'react';
import { emailDomainsApi } from '../../lib/api';
import { Badge, EmptyState, ErrorMessage, Spinner } from './ui';

function toArray(payload, ...keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function toneForStatus(status) {
  const value = String(status || '').toLowerCase();
  if (['verified', 'active', 'connected', 'complete', 'ready', 'enabled', 'success'].some((k) => value.includes(k))) return 'mint';
  if (['failed', 'error', 'invalid', 'disabled'].some((k) => value.includes(k))) return 'cancelled';
  if (['pending', 'waiting', 'processing'].some((k) => value.includes(k))) return 'pending';
  return 'earth';
}

function StatusBadge({ label }) {
  return <Badge tone={toneForStatus(label)}>{label || 'Unknown'}</Badge>;
}

function DomainRow({ domain, selected, onSelect }) {
  const sourceLabel = domain.sourceType || 'external';
  const capability = domain.efyiaRegisteredCapable || domain.sourceType === 'efyia_registered';

  return (
    <button type="button" className={`eyf-domain-list-item ${selected ? 'is-active' : ''}`} onClick={onSelect}>
      <div>
        <strong>{domain.domain || domain.name || 'Untitled domain'}</strong>
        <p className="eyf-muted" style={{ margin: '0.25rem 0 0' }}>{sourceLabel} · {domain.providerType || 'provider unknown'}</p>
      </div>
      <div className="eyf-domain-list-item__meta">
        <StatusBadge label={domain.setupStatus || domain.verificationStatus || 'pending'} />
        {capability ? <span className="eyf-muted" style={{ fontSize: '0.8rem' }}>Future Efyia-managed capable</span> : null}
      </div>
    </button>
  );
}

export default function EmailDomainManager({ studioId }) {
  const [domains, setDomains] = useState([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [domainError, setDomainError] = useState(null);
  const [connectDomain, setConnectDomain] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState(null);
  const [aliases, setAliases] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [newAlias, setNewAlias] = useState({ localPart: '', forwardTo: '' });
  const [aliasSaving, setAliasSaving] = useState(false);
  const [editingAliasId, setEditingAliasId] = useState(null);
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  const selectedDomain = useMemo(
    () => domains.find((item) => String(item.id) === String(selectedDomainId)) || null,
    [domains, selectedDomainId],
  );

  const loadDomains = useCallback(async () => {
    setLoadingDomains(true);
    setDomainError(null);
    try {
      const payload = await emailDomainsApi.listDomains();
      const list = toArray(payload, 'domains', 'items');
      setDomains(list);
      if (!selectedDomainId && list[0]?.id) {
        setSelectedDomainId(list[0].id);
      }
    } catch (error) {
      setDomainError(error.message || 'Could not load connected domains.');
    } finally {
      setLoadingDomains(false);
    }
  }, [selectedDomainId]);

  const loadDomainDetail = useCallback(async (domainId) => {
    if (!domainId) return;
    setLoadingDetail(true);
    setDetailError(null);

    try {
      const [domainPayload, aliasesPayload, logsPayload] = await Promise.all([
        emailDomainsApi.getDomain(domainId),
        emailDomainsApi.listAliases(domainId).catch(() => ({ aliases: [] })),
        emailDomainsApi.listEvents(studioId).catch(() => ({ events: [] })),
      ]);

      const merged = domainPayload?.domain || domainPayload;
      setDomains((prev) => prev.map((item) => (String(item.id) === String(domainId) ? { ...item, ...merged } : item)));
      setAliases(toArray(aliasesPayload, 'aliases', 'items'));
      setLogs(toArray(logsPayload, 'events', 'logs', 'items'));
    } catch (error) {
      setDetailError(error.message || 'Could not load domain setup details.');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  useEffect(() => {
    if (selectedDomainId) {
      loadDomainDetail(selectedDomainId);
    }
  }, [loadDomainDetail, selectedDomainId]);

  const handleConnectDomain = async (event) => {
    event.preventDefault();
    if (!connectDomain.trim()) return;
    setConnecting(true);
    setDomainError(null);
    try {
      const created = await emailDomainsApi.createDomain({ domain: connectDomain.trim(), studioId });
      const next = created?.domain || created;
      setDomains((prev) => [next, ...prev]);
      setSelectedDomainId(next?.id || null);
      setConnectDomain('');
    } catch (error) {
      setDomainError(error.message || 'Could not connect domain.');
    } finally {
      setConnecting(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!selectedDomainId) return;
    setRefreshingStatus(true);
    try {
      await emailDomainsApi.verifyDomain(selectedDomainId);
      await loadDomainDetail(selectedDomainId);
      await loadDomains();
    } catch (error) {
      setDetailError(error.message || 'Could not refresh status.');
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleCreateAlias = async (event) => {
    event.preventDefault();
    if (!selectedDomainId) return;
    setAliasSaving(true);
    try {
      await emailDomainsApi.createAlias(selectedDomainId, {
        localPart: newAlias.localPart.trim(),
        forwardTo: newAlias.forwardTo.trim(),
      });
      setNewAlias({ localPart: '', forwardTo: '' });
      await loadDomainDetail(selectedDomainId);
    } catch (error) {
      setDetailError(error.message || 'Could not create alias.');
    } finally {
      setAliasSaving(false);
    }
  };

  const handleAliasUpdate = async (aliasId, updates) => {
    setEditingAliasId(aliasId);
    try {
      await emailDomainsApi.updateAlias(aliasId, updates);
      await loadDomainDetail(selectedDomainId);
    } catch (error) {
      setDetailError(error.message || 'Could not update alias.');
    } finally {
      setEditingAliasId(null);
    }
  };

  const handleAliasToggle = async (aliasId, enabled) => {
    setEditingAliasId(aliasId);
    try {
      await emailDomainsApi.toggleAlias(aliasId, enabled);
      await loadDomainDetail(selectedDomainId);
    } catch (error) {
      setDetailError(error.message || 'Could not toggle alias.');
    } finally {
      setEditingAliasId(null);
    }
  };

  const handleAliasDelete = async (aliasId) => {
    setEditingAliasId(aliasId);
    try {
      await emailDomainsApi.deleteAlias(aliasId);
      await loadDomainDetail(selectedDomainId);
    } catch (error) {
      setDetailError(error.message || 'Could not delete alias.');
    } finally {
      setEditingAliasId(null);
    }
  };

  const dnsRecords = toArray(selectedDomain?.dnsRecords, 'records')
    .concat(toArray(selectedDomain?.setupData, 'dnsRecords'));

  return (
    <section className="eyf-card eyf-stack">
      <div className="eyf-row eyf-row--between eyf-row--start" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0 }}>Email &amp; domain setup</h3>
          <p className="eyf-muted" style={{ margin: '0.4rem 0 0' }}>
            Configure transactional email visibility and forwarding aliases. This does not create a mailbox or inbox in Efyia.
          </p>
        </div>
        <Badge tone="earth">Future Efyia-managed domain support</Badge>
      </div>

      <div className="eyf-email-domain-grid">
        <div className="eyf-stack">
          <div className="eyf-card eyf-stack" style={{ padding: '1rem' }}>
            <h4 style={{ margin: 0 }}>Connect a domain</h4>
            <p className="eyf-muted" style={{ margin: 0, fontSize: '0.86rem' }}>
              Step 1: enter domain. Step 2: apply DNS records. Step 3: recheck verification.
            </p>
            <form className="eyf-domain-connect-form" onSubmit={handleConnectDomain}>
              <input
                type="text"
                value={connectDomain}
                onChange={(event) => setConnectDomain(event.target.value)}
                placeholder="yourstudio.com"
                aria-label="Domain"
              />
              <button className="eyf-button" type="submit" disabled={connecting}>
                {connecting ? 'Connecting…' : 'Connect domain'}
              </button>
            </form>
          </div>

          <div className="eyf-card eyf-stack" style={{ padding: '1rem' }}>
            <div className="eyf-row eyf-row--between">
              <h4 style={{ margin: 0 }}>Connected domains</h4>
              <button type="button" className="eyf-button eyf-button--ghost" onClick={loadDomains} disabled={loadingDomains}>Refresh</button>
            </div>

            {loadingDomains ? <Spinner /> : null}
            {domainError ? <ErrorMessage message={domainError} onRetry={loadDomains} /> : null}
            {!loadingDomains && !domainError && domains.length === 0 ? (
              <EmptyState
                title="No domains connected"
                description="Connect a domain to enable branded forwarding aliases and setup guidance."
              />
            ) : null}
            {domains.map((domain) => (
              <DomainRow
                key={domain.id || domain.domain}
                domain={domain}
                selected={String(selectedDomainId) === String(domain.id)}
                onSelect={() => setSelectedDomainId(domain.id)}
              />
            ))}
          </div>
        </div>

        <div className="eyf-stack">
          <div className="eyf-card eyf-stack" style={{ padding: '1rem' }}>
            <div className="eyf-row eyf-row--between">
              <h4 style={{ margin: 0 }}>Domain setup details</h4>
              <button type="button" className="eyf-button eyf-button--ghost" onClick={handleRefreshStatus} disabled={refreshingStatus || !selectedDomainId}>
                {refreshingStatus ? 'Rechecking…' : 'Recheck status'}
              </button>
            </div>
            {loadingDetail ? <Spinner /> : null}
            {detailError ? <ErrorMessage message={detailError} onRetry={() => loadDomainDetail(selectedDomainId)} /> : null}
            {!selectedDomain ? <p className="eyf-muted" style={{ margin: 0 }}>Select a domain to view setup and alias options.</p> : null}
            {selectedDomain ? (
              <>
                <div className="eyf-domain-meta-grid">
                  {[
                    ['domain', selectedDomain.domain],
                    ['sourceType', selectedDomain.sourceType],
                    ['providerType', selectedDomain.providerType],
                    ['setupStatus', selectedDomain.setupStatus],
                    ['verificationStatus', selectedDomain.verificationStatus],
                    ['dnsStatus', selectedDomain.dnsStatus],
                    ['canManageDns', String(Boolean(selectedDomain.canManageDns))],
                    ['canCreateAliases', String(Boolean(selectedDomain.canCreateAliases))],
                    ['requiresExternalDnsAction', String(Boolean(selectedDomain.requiresExternalDnsAction))],
                    ['createdAt', formatDate(selectedDomain.createdAt)],
                    ['updatedAt', formatDate(selectedDomain.updatedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="eyf-domain-meta-item">
                      <span>{label}</span>
                      <strong>{value || '—'}</strong>
                    </div>
                  ))}
                </div>

                <div className="eyf-stack" style={{ gap: '0.6rem' }}>
                  <strong>DNS records required by backend</strong>
                  {dnsRecords.length === 0 ? (
                    <p className="eyf-muted" style={{ margin: 0 }}>No DNS records returned yet. Recheck status after domain connection.</p>
                  ) : (
                    <div className="eyf-domain-dns-list">
                      {dnsRecords.map((record, index) => (
                        <div className="eyf-domain-dns-row" key={`${record.type || 'record'}-${index}`}>
                          <span>{record.type || 'TXT'}</span>
                          <code>{record.name || record.host || '@'}</code>
                          <code>{record.value || record.target || '—'}</code>
                          <span>{record.ttl || 'auto'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedDomain.requiresExternalDnsAction ? (
                    <p className="eyf-muted" style={{ margin: 0 }}>
                      External DNS action required: update records at your DNS provider, then run “Recheck status”.
                    </p>
                  ) : (
                    <p className="eyf-muted" style={{ margin: 0 }}>Domain connected. External DNS action is not currently required.</p>
                  )}
                </div>
              </>
            ) : null}
          </div>

          <div className="eyf-card eyf-stack" style={{ padding: '1rem' }}>
            <h4 style={{ margin: 0 }}>Forwarding aliases</h4>
            <p className="eyf-muted" style={{ margin: 0, fontSize: '0.86rem' }}>Routes email to your chosen inbox. This is forwarding, not hosted email.</p>

            {selectedDomain && !selectedDomain.canCreateAliases ? (
              <p className="eyf-muted" style={{ margin: 0 }}>Alias creation is not available for this domain until setup completes.</p>
            ) : null}

            {selectedDomain?.canCreateAliases ? (
              <form className="eyf-domain-connect-form" onSubmit={handleCreateAlias}>
                <input
                  type="text"
                  placeholder="hello"
                  value={newAlias.localPart}
                  onChange={(event) => setNewAlias((prev) => ({ ...prev, localPart: event.target.value }))}
                  required
                />
                <input
                  type="email"
                  placeholder="you@inbox.com"
                  value={newAlias.forwardTo}
                  onChange={(event) => setNewAlias((prev) => ({ ...prev, forwardTo: event.target.value }))}
                  required
                />
                <button className="eyf-button" type="submit" disabled={aliasSaving}>{aliasSaving ? 'Saving…' : 'Create alias'}</button>
              </form>
            ) : null}

            {aliases.length === 0 ? (
              <p className="eyf-muted" style={{ margin: 0 }}>No aliases configured.</p>
            ) : (
              <div className="eyf-domain-table-wrap">
                <table className="eyf-domain-table">
                  <thead>
                    <tr>
                      <th>Local part</th>
                      <th>Email</th>
                      <th>Forwarding destination</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aliases.map((alias) => {
                      const fullAddress = alias.fullAddress || `${alias.localPart || alias.sourceLocalPart || 'alias'}@${selectedDomain?.domain || ''}`;
                      return (
                        <tr key={alias.id || fullAddress}>
                          <td>{alias.localPart || alias.sourceLocalPart || '—'}</td>
                          <td>{fullAddress}</td>
                          <td>{alias.forwardTo || alias.destination || '—'}</td>
                          <td><StatusBadge label={alias.enabled ? 'Enabled' : 'Disabled'} /></td>
                          <td>
                            <div className="eyf-row" style={{ gap: '0.45rem', flexWrap: 'wrap' }}>
                              <button
                                className="eyf-button eyf-button--ghost"
                                type="button"
                                style={{ minHeight: 'unset', padding: '0.35rem 0.65rem' }}
                                disabled={editingAliasId === alias.id}
                                onClick={() => handleAliasToggle(alias.id, !alias.enabled)}
                              >
                                {alias.enabled ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                className="eyf-button eyf-button--ghost"
                                type="button"
                                style={{ minHeight: 'unset', padding: '0.35rem 0.65rem' }}
                                disabled={editingAliasId === alias.id}
                                onClick={() => {
                                  const forwardTo = window.prompt('New forwarding destination', alias.forwardTo || alias.destination || '');
                                  if (forwardTo) handleAliasUpdate(alias.id, { forwardTo });
                                }}
                              >
                                Edit destination
                              </button>
                              <button
                                className="eyf-button eyf-button--danger"
                                type="button"
                                style={{ minHeight: 'unset', padding: '0.35rem 0.65rem' }}
                                disabled={editingAliasId === alias.id}
                                onClick={() => handleAliasDelete(alias.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="eyf-card eyf-stack" style={{ padding: '1rem' }}>
            <h4 style={{ margin: 0 }}>Transactional email activity</h4>
            <p className="eyf-muted" style={{ margin: 0, fontSize: '0.86rem' }}>
              Read-only visibility into delivery events when supported by your provider integration.
            </p>
            {logs.length === 0 ? (
              <p className="eyf-muted" style={{ margin: 0 }}>No transactional activity available.</p>
            ) : (
              <div className="eyf-domain-table-wrap">
                <table className="eyf-domain-table">
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Event/template</th>
                      <th>Status</th>
                      <th>Provider message ID</th>
                      <th>Error</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((event) => (
                      <tr key={event.id || `${event.providerMessageId || 'msg'}-${event.timestamp || event.createdAt || Math.random()}`}>
                        <td>{event.recipient || event.to || '—'}</td>
                        <td>{event.eventType || event.templateType || event.type || '—'}</td>
                        <td><StatusBadge label={event.status || 'Unknown'} /></td>
                        <td>{event.providerMessageId || event.messageId || '—'}</td>
                        <td>{event.error || event.failureReason || '—'}</td>
                        <td>{formatDate(event.timestamp || event.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
