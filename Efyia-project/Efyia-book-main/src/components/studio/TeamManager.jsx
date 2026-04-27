import { useCallback, useEffect, useState } from 'react';
import { studioTeamApi } from '../../lib/api';

const ROLES = ['OWNER', 'MANAGER', 'ENGINEER'];

function RoleBadge({ role }) {
  const colors = { OWNER: '#62f3d4', MANAGER: '#a78bfa', ENGINEER: '#60a5fa' };
  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em',
      padding: '0.2rem 0.55rem', borderRadius: 99,
      background: `${colors[role] || '#aaa'}22`,
      color: colors[role] || '#aaa',
      textTransform: 'uppercase',
    }}>
      {role}
    </span>
  );
}

export default function TeamManager({ studioId, canEdit }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MANAGER');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    studioTeamApi.list(studioId)
      .then((data) => { setMembers(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [studioId]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess('');
    try {
      await studioTeamApi.invite(inviteEmail.trim(), inviteRole, studioId);
      setInviteEmail('');
      setInviteSuccess(`Invite sent to ${inviteEmail.trim()}.`);
      load();
    } catch (err) {
      setInviteError(err.message || 'Could not send invite.');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await studioTeamApi.updateRole(memberId, newRole);
      load();
    } catch (err) {
      alert(err.message || 'Could not update role.');
    }
  };

  const handleRemove = async (memberId, name) => {
    if (!confirm(`Remove ${name} from this studio?`)) return;
    try {
      await studioTeamApi.remove(memberId);
      load();
    } catch (err) {
      alert(err.message || 'Could not remove member.');
    }
  };

  const accepted = members.filter((m) => m.inviteStatus === 'ACCEPTED');
  const pending = members.filter((m) => m.inviteStatus === 'PENDING');

  return (
    <div>
      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Loading team...</p>
      ) : error ? (
        <p style={{ color: 'var(--error, #f87171)', fontSize: '0.875rem' }}>{error}</p>
      ) : (
        <>
          {accepted.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              {accepted.map((m) => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0', borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.user?.name || m.email}</span>
                    {m.user?.name ? <span className="sp-muted" style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>{m.email}</span> : null}
                  </div>
                  {canEdit ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.4rem', borderRadius: 6 }}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <RoleBadge role={m.role} />
                  )}
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => handleRemove(m.id, m.user?.name || m.email)}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', padding: '0.1rem 0.25rem' }}
                      title="Remove member"
                    >×</button>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {pending.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                Pending invites
              </p>
              {pending.map((m) => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
                  opacity: 0.7,
                }}>
                  <span style={{ flex: 1, fontSize: '0.875rem' }}>{m.email}</span>
                  <RoleBadge role={m.role} />
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => handleRemove(m.id, m.email)}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', padding: '0.1rem 0.25rem' }}
                      title="Cancel invite"
                    >×</button>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {accepted.length === 0 && pending.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              No team members yet. Invite someone below.
            </p>
          )}
        </>
      )}

      {canEdit ? (
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@example.com"
            required
            style={{ flex: 1, minWidth: 180 }}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            style={{ fontSize: '0.875rem', padding: '0.45rem 0.6rem', borderRadius: 6 }}
          >
            <option value="MANAGER">Manager</option>
            <option value="ENGINEER">Engineer</option>
          </select>
          <button type="submit" className="eyf-button" disabled={inviting} style={{ whiteSpace: 'nowrap' }}>
            {inviting ? 'Sending...' : 'Send invite'}
          </button>
          {inviteError ? <p style={{ width: '100%', color: 'var(--error, #f87171)', fontSize: '0.8rem', margin: 0 }}>{inviteError}</p> : null}
          {inviteSuccess ? <p style={{ width: '100%', color: 'var(--mint, #62f3d4)', fontSize: '0.8rem', margin: 0 }}>{inviteSuccess}</p> : null}
        </form>
      ) : (
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>
          Only studio owners can invite or remove team members.
        </p>
      )}
    </div>
  );
}
