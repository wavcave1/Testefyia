export default function StudioSwitcher({ memberships, activeStudioId, onSwitch }) {
  if (!memberships?.length || memberships.length < 2) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Active studio:</label>
      <select
        value={activeStudioId || ''}
        onChange={(e) => onSwitch(e.target.value)}
        style={{ fontSize: '0.875rem', padding: '0.35rem 0.6rem', borderRadius: 6 }}
      >
        {memberships.map((m) => (
          <option key={m.studioId} value={m.studioId}>
            {m.studio?.name || m.studioId} ({m.role})
          </option>
        ))}
      </select>
    </div>
  );
}
