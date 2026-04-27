export default function TestimonialsEditor({ data, onChange }) {
  const items = data.items || [];
  const add = () => onChange({ items: [...items, { quote: '', author: '', role: '' }] });
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
            <strong style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Testimonial {i + 1}</strong>
            <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
          </div>
          <label className="wb-label">Quote</label>
          <textarea rows={3} value={item.quote} onChange={setField(i, 'quote')} placeholder='"Working here changed everything about my sound..."' />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div><label className="wb-label">Author</label><input value={item.author || ''} onChange={setField(i, 'author')} placeholder="Alex M." /></div>
            <div><label className="wb-label">Role</label><input value={item.role || ''} onChange={setField(i, 'role')} placeholder="Independent artist" /></div>
          </div>
        </div>
      ))}
      <button type="button" className="eyf-button eyf-button--secondary" onClick={add}>+ Add testimonial</button>
    </div>
  );
}
