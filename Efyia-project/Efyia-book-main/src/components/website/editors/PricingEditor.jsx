export default function PricingEditor({ data, onChange }) {
  const tiers = data.tiers || [];
  const add = () => onChange({ tiers: [...tiers, { name: '', price: '', period: 'hr', features: [] }] });
  const remove = (i) => onChange({ tiers: tiers.filter((_, idx) => idx !== i) });
  const setField = (i, field) => (e) => {
    const updated = [...tiers];
    updated[i] = { ...updated[i], [field]: e.target.value };
    onChange({ tiers: updated });
  };
  const setFeatures = (i, val) => {
    const updated = [...tiers];
    updated[i] = { ...updated[i], features: val.split('\n').map((f) => f.trim()).filter(Boolean) };
    onChange({ tiers: updated });
  };
  return (
    <div className="wb-editor-fields">
      {tiers.map((tier, i) => (
        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <strong style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Tier {i + 1}</strong>
            <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div><label className="wb-label">Name</label><input value={tier.name} onChange={setField(i, 'name')} placeholder="Standard" /></div>
            <div><label className="wb-label">Price</label><input type="number" value={tier.price || ''} onChange={setField(i, 'price')} placeholder="50" /></div>
            <div><label className="wb-label">Period</label><input value={tier.period || 'hr'} onChange={setField(i, 'period')} placeholder="hr" /></div>
          </div>
          <label className="wb-label">Features (one per line)</label>
          <textarea rows={4} value={(tier.features || []).join('\n')} onChange={(e) => setFeatures(i, e.target.value)} placeholder="Pro Tools&#10;Neumann U87&#10;Vocal booth" />
        </div>
      ))}
      <div className="wb-field">
        <label className="wb-label">Footer note (optional)</label>
        <input type="text" value={data.note || ''} onChange={(e) => onChange({ note: e.target.value })} placeholder="All rates include engineer. Minimum 2hr booking." />
      </div>
      <button type="button" className="eyf-button eyf-button--secondary" onClick={add}>+ Add tier</button>
    </div>
  );
}
