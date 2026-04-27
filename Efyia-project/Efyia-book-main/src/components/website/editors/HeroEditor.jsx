import FileUpload from '../../efyia/FileUpload';

export default function HeroEditor({ data, onChange }) {
  const set = (field) => (e) => onChange({ [field]: e.target.value });
  return (
    <div className="wb-editor-fields">
      <div className="wb-field">
        <label className="wb-label">Headline</label>
        <input type="text" value={data.headline || ''} onChange={set('headline')} placeholder="Record your best work here" />
      </div>
      <div className="wb-field">
        <label className="wb-label">Sub-headline</label>
        <input type="text" value={data.subheadline || ''} onChange={set('subheadline')} placeholder="Professional studio in Nashville, TN" />
      </div>
      <div className="wb-field wb-field--row">
        <div style={{ flex: 1 }}>
          <label className="wb-label">CTA button label</label>
          <input type="text" value={data.ctaLabel || ''} onChange={set('ctaLabel')} placeholder="Book a session" />
        </div>
        <div style={{ flex: 1 }}>
          <label className="wb-label">CTA URL</label>
          <input type="url" value={data.ctaUrl || ''} onChange={set('ctaUrl')} placeholder="https://..." />
        </div>
      </div>
      <div className="wb-field">
        <label className="wb-label">Background image</label>
        <FileUpload
          value={data.backgroundImageUrl || ''}
          onChange={(url) => onChange({ backgroundImageUrl: url })}
          type="image"
          hint="Landscape 1600×700px recommended"
        />
      </div>
      <div className="wb-field">
        <label className="wb-label">Overlay opacity ({Math.round((data.overlayOpacity ?? 0.45) * 100)}%)</label>
        <input
          type="range" min="0" max="1" step="0.05"
          value={data.overlayOpacity ?? 0.45}
          onChange={(e) => onChange({ overlayOpacity: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
