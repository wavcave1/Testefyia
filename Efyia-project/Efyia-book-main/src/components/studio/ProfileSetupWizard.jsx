import { useCallback, useEffect, useState } from 'react';
import { studioProfileApi } from '../../lib/api';
import FileUpload from '../efyia/FileUpload';

const STEPS = [
  {
    id: 'welcome',
    title: 'Set up your studio profile',
    description: 'Your profile is how artists find, evaluate, and book your space. Let\'s make it stand out.',
  },
  {
    id: 'identity',
    title: 'Basic information',
    description: 'The essentials clients see first on the marketplace.',
  },
  {
    id: 'logo',
    title: 'Profile picture',
    description: 'A logo or photo that represents your studio.',
  },
  {
    id: 'photos',
    title: 'Studio photos',
    description: 'Show clients what your space looks and feels like.',
  },
  {
    id: 'story',
    title: 'Your story',
    description: 'Tell clients what makes your studio unique.',
  },
  {
    id: 'services',
    title: 'Services & pricing',
    description: 'What do you offer? Add your first service.',
  },
];

const CHECKLIST_ITEMS = [
  'Studio name & location',
  'Profile picture (logo)',
  'Studio photos & gallery',
  'Bio & story',
  'Services & pricing',
];

export default function ProfileSetupWizard({ studio, onFinished, onDismiss }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: studio?.name || '',
    description: studio?.description || '',
    city: studio?.city || '',
    state: studio?.state || '',
    logoUrl: studio?.logoUrl || '',
    coverUrl: studio?.coverUrl || '',
    gallery: studio?.gallery || [],
    richDescription: studio?.richDescription || '',
    services: studio?.services?.length
      ? studio.services
      : [{ name: '', description: '', price: '', unit: 'hr' }],
  });

  // Escape key dismisses
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onDismiss(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  const set = useCallback((field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }, []);

  const setService = useCallback((idx, field) => (e) => {
    setForm((prev) => {
      const updated = [...prev.services];
      updated[idx] = { ...updated[idx], [field]: e.target.value };
      return { ...prev, services: updated };
    });
  }, []);

  const setGallery = (idx, field) => (e) => {
    setForm((prev) => {
      const updated = [...prev.gallery];
      updated[idx] = { ...updated[idx], [field]: e.target.value };
      return { ...prev, gallery: updated };
    });
  };

  const removeGallery = (idx) => {
    setForm((prev) => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== idx) }));
  };

  const canGoNext = step !== 1 || form.name.trim().length >= 2;

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      const services = form.services
        .filter((s) => s.name.trim())
        .map((s) => ({
          name: s.name,
          description: s.description || undefined,
          price: s.price !== '' && s.price != null ? parseFloat(s.price) : undefined,
          unit: s.unit || undefined,
        }));

      const gallery = form.gallery.filter((g) => g.url.trim());

      const payload = {
        name: form.name || undefined,
        description: form.description || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        logoUrl: form.logoUrl || null,
        coverUrl: form.coverUrl || null,
        richDescription: form.richDescription || undefined,
        gallery: gallery.length ? gallery : null,
        services: services.length ? services : null,
      };

      const updated = await studioProfileApi.update(payload);
      onFinished(updated);
    } catch (err) {
      setError(err.message || 'Could not save. Please try again.');
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step === STEPS.length - 1) {
      handleFinish();
    } else {
      setStep((s) => s + 1);
    }
  };

  const current = STEPS[step];
  const progressPct = step === 0 ? 0 : Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <div className="eyf-wizard-overlay" role="dialog" aria-modal="true" aria-label="Studio profile setup">
      <div className="eyf-wizard-modal">
        {/* Progress bar */}
        <div className="eyf-wizard-progress">
          <div className="eyf-wizard-progress__fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Body */}
        <div className="eyf-wizard-body">
          <p className="eyf-eyebrow" style={{ marginBottom: '0.6rem' }}>
            {step === 0 ? 'Profile setup' : `Step ${step} of ${STEPS.length - 1}`}
          </p>
          <h2 style={{ margin: '0 0 0.35rem', fontSize: 'clamp(1.4rem, 4vw, 1.75rem)' }}>{current.title}</h2>
          <p className="eyf-muted" style={{ margin: '0 0 1.75rem', lineHeight: 1.5 }}>{current.description}</p>

          {/* Step 0: Welcome */}
          {step === 0 ? (
            <div className="eyf-wizard-welcome">
              <p style={{ lineHeight: 1.65 }}>
                We'll walk you through the key sections of your profile. Each step takes about a minute.
                You can skip any step and complete it later from your dashboard.
              </p>
              <div className="eyf-wizard-checklist">
                {CHECKLIST_ITEMS.map((item) => (
                  <div key={item} className="eyf-wizard-check-item">
                    <span className="eyf-wizard-check-icon">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Step 1: Identity */}
          {step === 1 ? (
            <div className="eyf-wizard-fields">
              <label className="eyf-wizard-field">
                <span>Studio name *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. Platinum Sound Studios"
                  autoFocus
                />
              </label>
              <label className="eyf-wizard-field">
                <span>
                  Short description{' '}
                  <span className="eyf-muted" style={{ fontWeight: 400 }}>(shown on marketplace cards)</span>
                </span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={set('description')}
                  placeholder="A sentence or two about what makes your studio special..."
                />
              </label>
              <div className="eyf-grid-2">
                <label className="eyf-wizard-field">
                  <span>City</span>
                  <input type="text" value={form.city} onChange={set('city')} placeholder="Atlanta" />
                </label>
                <label className="eyf-wizard-field">
                  <span>State / Region</span>
                  <input type="text" value={form.state} onChange={set('state')} placeholder="GA" maxLength={4} />
                </label>
              </div>
            </div>
          ) : null}

          {/* Step 2: Logo */}
          {step === 2 ? (
            <div className="eyf-wizard-fields">
              <p className="eyf-muted" style={{ fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                Your logo appears on your public profile, studio card, and booking sidebar.
                Square images at least 200×200px work best.
              </p>
              <FileUpload
                value={form.logoUrl}
                onChange={(url) => setForm((prev) => ({ ...prev, logoUrl: url }))}
                type="image"
                hint="PNG or JPG — square format recommended (200×200px+)"
              />
            </div>
          ) : null}

          {/* Step 3: Photos */}
          {step === 3 ? (
            <div className="eyf-wizard-fields">
              <p className="eyf-muted" style={{ fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                Your cover image is the large hero photo shown at the top of your public studio page.
                Landscape orientation recommended (1600×600px+).
              </p>
              <FileUpload
                value={form.coverUrl}
                onChange={(url) => setForm((prev) => ({ ...prev, coverUrl: url }))}
                type="image"
                hint="Landscape format recommended (1600×600px+)"
              />

              <div>
                <div
                  className="eyf-row eyf-row--between"
                  style={{ marginBottom: '0.6rem', alignItems: 'center' }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Gallery photos{' '}
                    <span className="eyf-muted" style={{ fontWeight: 400 }}>(optional)</span>
                  </span>
                </div>

                <FileUpload
                  value={form.gallery.map((photo) => photo.url).filter(Boolean)}
                  onChange={(urls) => {
                    setForm((prev) => {
                      const existingCaptions = new Map(prev.gallery.map((item) => [item.url, item.caption || '']));
                      const gallery = urls.map((url) => ({
                        url,
                        caption: existingCaptions.get(url) || '',
                      }));
                      return { ...prev, gallery };
                    });
                  }}
                  type="image"
                  multiple
                  hint="Upload multiple gallery photos at once"
                />

                {form.gallery.length === 0 ? (
                  <p className="eyf-muted" style={{ fontSize: '0.85rem', marginTop: '0.6rem' }}>
                    Control room, live room, equipment shots — give clients a feel for the space.
                  </p>
                ) : (
                  <div style={{ marginTop: '0.7rem' }}>
                    {form.gallery.map((photo, idx) => (
                      <div
                        key={photo.url || idx}
                        style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}
                      >
                        <input
                          type="text"
                          value={photo.caption}
                          onChange={setGallery(idx, 'caption')}
                          placeholder={`Caption for photo ${idx + 1} (optional)`}
                        />
                        <button
                          type="button"
                          onClick={() => removeGallery(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.5rem', fontSize: '1.1rem' }}
                          aria-label="Remove photo"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Step 4: Story */}
          {step === 4 ? (
            <div className="eyf-wizard-fields">
              <label className="eyf-wizard-field">
                <span>Studio bio</span>
                <textarea
                  rows={10}
                  value={form.richDescription}
                  onChange={set('richDescription')}
                  placeholder="Tell your story. Describe the vibe and the gear. What kind of artists do you work with? What can clients expect when they walk through the door? What's the philosophy behind your sound?"
                  autoFocus
                />
              </label>
              <p className="eyf-char-count">{form.richDescription.length} characters</p>
            </div>
          ) : null}

          {/* Step 5: Services */}
          {step === 5 ? (
            <div className="eyf-wizard-fields">
              <p className="eyf-muted" style={{ fontSize: '0.875rem', marginTop: '-0.5rem' }}>
                Add your first service. You can add more from your dashboard at any time.
              </p>
              <div className="eyf-wizard-service-card">
                <label className="eyf-wizard-field">
                  <span>Service name</span>
                  <input
                    type="text"
                    value={form.services[0]?.name || ''}
                    onChange={setService(0, 'name')}
                    placeholder="e.g. Recording session, Mixing, Mastering"
                    autoFocus
                  />
                </label>
                <div className="eyf-grid-2">
                  <label className="eyf-wizard-field">
                    <span>Price ($)</span>
                    <input
                      type="number"
                      min="0"
                      value={form.services[0]?.price || ''}
                      onChange={setService(0, 'price')}
                      placeholder="85"
                    />
                  </label>
                  <label className="eyf-wizard-field">
                    <span>Unit</span>
                    <select value={form.services[0]?.unit || 'hr'} onChange={setService(0, 'unit')}>
                      <option value="hr">per hour</option>
                      <option value="half-day">half day</option>
                      <option value="day">per day</option>
                      <option value="project">per project</option>
                      <option value="session">per session</option>
                    </select>
                  </label>
                </div>
                <label className="eyf-wizard-field">
                  <span>
                    Description{' '}
                    <span className="eyf-muted" style={{ fontWeight: 400 }}>(optional)</span>
                  </span>
                  <textarea
                    rows={2}
                    value={form.services[0]?.description || ''}
                    onChange={setService(0, 'description')}
                    placeholder="What's included, session length, engineer availability..."
                  />
                </label>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="eyf-error-box" style={{ marginTop: '1.25rem' }}>{error}</div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="eyf-wizard-footer">
          <div>
            {step > 0 ? (
              <button
                type="button"
                className="eyf-button eyf-button--ghost"
                onClick={() => setStep((s) => s - 1)}
              >
                ← Back
              </button>
            ) : (
              <button type="button" className="eyf-button eyf-button--ghost" onClick={onDismiss}>
                Skip setup
              </button>
            )}
          </div>
          <div className="eyf-row">
            {/* Skip step (not on welcome or identity) */}
            {step > 1 && step < STEPS.length - 1 ? (
              <button
                type="button"
                className="eyf-button eyf-button--ghost"
                onClick={() => setStep((s) => s + 1)}
              >
                Skip
              </button>
            ) : null}
            {/* Skip last step */}
            {step === STEPS.length - 1 ? (
              <button
                type="button"
                className="eyf-button eyf-button--ghost"
                onClick={() => handleFinish()}
                disabled={saving}
              >
                Skip & finish
              </button>
            ) : null}
            <button
              type="button"
              className="eyf-button"
              onClick={handleNext}
              disabled={!canGoNext || saving}
            >
              {saving
                ? 'Saving...'
                : step === 0
                ? 'Get started →'
                : step === STEPS.length - 1
                ? 'Finish setup'
                : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
