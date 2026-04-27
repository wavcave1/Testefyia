export default function FaqEditor({ data, onChange }) {
  const items = data.items || [];
  const add = () => onChange({ items: [...items, { question: '', answer: '' }] });
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
            <strong style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>FAQ {i + 1}</strong>
            <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
          </div>
          <label className="wb-label">Question</label>
          <input value={item.question} onChange={setField(i, 'question')} placeholder="What's the minimum booking?" style={{ marginBottom: '0.5rem' }} />
          <label className="wb-label">Answer</label>
          <textarea rows={3} value={item.answer} onChange={setField(i, 'answer')} placeholder="Our minimum session is 2 hours..." />
        </div>
      ))}
      <button type="button" className="eyf-button eyf-button--secondary" onClick={add}>+ Add question</button>
    </div>
  );
}
