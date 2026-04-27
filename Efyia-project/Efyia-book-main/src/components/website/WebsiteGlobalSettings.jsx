import { useState } from 'react';
import FileUpload from '../efyia/FileUpload';
import { FONT_PAIRINGS } from '../../lib/studioTheme';

export default function WebsiteGlobalSettings({ settings = {}, onSave, saving }) {
  const [form, setForm] = useState({
    primaryColor: settings.primaryColor || '#62f3d4',
    fontPairing: settings.fontPairing || 'modern',
    logoUrl: settings.logoUrl || '',
    footerText: settings.footerText || '',
    googleAnalyticsId: settings.googleAnalyticsId || '',
    socialLinks: settings.socialLinks || {},
  });

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setSocial = (platform) => (e) =>
    setForm((prev) => ({ ...prev, socialLinks: { ...prev.socialLinks, [platform]: e.target.value } }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="wb-settings-form">
      <div className="wb-settings-row">
        <label className="wb-label">Brand color</label>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <input
            type="color"
            value={form.primaryColor}
            onChange={set('primaryColor')}
            style={{ width: 40, height: 40, border: 'none', padding: 0, borderRadius: 6, cursor: 'pointer' }}
          />
          <input
            type="text"
            value={form.primaryColor}
            onChange={set('primaryColor')}
            maxLength={7}
            style={{ width: 90 }}
          />
        </div>
      </div>

      <div className="wb-settings-row">
        <label className="wb-label">Font pairing</label>
        <select value={form.fontPairing} onChange={set('fontPairing')} style={{ maxWidth: 260 }}>
          {Object.entries(FONT_PAIRINGS).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label} — {cfg.description}</option>
          ))}
        </select>
      </div>

      <div className="wb-settings-row">
        <label className="wb-label">Logo</label>
        <FileUpload
          value={form.logoUrl}
          onChange={(url) => setForm((prev) => ({ ...prev, logoUrl: url }))}
          type="image"
          hint="PNG or SVG recommended"
        />
      </div>

      <div className="wb-settings-row">
        <label className="wb-label">Footer text</label>
        <input type="text" value={form.footerText} onChange={set('footerText')} placeholder="© 2026 My Studio. All rights reserved." />
      </div>

      <div className="wb-settings-row">
        <label className="wb-label">Google Analytics ID</label>
        <input type="text" value={form.googleAnalyticsId} onChange={set('googleAnalyticsId')} placeholder="G-XXXXXXXXXX" style={{ maxWidth: 180 }} />
      </div>

      <div className="wb-settings-row">
        <label className="wb-label">Social links</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {['instagram', 'twitter', 'facebook', 'youtube', 'soundcloud', 'tiktok'].map((p) => (
            <div key={p} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ width: 80, fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'capitalize' }}>{p}</span>
              <input
                type="url"
                value={form.socialLinks?.[p] || ''}
                onChange={setSocial(p)}
                placeholder={`https://${p}.com/yourstudio`}
                style={{ flex: 1 }}
              />
            </div>
          ))}
        </div>
      </div>

      <button type="submit" className="eyf-button" disabled={saving}>
        {saving ? 'Saving...' : 'Save settings'}
      </button>
    </form>
  );
}
