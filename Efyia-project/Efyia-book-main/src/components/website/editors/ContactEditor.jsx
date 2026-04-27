export default function ContactEditor({ data, onChange }) {
  const set = (field) => (e) => onChange({ [field]: e.target.value });
  return (
    <div className="wb-editor-fields">
      <div className="wb-field wb-field--row">
        <div style={{ flex: 1 }}>
          <label className="wb-label">Email</label>
          <input type="email" value={data.email || ''} onChange={set('email')} placeholder="bookings@yourstudio.com" />
        </div>
        <div style={{ flex: 1 }}>
          <label className="wb-label">Phone</label>
          <input type="tel" value={data.phone || ''} onChange={set('phone')} placeholder="+1 (555) 000-0000" />
        </div>
      </div>
      <div className="wb-field">
        <label className="wb-label">Map embed URL (Google Maps iframe src)</label>
        <input type="url" value={data.mapEmbed || ''} onChange={set('mapEmbed')} placeholder="https://maps.google.com/..." />
      </div>
      <div className="wb-field">
        <label className="wb-label">Show contact form</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={data.showForm !== false}
            onChange={(e) => onChange({ showForm: e.target.checked })}
            style={{ width: 16, height: 16 }}
          />
          Display a contact form on this section
        </label>
      </div>
    </div>
  );
}
