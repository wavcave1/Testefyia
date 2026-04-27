export default function CtaEditor({ data, onChange }) {
  const set = (field) => (e) => onChange({ [field]: e.target.value });
  return (
    <div className="wb-editor-fields">
      <div className="wb-field">
        <label className="wb-label">Headline</label>
        <input type="text" value={data.headline || ''} onChange={set('headline')} placeholder="Ready to make your record?" />
      </div>
      <div className="wb-field">
        <label className="wb-label">Body text</label>
        <textarea rows={3} value={data.body || ''} onChange={set('body')} placeholder="Book a session today and work with Nashville's finest engineers." />
      </div>
      <div className="wb-field wb-field--row">
        <div style={{ flex: 1 }}>
          <label className="wb-label">Button label</label>
          <input type="text" value={data.ctaLabel || ''} onChange={set('ctaLabel')} placeholder="Book now" />
        </div>
        <div style={{ flex: 1 }}>
          <label className="wb-label">Button URL</label>
          <input type="url" value={data.ctaUrl || ''} onChange={set('ctaUrl')} placeholder="https://..." />
        </div>
      </div>
      <div className="wb-field">
        <label className="wb-label">Background</label>
        <select value={data.background || 'accent'} onChange={set('background')}>
          <option value="accent">Accent color</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
    </div>
  );
}
