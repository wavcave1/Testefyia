import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { studioProfileApi, studiosApi } from '../../lib/api';
import FileUpload from '../efyia/FileUpload';
import { FONT_PAIRINGS, LAYOUT_TYPES, buildStudioVars, FONT_URLS } from '../../lib/studioTheme';
import LayoutMinimal from './LayoutMinimal';
import LayoutHero from './LayoutHero';
import LayoutSplit from './LayoutSplit';
import LayoutGrid from './LayoutGrid';
import LayoutMagazine from './LayoutMagazine';
import LayoutCard from './LayoutCard';
import SectionOrderEditor, { DEFAULT_SECTION_ORDER } from './SectionOrderEditor';
import AvailabilityManager from './AvailabilityManager';
import '../../styles/studio.css';

const LAYOUT_COMPONENTS = {
  minimal: LayoutMinimal,
  hero: LayoutHero,
  split: LayoutSplit,
  grid: LayoutGrid,
  magazine: LayoutMagazine,
  card: LayoutCard,
};

const injectedFonts = new Set();
function injectFont(url) {
  if (!url || injectedFonts.has(url)) return;
  injectedFonts.add(url);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

// FIX: normalise a studioSpecs field value to an array for the tag input widget.
// The backend may store it as a comma-joined string; split it back out here.
function specsFieldToArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

function buildInitialForm(studio) {
  const profileLocationLabel = studio?.publicLocationLabel || studio?.displayLocation || '';
  return {
    name: studio?.name || '',
    description: studio?.description || '',
    richDescription: studio?.richDescription || '',
    logoUrl: studio?.logoUrl || '',
    coverUrl: studio?.coverUrl || '',
    accentColor: studio?.accentColor || '#62f3d4',
    themeOverride: studio?.themeOverride || '',
    fontPairing: studio?.fontPairing || 'modern',
    layoutType: studio?.layoutType || 'minimal',
    socialLinks: asObject(studio?.socialLinks),
    contactInfo: asObject(studio?.contactInfo),
    services: asArray(studio?.services),
    gallery: asArray(studio?.gallery),
    credits: asArray(studio?.credits),
    achievements: asArray(studio?.achievements),
    portfolio: asArray(studio?.portfolio),
    team: asArray(studio?.team),
    studioSpecs:
      studio?.studioSpecs && typeof studio.studioSpecs === 'object' && !Array.isArray(studio.studioSpecs)
        ? {
            consoleType: studio.studioSpecs.consoleType || '',
            // FIX: convert stored string → array for the tag input
            daws: specsFieldToArray(studio.studioSpecs.daws),
            mics: specsFieldToArray(studio.studioSpecs.mics),
            outboardGear: specsFieldToArray(studio.studioSpecs.outboardGear),
            rooms: studio.studioSpecs.rooms || '',
          }
        : { consoleType: '', daws: [], mics: [], outboardGear: [], rooms: '' },
    bookingInfo:
      studio?.bookingInfo && typeof studio.bookingInfo === 'object' && !Array.isArray(studio.bookingInfo)
        ? { minHours: '', maxHours: '', advanceNoticeDays: '', notes: '', cancellationPolicy: '', requireDeposit: false, depositPercent: '', ...studio.bookingInfo }
        : { minHours: '', maxHours: '', advanceNoticeDays: '', notes: '', cancellationPolicy: '', requireDeposit: false, depositPercent: '' },
    genres: asArray(studio?.genres),
    amenities: asArray(studio?.amenities),
    testimonials: asArray(studio?.testimonials),
    sessionTypes: asArray(studio?.sessionTypes),
    addressLine1: studio?.addressLine1 || '',
    addressLine2: studio?.addressLine2 || '',
    city: studio?.city || '',
    state: studio?.state || '',
    postalCode: studio?.postalCode || '',
    country: studio?.country || '',
    displayLocation: profileLocationLabel,
    publicLocationLabel: profileLocationLabel,
    arrivalInstructions: studio?.arrivalInstructions || studio?.directions || '',
    latitude: studio?.latitude ?? studio?.lat ?? '',
    longitude: studio?.longitude ?? studio?.lng ?? '',
    sectionOrder: Array.isArray(studio?.sectionOrder) && studio.sectionOrder.length
      ? studio.sectionOrder
      : [...DEFAULT_SECTION_ORDER],
    hiddenSections: Array.isArray(studio?.hiddenSections) ? studio.hiddenSections : [],
  };
}

// ─── TagInput ─────────────────────────────────────────────────────────────────
function TagInput({ value = [], onChange, placeholder = 'Type and press Enter...', suggestions = [] }) {
  const [inputValue, setInputValue] = useState('');
  const safeValue = Array.isArray(value) ? value : [];

  const addTag = (tag) => {
    const trimmed = tag.trim().replace(/,$/, '').trim();
    if (trimmed && !safeValue.includes(trimmed)) {
      onChange([...safeValue, trimmed]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && safeValue.length) {
      onChange(safeValue.slice(0, -1));
    }
  };

  const removeTag = (tag) => onChange(safeValue.filter((v) => v !== tag));

  return (
    <div>
      <div className="eyf-tag-input" onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
        {safeValue.map((tag) => (
          <span key={tag} className="eyf-tag-chip">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>×</button>
          </span>
        ))}
        <input
          type="text"
          className="eyf-tag-input__field"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
          placeholder={safeValue.length ? '' : placeholder}
        />
      </div>
      {suggestions.length > 0 ? (
        <div className="eyf-tags" style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {suggestions.filter((s) => !safeValue.includes(s)).slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              className="eyf-chip"
              onClick={() => onChange([...safeValue, s])}
              style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FieldGroup({ label, children, hint }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.875rem' }}>
        {label}
      </label>
      {children}
      {hint ? <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.4 }}>{hint}</p> : null}
    </div>
  );
}

function ArrayItemCard({ label, onRemove, children }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', marginBottom: '1rem', background: 'var(--card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <strong style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</strong>
        <button
          type="button"
          onClick={onRemove}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: '0.1rem 0.3rem' }}
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

function SectionDivider({ title }) {
  return (
    <h4 style={{ margin: '1.75rem 0 1rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
      {title}
    </h4>
  );
}

const GENRE_SUGGESTIONS = [
  'Hip-Hop', 'R&B', 'Pop', 'Rock', 'Gospel', 'Country', 'Electronic', 'Jazz', 'Soul',
  'Reggae', 'Latin', 'Podcast', 'Film/TV', 'Beat Production', 'Indie', 'Alternative',
  'Classical', 'Metal', 'Funk', 'House', 'Trap',
];

const AMENITY_SUGGESTIONS = [
  'Parking', 'Lounge', 'Refreshments', 'Wi-Fi', 'Isolation booth', 'Live room',
  'Control room', 'ADA accessible', 'Video monitoring', 'Live streaming', 'Lodging nearby',
  '24/7 access', 'Vocal booth', 'Drum kit', 'Grand piano',
];

const TABS = [
  { id: 'branding', label: 'Branding' },
  { id: 'layout', label: 'Layout' },
  { id: 'sections', label: 'Sections' },
  { id: 'content', label: 'Content' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'services', label: 'Services' },
  { id: 'credits', label: 'Credits' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'team', label: 'Team & Specs' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'contact', label: 'Contact' },
  { id: 'availability', label: 'Availability' },
];

export default function ProfileCustomizer({ studio: initialStudio, onSaved, initialTab }) {
  const [form, setForm] = useState(() => buildInitialForm(initialStudio));
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || 'branding');
  const saveTimerRef = useRef(null);
  const tabsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialStudio?.id) {
      setForm(buildInitialForm(initialStudio));
    }
  }, [initialStudio?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const url = FONT_URLS[form.fontPairing];
    if (url) injectFont(url);
  }, [form.fontPairing]);

  const syncTabScrollState = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < maxLeft - 2);
  }, []);

  useEffect(() => {
    syncTabScrollState();
    const onResize = () => syncTabScrollState();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncTabScrollState, form.layoutType, showPreview]);

  const scrollTabs = useCallback((direction) => {
    const el = tabsRef.current;
    if (!el) return;
    const amount = Math.max(180, Math.floor(el.clientWidth * 0.45));
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
    window.setTimeout(syncTabScrollState, 180);
  }, [syncTabScrollState]);

  const set = useCallback((field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSaveState('idle');
  }, []);

  const setSocial = useCallback((field) => (e) => {
    setForm((prev) => ({ ...prev, socialLinks: { ...prev.socialLinks, [field]: e.target.value } }));
    setSaveState('idle');
  }, []);

  const setContact = useCallback((field) => (e) => {
    setForm((prev) => ({ ...prev, contactInfo: { ...prev.contactInfo, [field]: e.target.value } }));
    setSaveState('idle');
  }, []);

  const setSpecs = useCallback((field) => (e) => {
    setForm((prev) => ({ ...prev, studioSpecs: { ...prev.studioSpecs, [field]: e.target.value } }));
    setSaveState('idle');
  }, []);

  const setBookingInfo = useCallback((field) => (e) => {
    setForm((prev) => ({ ...prev, bookingInfo: { ...prev.bookingInfo, [field]: e.target.value } }));
    setSaveState('idle');
  }, []);

  const toggleRequireDeposit = () => {
    const newValue = !form.bookingInfo.requireDeposit;
    setForm((prev) => ({
      ...prev,
      bookingInfo: { ...prev.bookingInfo, requireDeposit: newValue },
    }));
    setSaveState('idle');
  };

  const setTagField = useCallback((field) => (tags) => {
    setForm((prev) => ({ ...prev, [field]: Array.isArray(tags) ? tags : [] }));
    setSaveState('idle');
  }, []);

  // ─── Services ───────────────────────────────────────────────────────────────
  const addService = () => {
    setForm((prev) => ({ ...prev, services: [...asArray(prev.services), { name: '', description: '', price: '', unit: 'hr' }] }));
    setSaveState('idle');
  };
  const removeService = (idx) => {
    setForm((prev) => ({ ...prev, services: asArray(prev.services).filter((_, i) => i !== idx) }));
    setSaveState('idle');
  };
  const setService = (idx, field) => (e) => {
    setForm((prev) => {
      const updated = [...asArray(prev.services)];
      updated[idx] = { ...updated[idx], [field]: e.target.value };
      return { ...prev, services: updated };
    });
    setSaveState('idle');
  };

  // ─── Gallery ────────────────────────────────────────────────────────────────
  const addGallery = () => {
    setForm((prev) => ({ ...prev, gallery: [...asArray(prev.gallery), { url: '', caption: '' }] }));
    setSaveState('idle');
  };
  const removeGallery = (idx) => {
    setForm((prev) => ({ ...prev, gallery: asArray(prev.gallery).filter((_, i) => i !== idx) }));
    setSaveState('idle');
  };
  const setGallery = (idx, field) => (e) => {
    setForm((prev) => {
      const updated = [...asArray(prev.gallery)];
      updated[idx] = { ...updated[idx], [field]: e.target.value };
      return { ...prev, gallery: updated };
    });
    setSaveState('idle');
  };

  // ─── Credits ────────────────────────────────────────────────────────────────
  const addCredit = () => {
    setForm((prev) => ({ ...prev, credits: [...asArray(prev.credits), { artistName: '', projectName: '', role: '', year: '', link: '' }] }));
    setSaveState('idle');
  };
  const removeCredit = (idx) => {
    setForm((prev) => ({ ...prev, credits: asArray(prev.credits).filter((_, i) => i !== idx) }));
    setSaveState('idle');
  };
  const setCredit = (idx, field) => (e) => {
    setForm((prev) => {
      const updated = [...asArray(prev.credits)];
      updated[idx] = { ...updated[idx], [field]: e.target.value };
      return { ...prev, credits: updated };
    });
    setSaveState('idle');
  };

  // ─── Achievements ───────────────────────────────────────────────────────────
  const addAchievement = () => {
    setForm((prev) => ({ ...prev, achievements: [...asArray(prev.achievements), { title: '', org: '', year: '' }] }));
    setSaveState('idle');
  };
  const removeAchievement = (idx) => {
    setForm((prev) => ({ ...prev, achievements: asArray(prev.achievements).filter((_, i) => i !== idx) }));
    setSaveState('idle');
  };
  const setAchievement = (idx, field) => (e) => {
    setForm((prev) => {
      const updated = [...asArray(prev.achievements)];
      updated[idx] = { ...updated[idx], [field]: e.target.value };
      return { ...prev, achievements: updated };
    });
    setSaveState('idle');
  };

  // ─── Portfolio ────────────────────────────────────────────────────────────
  const addPortfolio = () => {
    setForm((prev) => ({ ...prev, portfolio: [...asArray(prev.portfolio), { title: '', artistName: '', trackName: '', serviceType: '', embedUrl: '', audioUrl: '' }] }));
    setSaveState('idle');
  };
  const removePortfolio = (idx) => {
    setForm((prev) => ({ ...prev, portfolio: asArray(prev.portfolio).filter((_, i) => i !== idx) }));
    setSaveState('idle');
  };
  const setPortfolio = (idx, field) => (e) => {
    setForm((prev) => {
      const updated = [...asArray(prev.portfolio)];
      updated[idx] = { ...updated[idx], [field]: e.target.value };
      return { ...prev, portfolio: updated };
    });
    setSaveState('idle');
  };

  // ─── Team ────────────────────────────────────────────────────────────────────
  const addTeamMember = () => {
    setForm((prev) => ({ ...prev, team: [...asArray(prev.team), { name: '', role: '', bio: '', photoUrl: '' }] }));
    setSaveState('idle');
  };
  const removeTeamMember = (idx) => {
    setForm((prev) => ({ ...prev, team: asArray(prev.team).filter((_, i) => i !== idx) }));
    setSaveState('idle');
  };
  const setTeamMember = (idx, field) => (e) => {
    setForm((prev) => {
      const updated = [...asArray(prev.team)];
      updated[idx] = { ...updated[idx], [field]: e.target.value };
      return { ...prev, team: updated };
    });
    setSaveState('idle');
  };

  // ─── Testimonials ────────────────────────────────────────────────────────────
  const addTestimonial = () => {
    setForm((prev) => ({ ...prev, testimonials: [...asArray(prev.testimonials), { quote: '', authorName: '', authorRole: '' }] }));
    setSaveState('idle');
  };
  const removeTestimonial = (idx) => {
    setForm((prev) => ({ ...prev, testimonials: asArray(prev.testimonials).filter((_, i) => i !== idx) }));
    setSaveState('idle');
  };
  const setTestimonial = (idx, field) => (e) => {
    setForm((prev) => {
      const updated = [...asArray(prev.testimonials)];
      updated[idx] = { ...updated[idx], [field]: e.target.value };
      return { ...prev, testimonials: updated };
    });
    setSaveState('idle');
  };

  // ─── Save ────────────────────────────────────────────────────────────────────
  // FIX: keep studioSpecs fields as arrays — the backend schema now accepts them directly.
  // Only clean out empty/null values so Prisma doesn't choke.
  function normalizeStudioSpecs(specs) {
    if (!specs) return null;
    const cleaned = {
      consoleType: specs.consoleType || null,
      // Keep arrays as-is; backend transforms them to strings
      daws: Array.isArray(specs.daws) ? specs.daws : (specs.daws || null),
      mics: Array.isArray(specs.mics) ? specs.mics : (specs.mics || null),
      outboardGear: Array.isArray(specs.outboardGear) ? specs.outboardGear : (specs.outboardGear || null),
      rooms: specs.rooms || null,
    };
    // Return null if there's nothing useful
    const hasValue = cleaned.consoleType
      || (Array.isArray(cleaned.daws) ? cleaned.daws.length : cleaned.daws)
      || (Array.isArray(cleaned.mics) ? cleaned.mics.length : cleaned.mics)
      || (Array.isArray(cleaned.outboardGear) ? cleaned.outboardGear.length : cleaned.outboardGear)
      || cleaned.rooms;
    return hasValue ? cleaned : null;
  }

  function normalizeBookingInfo(info) {
    if (!info) return null;
    const toNum = (v) => (v !== '' && v != null && !isNaN(Number(v))) ? Number(v) : null;
    const cleaned = {
      minHours: toNum(info.minHours),
      maxHours: toNum(info.maxHours),
      advanceNoticeDays: toNum(info.advanceNoticeDays),
      notes: info.notes || null,
      cancellationPolicy: info.cancellationPolicy || null,
      requireDeposit: info.requireDeposit === true ? true : false,
      depositPercent: info.requireDeposit === true ? toNum(info.depositPercent) : null,
    };
    const hasBookingInfo = cleaned.minHours !== null
      || cleaned.maxHours !== null
      || cleaned.advanceNoticeDays !== null
      || cleaned.notes !== null
      || cleaned.cancellationPolicy !== null
      || cleaned.requireDeposit === true;
    console.log('normalizeBookingInfo input:', info);
    console.log('normalizeBookingInfo cleaned:', cleaned);
    console.log('normalizeBookingInfo hasBookingInfo:', hasBookingInfo);
    return hasBookingInfo ? cleaned : null;
  }

  function normalizeOptionalNumber(value) {
    if (value === '' || value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const handleSave = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState('saving');
    setSaveError(null);

    try {
      const services = asArray(form.services)
        .filter((s) => (s?.name || '').trim())
        .map((s) => ({
          name: s.name,
          description: s.description || undefined,
          price: s.price !== '' && s.price != null ? parseFloat(s.price) : undefined,
          unit: s.unit || undefined,
        }));

      const gallery = asArray(form.gallery).filter((g) => (g?.url || '').trim());
      const credits = asArray(form.credits).filter((c) => (c?.artistName || '').trim());
      const achievements = asArray(form.achievements).filter((a) => (a?.title || '').trim());
      const portfolio = asArray(form.portfolio).filter((p) => p?.embedUrl?.trim() || p?.audioUrl?.trim() || (p?.title || '').trim());
      const team = asArray(form.team).filter((t) => (t?.name || '').trim());
      const testimonials = asArray(form.testimonials).filter((t) => (t?.quote || '').trim());

      const payload = {
        ...form,
        themeOverride: form.themeOverride || null,
        logoUrl: form.logoUrl || null,
        coverUrl: form.coverUrl || null,
        services,
        socialLinks: Object.values(form.socialLinks || {}).some(Boolean) ? form.socialLinks : null,
        contactInfo: Object.values(form.contactInfo || {}).some(Boolean) ? form.contactInfo : null,
        gallery,
        credits,
        achievements,
        portfolio,
        team,
        testimonials,
        genres: Array.isArray(form.genres) ? form.genres : [],
        amenities: Array.isArray(form.amenities) ? form.amenities : [],
        studioSpecs: normalizeStudioSpecs(form.studioSpecs),
        bookingInfo: normalizeBookingInfo(form.bookingInfo),
        addressLine1: form.addressLine1?.trim() || null,
        addressLine2: form.addressLine2?.trim() || null,
        city: form.city?.trim() || null,
        state: form.state?.trim() || null,
        postalCode: form.postalCode?.trim() || null,
        country: form.country?.trim() || null,
        displayLocation: form.displayLocation?.trim() || form.publicLocationLabel?.trim() || null,
        publicLocationLabel: form.publicLocationLabel?.trim() || form.displayLocation?.trim() || null,
        arrivalInstructions: form.arrivalInstructions?.trim() || null,
        directions: form.arrivalInstructions?.trim() || null,
        latitude: normalizeOptionalNumber(form.latitude),
        longitude: normalizeOptionalNumber(form.longitude),
        sectionOrder: Array.isArray(form.sectionOrder) ? form.sectionOrder : DEFAULT_SECTION_ORDER,
        hiddenSections: Array.isArray(form.hiddenSections) && form.hiddenSections.length ? form.hiddenSections : null,
      };

      // Remove sessionTypes from the profile payload — it's saved via studiosApi below
      const { sessionTypes: _sessionTypes, ...profilePayload } = payload;

      let updated = await studioProfileApi.update(profilePayload, initialStudio?.id);

      // sessionTypes lives on the Studio model, not the profile endpoint
      if (initialStudio?.id) {
        const sessionTypes = Array.isArray(form.sessionTypes) ? form.sessionTypes : [];
        // FIX: also save amenities here in case the profile endpoint strips them
        const withExtras = await studiosApi.update(initialStudio.id, { sessionTypes });
        updated = { ...updated, sessionTypes: withExtras.sessionTypes };
      }

      setSaveState('saved');
      saveTimerRef.current = setTimeout(() => setSaveState('idle'), 3000);
      if (onSaved) onSaved(updated);
    } catch (err) {
      setSaveState('error');
      const detail = err.details
        ? ' — ' + (Array.isArray(err.details) ? err.details.map((d) => d.message || d).join(', ') : String(err.details))
        : '';
      setSaveError((err.message || 'Could not save profile.') + detail);
    }
  };

  const previewStudio = {
    ...initialStudio,
    ...form,
    services: asArray(form.services)
      .filter((s) => (s?.name || '').trim())
      .map((s) => ({ ...s, price: s.price !== '' ? parseFloat(s.price) : undefined })),
    sectionOrder: Array.isArray(form.sectionOrder) && form.sectionOrder.length
      ? form.sectionOrder
      : [...DEFAULT_SECTION_ORDER],
    hiddenSections: Array.isArray(form.hiddenSections) ? form.hiddenSections : [],
  };

  const PreviewLayout = LAYOUT_COMPONENTS[form.layoutType] || LayoutMinimal;
  const previewVars = buildStudioVars(previewStudio);
  const previewHiddenSet = new Set(previewStudio.hiddenSections);

  return (
    <div>
      {/* Tab bar */}
      <div className="eyf-tab-scroll-wrap" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          className="eyf-tab-scroll-nav eyf-tab-scroll-nav--left"
          aria-label="Scroll tabs left"
          disabled={!canScrollLeft}
          onClick={() => scrollTabs(-1)}
        >
          ‹
        </button>
        <div
          ref={tabsRef}
          className="eyf-tabs eyf-tabs--scroll"
          style={{ borderBottom: '1px solid var(--border)', gap: '0' }}
          onScroll={syncTabScrollState}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.5rem 0.9rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--mint)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 700 : 400,
                fontSize: '0.875rem',
                paddingBottom: '0.65rem',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="eyf-tab-scroll-nav eyf-tab-scroll-nav--right"
          aria-label="Scroll tabs right"
          disabled={!canScrollRight}
          onClick={() => scrollTabs(1)}
        >
          ›
        </button>
      </div>

      {/* ── Branding tab ────────────────────────────────────────────────────── */}
      {activeTab === 'branding' ? (
        <div>
          <FieldGroup label="Accent color">
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="color"
                value={form.accentColor}
                onChange={set('accentColor')}
                style={{ width: 44, height: 44, border: 'none', cursor: 'pointer', borderRadius: 6, background: 'none', padding: 0 }}
              />
              <input
                type="text"
                value={form.accentColor}
                onChange={set('accentColor')}
                placeholder="#62f3d4"
                maxLength={7}
                style={{ width: '100px' }}
              />
            </div>
          </FieldGroup>

          <FieldGroup label="Logo" hint="Square images (200×200px+) work best.">
            <FileUpload
              value={form.logoUrl}
              onChange={(url) => { setForm((prev) => ({ ...prev, logoUrl: url })); setSaveState('idle'); }}
              type="image"
              hint="PNG or JPG — square format recommended"
            />
            {form.logoUrl ? (
              <img
                src={form.logoUrl}
                alt="Logo preview"
                style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain', marginTop: '0.5rem', display: 'block' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : null}
          </FieldGroup>

          <FieldGroup label="Cover image" hint="Used as the hero/header image on your public studio page.">
            <FileUpload
              value={form.coverUrl}
              onChange={(url) => { setForm((prev) => ({ ...prev, coverUrl: url })); setSaveState('idle'); }}
              type="image"
              hint="Landscape orientation recommended (1600×600px+)"
            />
            {form.coverUrl ? (
              <div
                style={{
                  marginTop: '0.5rem',
                  height: 100,
                  borderRadius: 8,
                  backgroundImage: `url(${form.coverUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid var(--border)',
                }}
              />
            ) : null}
          </FieldGroup>

          <FieldGroup label="Page theme override">
            <select value={form.themeOverride} onChange={set('themeOverride')}>
              <option value="">Follow visitor preference</option>
              <option value="dark">Always dark</option>
              <option value="light">Always light</option>
            </select>
          </FieldGroup>
        </div>
      ) : null}

      {/* ── Layout tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'layout' ? (
        <div>
          <FieldGroup label="Layout template">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {Object.entries(LAYOUT_TYPES).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setForm((prev) => ({ ...prev, layoutType: key })); setSaveState('idle'); }}
                  style={{
                    padding: '1rem',
                    borderRadius: 10,
                    border: `2px solid ${form.layoutType === key ? form.accentColor : 'var(--border)'}`,
                    background: form.layoutType === key ? `${form.accentColor}18` : 'var(--card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{cfg.preview}</div>
                  <strong style={{ fontSize: '0.9rem' }}>{cfg.label}</strong>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>{cfg.description}</p>
                </button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="Font pairing">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(FONT_PAIRINGS).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setForm((prev) => ({ ...prev, fontPairing: key })); setSaveState('idle'); }}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 8,
                    border: `2px solid ${form.fontPairing === key ? form.accentColor : 'var(--border)'}`,
                    background: form.fontPairing === key ? `${form.accentColor}18` : 'var(--card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: cfg.headingFamily,
                  }}
                >
                  <strong style={{ fontSize: '0.95rem' }}>{cfg.label}</strong>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>
                    — {cfg.description}
                  </span>
                </button>
              ))}
            </div>
          </FieldGroup>
        </div>
      ) : null}

      {/* ── Sections tab ────────────────────────────────────────────────────── */}
      {activeTab === 'sections' ? (
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Drag sections to reorder them on your public page. Click the eye icon to show or hide a section.
          </p>
          <SectionOrderEditor
            sections={form.sectionOrder}
            hidden={form.hiddenSections}
            onChange={(newOrder, newHidden) => {
              setForm((prev) => ({ ...prev, sectionOrder: newOrder, hiddenSections: newHidden }));
              setSaveState('idle');
            }}
          />
        </div>
      ) : null}

      {/* ── Content tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'content' ? (
        <div>
          <FieldGroup label="Studio name">
            <input type="text" value={form.name} onChange={set('name')} />
          </FieldGroup>
          <FieldGroup label="Short description" hint="Shown on marketplace cards and search results (1–2 sentences).">
            <textarea rows={3} value={form.description} onChange={set('description')} />
          </FieldGroup>
          <FieldGroup label="Rich description / bio" hint="Full text shown on your public studio page. Supports line breaks.">
            <textarea
              rows={10}
              value={form.richDescription}
              onChange={set('richDescription')}
              placeholder="Tell your story, describe the vibe, list what makes your space special..."
            />
          </FieldGroup>
        </div>
      ) : null}

      {/* ── Gallery tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'gallery' ? (
        <div>
          <p className="eyf-muted" style={{ fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Add photos of your studio space — control room, live room, isolation booth, equipment, vibe.
          </p>
          {asArray(form.gallery).map((item, idx) => (
            <ArrayItemCard key={idx} label={`Photo ${idx + 1}`} onRemove={() => removeGallery(idx)}>
              <FieldGroup label="Photo">
                <FileUpload
                  value={item.url}
                  onChange={(url) => {
                    setForm((prev) => {
                      const updated = [...asArray(prev.gallery)];
                      updated[idx] = { ...updated[idx], url };
                      return { ...prev, gallery: updated };
                    });
                    setSaveState('idle');
                  }}
                  type="image"
                  hint="Control room, live room, equipment, vibe"
                />
              </FieldGroup>
              <FieldGroup label="Caption (optional)">
                <input type="text" value={item.caption} onChange={setGallery(idx, 'caption')} placeholder="e.g. Control room — SSL 4000 G console" />
              </FieldGroup>
            </ArrayItemCard>
          ))}
          <button type="button" className="eyf-button eyf-button--secondary" onClick={addGallery} style={{ width: '100%' }}>
            + Add photo
          </button>
        </div>
      ) : null}

      {/* ── Services tab ────────────────────────────────────────────────────── */}
      {activeTab === 'services' ? (
        <div>
          {asArray(form.services).map((svc, idx) => (
            <ArrayItemCard key={idx} label={`Service ${idx + 1}`} onRemove={() => removeService(idx)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Name *</label>
                  <input value={svc.name} onChange={setService(idx, 'name')} placeholder="e.g. Recording session" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Price ($)</label>
                    <input type="number" min="0" value={svc.price} onChange={setService(idx, 'price')} placeholder="85" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Unit</label>
                    <select value={svc.unit} onChange={setService(idx, 'unit')}>
                      <option value="hr">per hour</option>
                      <option value="half-day">half day</option>
                      <option value="day">per day</option>
                      <option value="project">per project</option>
                      <option value="session">per session</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Description</label>
                <textarea rows={2} value={svc.description} onChange={setService(idx, 'description')} placeholder="What's included, session length, engineer availability..." />
              </div>
            </ArrayItemCard>
          ))}
          <button type="button" className="eyf-button eyf-button--secondary" onClick={addService} style={{ width: '100%' }}>
            + Add service
          </button>
        </div>
      ) : null}

      {/* ── Credits tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'credits' ? (
        <div>
          <p className="eyf-muted" style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Artists, albums, films, or projects your studio has worked on.
          </p>
          {asArray(form.credits).map((credit, idx) => (
            <ArrayItemCard key={idx} label={`Credit ${idx + 1}`} onRemove={() => removeCredit(idx)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Artist / Client *</label>
                  <input value={credit.artistName} onChange={setCredit(idx, 'artistName')} placeholder="Drake, Taylor Swift..." />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Project name</label>
                  <input value={credit.projectName} onChange={setCredit(idx, 'projectName')} placeholder="Album, EP, Film title..." />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Role</label>
                  <input value={credit.role} onChange={setCredit(idx, 'role')} placeholder="Recorded at, Mixed at..." />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Year</label>
                  <input type="number" min="1900" max="2099" value={credit.year} onChange={setCredit(idx, 'year')} placeholder="2024" />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Link (optional)</label>
                <input type="url" value={credit.link} onChange={setCredit(idx, 'link')} placeholder="Spotify, Apple Music, YouTube..." />
              </div>
            </ArrayItemCard>
          ))}
          <button type="button" className="eyf-button eyf-button--secondary" onClick={addCredit} style={{ width: '100%' }}>
            + Add credit
          </button>
        </div>
      ) : null}

      {/* ── Portfolio tab ────────────────────────────────────────────────────── */}
      {activeTab === 'portfolio' ? (
        <div>
          <SectionDivider title="Audio & Video samples" />
          <p className="eyf-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
            YouTube, SoundCloud, or Spotify embed URLs. For YouTube: use the embed URL format
            (youtube.com/embed/VIDEO_ID).
          </p>
          {asArray(form.portfolio).map((item, idx) => (
            <ArrayItemCard key={idx} label={`Sample ${idx + 1}`} onRemove={() => removePortfolio(idx)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Title</label>
                  <input value={item.title} onChange={setPortfolio(idx, 'title')} placeholder="Before/After Mix Demo" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Artist name</label>
                  <input value={item.artistName} onChange={setPortfolio(idx, 'artistName')} placeholder="Artist" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Track name</label>
                  <input value={item.trackName} onChange={setPortfolio(idx, 'trackName')} placeholder="Track title" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Service type</label>
                  <input value={item.serviceType} onChange={setPortfolio(idx, 'serviceType')} placeholder="Mixing, Mastering..." />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Embed URL (YouTube / SoundCloud)</label>
                <input type="url" value={item.embedUrl} onChange={setPortfolio(idx, 'embedUrl')} placeholder="https://www.youtube.com/watch?v=..." />
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>— or upload audio file —</label>
                <FileUpload
                  value={item.audioUrl || ''}
                  onChange={(url) => {
                    setForm((prev) => {
                      const updated = [...asArray(prev.portfolio)];
                      updated[idx] = { ...updated[idx], audioUrl: url };
                      return { ...prev, portfolio: updated };
                    });
                    setSaveState('idle');
                  }}
                  type="audio"
                  hint="MP3, WAV, AAC — direct track upload"
                />
              </div>
            </ArrayItemCard>
          ))}
          <button type="button" className="eyf-button eyf-button--secondary" onClick={addPortfolio} style={{ width: '100%', marginBottom: '1.5rem' }}>
            + Add sample
          </button>

          <SectionDivider title="Achievements & Awards" />
          <p className="eyf-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
            Certifications, press features, industry recognitions.
          </p>
          {asArray(form.achievements).map((item, idx) => (
            <ArrayItemCard key={idx} label={`Achievement ${idx + 1}`} onRemove={() => removeAchievement(idx)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Title / Award *</label>
                  <input value={item.title} onChange={setAchievement(idx, 'title')} placeholder="Grammy Nominated Studio" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Organization / Publication</label>
                  <input value={item.org} onChange={setAchievement(idx, 'org')} placeholder="Recording Academy" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Year</label>
                  <input type="number" min="1900" max="2099" value={item.year} onChange={setAchievement(idx, 'year')} placeholder="2023" />
                </div>
              </div>
            </ArrayItemCard>
          ))}
          <button type="button" className="eyf-button eyf-button--secondary" onClick={addAchievement} style={{ width: '100%' }}>
            + Add achievement
          </button>
        </div>
      ) : null}

      {/* ── Team & Specs tab ─────────────────────────────────────────────────── */}
      {activeTab === 'team' ? (
        <div>
          <SectionDivider title="Team members" />
          {asArray(form.team).map((member, idx) => (
            <ArrayItemCard key={idx} label={member.name || `Member ${idx + 1}`} onRemove={() => removeTeamMember(idx)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Name *</label>
                  <input value={member.name} onChange={setTeamMember(idx, 'name')} placeholder="Alex Johnson" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Role</label>
                  <input value={member.role} onChange={setTeamMember(idx, 'role')} placeholder="Lead Engineer, Producer..." />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Bio (optional)</label>
                <textarea rows={2} value={member.bio} onChange={setTeamMember(idx, 'bio')} placeholder="Short bio about their background and specialty..." />
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>Photo (optional)</label>
                <FileUpload
                  value={member.photoUrl}
                  onChange={(url) => {
                    setForm((prev) => {
                      const updated = [...asArray(prev.team)];
                      updated[idx] = { ...updated[idx], photoUrl: url };
                      return { ...prev, team: updated };
                    });
                    setSaveState('idle');
                  }}
                  type="image"
                  hint="Headshot or professional photo"
                />
              </div>
            </ArrayItemCard>
          ))}
          <button type="button" className="eyf-button eyf-button--secondary" onClick={addTeamMember} style={{ width: '100%', marginBottom: '1.5rem' }}>
            + Add team member
          </button>

          <SectionDivider title="Studio specs" />
          <FieldGroup label="Console / Desk" hint="e.g. SSL 4000 G+, Neve 8078, In The Box">
            <input type="text" value={form.studioSpecs.consoleType || ''} onChange={setSpecs('consoleType')} placeholder="SSL 4000 G+" />
          </FieldGroup>
          <FieldGroup label="DAWs available" hint="Type and press Enter to add each">
            <TagInput
              value={asArray(form.studioSpecs.daws)}
              onChange={(tags) => {
                setForm((prev) => ({ ...prev, studioSpecs: { ...prev.studioSpecs, daws: tags } }));
                setSaveState('idle');
              }}
              placeholder="Pro Tools, Logic Pro, Ableton..."
              suggestions={['Pro Tools', 'Logic Pro', 'Ableton Live', 'FL Studio', 'Cubase', 'Studio One', 'Reason']}
            />
          </FieldGroup>
          <FieldGroup label="Notable microphones">
            <TagInput
              value={asArray(form.studioSpecs.mics)}
              onChange={(tags) => {
                setForm((prev) => ({ ...prev, studioSpecs: { ...prev.studioSpecs, mics: tags } }));
                setSaveState('idle');
              }}
              placeholder="Neumann U87, AKG C414..."
            />
          </FieldGroup>
          <FieldGroup label="Outboard gear">
            <TagInput
              value={asArray(form.studioSpecs.outboardGear)}
              onChange={(tags) => {
                setForm((prev) => ({ ...prev, studioSpecs: { ...prev.studioSpecs, outboardGear: tags } }));
                setSaveState('idle');
              }}
              placeholder="API 2500, Neve 33609, Distressor..."
            />
          </FieldGroup>
          <FieldGroup label="Studio rooms / description">
            <textarea
              rows={3}
              value={form.studioSpecs.rooms || ''}
              onChange={setSpecs('rooms')}
              placeholder="Control room (18×14ft), Live room (24×20ft, 14ft ceilings), Isolation booth (8×6ft)"
            />
          </FieldGroup>

          <SectionDivider title="Booking & availability" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <FieldGroup label="Min. session (hours)">
              <input type="number" min="0" value={form.bookingInfo.minHours || ''} onChange={setBookingInfo('minHours')} placeholder="2" />
            </FieldGroup>
            <FieldGroup label="Max. session (hours)">
              <input type="number" min="0" value={form.bookingInfo.maxHours || ''} onChange={setBookingInfo('maxHours')} placeholder="12" />
            </FieldGroup>
          </div>
          <FieldGroup label="Advance notice required (days)">
            <input type="number" min="0" value={form.bookingInfo.advanceNoticeDays || ''} onChange={setBookingInfo('advanceNoticeDays')} placeholder="1" />
          </FieldGroup>
          <FieldGroup label="Availability notes / deposit policy">
            <textarea
              rows={3}
              value={form.bookingInfo.notes || ''}
              onChange={setBookingInfo('notes')}
              placeholder="Available Mon–Sat 10am–2am. 50% deposit required to confirm. 48hr cancellation policy."
            />
          </FieldGroup>

          <SectionDivider title="Deposit Policy" />
          <FieldGroup>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="require-deposit"
                checked={form.bookingInfo.requireDeposit === true}
                onChange={toggleRequireDeposit}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <label htmlFor="require-deposit" style={{ cursor: 'pointer', flex: 1, margin: 0 }}>
                Require a deposit to confirm bookings
              </label>
            </div>
          </FieldGroup>

          {form.bookingInfo.requireDeposit && (
            <FieldGroup
              label="Deposit percentage"
              hint="Clients will pay this percentage upfront. You request the remaining balance when ready."
            >
              <input
                type="number"
                min="10"
                max="100"
                step="5"
                value={form.bookingInfo.depositPercent || 50}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    bookingInfo: { ...prev.bookingInfo, depositPercent: e.target.value },
                  }));
                  setSaveState('idle');
                }}
                placeholder="50"
              />
            </FieldGroup>
          )}
          
         <FieldGroup
  label="Cancellation policy"
  hint="Clients will be shown this and must agree before completing a booking."
>
  <textarea
    rows={5}
    value={form.bookingInfo.cancellationPolicy || ''}
    onChange={setBookingInfo('cancellationPolicy')}
    placeholder={
      "e.g. Cancellations made 48+ hours before the session receive a full refund. " +
      "Cancellations within 24 hours of the session are non-refundable. " +
      "No-shows will be charged 100% of the session fee."
    }
  />
</FieldGroup> 
        </div>
      ) : null}

      {/* ── Discovery tab ────────────────────────────────────────────────────── */}
      {activeTab === 'discovery' ? (
        <div>
          <SectionDivider title="Genre specializations" />
          <div style={{ marginBottom: '1.5rem' }}>
            <TagInput
              value={form.genres}
              onChange={setTagField('genres')}
              placeholder="Hip-Hop, R&B, Pop..."
              suggestions={GENRE_SUGGESTIONS}
            />
          </div>

          <SectionDivider title="Session types" />
          <p className="eyf-muted" style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            What kinds of sessions can clients book? These appear in the booking form.
          </p>
          <div style={{ marginBottom: '1.5rem' }}>
            <TagInput
              value={form.sessionTypes}
              onChange={setTagField('sessionTypes')}
              placeholder="Recording, Mixing, Mastering..."
            />
          </div>

          <SectionDivider title="Amenities" />
          <div style={{ marginBottom: '1.5rem' }}>
            <TagInput
              value={form.amenities}
              onChange={setTagField('amenities')}
              placeholder="Parking, Lounge, Wi-Fi..."
              suggestions={AMENITY_SUGGESTIONS}
            />
          </div>

          <SectionDivider title="Client testimonials" />
          {asArray(form.testimonials).map((item, idx) => (
            <ArrayItemCard key={idx} label={item.authorName || `Testimonial ${idx + 1}`} onRemove={() => removeTestimonial(idx)}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Quote *</label>
                <textarea rows={3} value={item.quote} onChange={setTestimonial(idx, 'quote')} placeholder='"Working at this studio was a game-changer..."' />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Client name</label>
                  <input value={item.authorName} onChange={setTestimonial(idx, 'authorName')} placeholder="Alex M." />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Role / description</label>
                  <input value={item.authorRole} onChange={setTestimonial(idx, 'authorRole')} placeholder="Independent artist, Atlanta GA" />
                </div>
              </div>
            </ArrayItemCard>
          ))}
          <button type="button" className="eyf-button eyf-button--secondary" onClick={addTestimonial} style={{ width: '100%' }}>
            + Add testimonial
          </button>
        </div>
      ) : null}

      {/* ── Contact tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'contact' ? (
        <div>
          <SectionDivider title="Studio location (private address)" />
          <p className="eyf-muted" style={{ fontSize: '0.85rem', lineHeight: 1.55, marginBottom: '0.8rem' }}>
            Enter your full address for booking logistics and map placement. We only show the public location label before booking.
          </p>
          <FieldGroup label="Public location label" hint="Shown publicly (e.g. East Nashville, TN). Exact address stays private until booking is confirmed.">
            <input
              type="text"
              value={form.publicLocationLabel || form.displayLocation || ''}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, publicLocationLabel: value, displayLocation: value }));
                setSaveState('idle');
              }}
              placeholder="East Nashville, TN"
            />
          </FieldGroup>
          <FieldGroup label="Address line 1">
            <input type="text" value={form.addressLine1 || ''} onChange={set('addressLine1')} placeholder="123 Music Row" />
          </FieldGroup>
          <FieldGroup label="Address line 2 (optional)">
            <input type="text" value={form.addressLine2 || ''} onChange={set('addressLine2')} placeholder="Suite 4B" />
          </FieldGroup>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <FieldGroup label="City">
              <input type="text" value={form.city || ''} onChange={set('city')} placeholder="Nashville" />
            </FieldGroup>
            <FieldGroup label="State / region">
              <input type="text" value={form.state || ''} onChange={set('state')} placeholder="TN" />
            </FieldGroup>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <FieldGroup label="Postal code">
              <input type="text" value={form.postalCode || ''} onChange={set('postalCode')} placeholder="37203" />
            </FieldGroup>
            <FieldGroup label="Country">
              <input type="text" value={form.country || ''} onChange={set('country')} placeholder="US" />
            </FieldGroup>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <FieldGroup label="Latitude">
              <input type="number" step="any" value={form.latitude ?? ''} onChange={set('latitude')} placeholder="36.1627" />
            </FieldGroup>
            <FieldGroup label="Longitude">
              <input type="number" step="any" value={form.longitude ?? ''} onChange={set('longitude')} placeholder="-86.7816" />
            </FieldGroup>
          </div>
          <FieldGroup label="Arrival instructions (private)" hint="Shown to clients after booking is confirmed.">
            <textarea
              rows={3}
              value={form.arrivalInstructions || ''}
              onChange={set('arrivalInstructions')}
              placeholder="Use side entrance after 6pm. Call on arrival for gate access."
            />
          </FieldGroup>

          <SectionDivider title="Public contact" />
          <FieldGroup label="Phone number">
            <input type="tel" value={form.contactInfo?.phone || ''} onChange={setContact('phone')} placeholder="+1 (555) 000-0000" />
          </FieldGroup>
          <FieldGroup label="Booking email">
            <input type="email" value={form.contactInfo?.email || ''} onChange={setContact('email')} placeholder="bookings@yourstudio.com" />
          </FieldGroup>
          <FieldGroup label="External booking URL" hint="Calendly, StudioBookings, or your own form.">
            <input type="url" value={form.contactInfo?.bookingUrl || ''} onChange={setContact('bookingUrl')} placeholder="https://calendly.com/yourstudio" />
          </FieldGroup>

          <SectionDivider title="Social links" />
          {['instagram', 'twitter', 'facebook', 'youtube', 'soundcloud', 'tiktok', 'website'].map((platform) => (
            <FieldGroup key={platform} label={platform.charAt(0).toUpperCase() + platform.slice(1)}>
              <input
                type="url"
                value={form.socialLinks?.[platform] || ''}
                onChange={setSocial(platform)}
                placeholder={platform === 'website' ? 'https://yourstudio.com' : `https://${platform}.com/yourstudio`}
              />
            </FieldGroup>
          ))}
        </div>
      ) : null}

      {activeTab === 'availability' ? (
        <div>
          {initialStudio?.id ? (
            <AvailabilityManager
              studioId={initialStudio.id}
              onSaved={() => setSaveState('saved')}
            />
          ) : (
            <div className="eyf-card">
              <p className="eyf-muted" style={{ margin: 0 }}>
                Save your studio profile first to manage availability.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* ── Actions bar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginTop: '1.75rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        <button
          type="button"
          className="eyf-button"
          onClick={handleSave}
          disabled={saveState === 'saving'}
          style={{ background: form.accentColor, color: '#111', borderColor: form.accentColor }}
        >
          {saveState === 'saving' ? 'Saving...' : 'Save changes'}
        </button>
        <button
          type="button"
          className="eyf-button eyf-button--ghost"
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
        {initialStudio?.slug ? (
          <Link
            to={`/s/${initialStudio.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.875rem', color: 'var(--muted)', textDecoration: 'underline' }}
          >
            Open live page ↗
          </Link>
        ) : null}
        <span className={`eyf-save-indicator eyf-save-indicator--${saveState}`} aria-live="polite">
          {saveState === 'saved' ? 'All changes saved' : saveState === 'error' ? (saveError || 'Save failed') : saveState === 'saving' ? 'Saving...' : ''}
        </span>
      </div>

      {/* ── Live preview ──────────────────────────────────────────────────────── */}
      {showPreview ? (
        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
            Live preview — {LAYOUT_TYPES[form.layoutType]?.label}
          </h4>
          <div className="sp-preview-outer">
            <div className="sp-preview-inner">
              <div className="sp-root" style={previewVars}>
                <PreviewLayout
                  studio={previewStudio}
                  sectionOrder={previewStudio.sectionOrder}
                  hiddenSections={previewHiddenSet}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
