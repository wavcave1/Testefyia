export default function ServicesEditor({ data, onChange }) {
  const items = data.items || [];
  const add = () => onChange({ items: [...items, { name: '', description: '', price: '', unit: 'hr' }] });
  const remove = (i) => onChange({ items: items.filter((_, idx) => idx !== i) });
  const setField = (i, field) => (e) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: e.target.value };
    onChange({ items: updated });
  };
  return (
    <div className="wb-editor-fields">
      {items.map((item, i) => (
        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <strong style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Service {i + 1}</strong>
            <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div><label className="wb-label">Name</label><input value={item.name} onChange={setField(i, 'name')} placeholder="Recording session" /></div>
            <div><label className="wb-label">Price</label><input type="number" value={item.price || ''} onChange={setField(i, 'price')} placeholder="75" /></div>
            <div><label className="wb-label">Unit</label><input value={item.unit || 'hr'} onChange={setField(i, 'unit')} placeholder="hr" /></div>
          </div>
          <div style={{ marginTop: '0.5rem' }}><label className="wb-label">Description</label><textarea rows={2} value={item.description || ''} onChange={setField(i, 'description')} placeholder="What's included" /></div>
        </div>
      ))}
      <button type="button" className="eyf-button eyf-button--secondary" onClick={add}>+ Add service</button>
    </div>
  );
}
