import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { publicApi } from '../../lib/api';
import { buildStudioVars, FONT_URLS } from '../../lib/studioTheme';
import LayoutMinimal from '../../components/studio/LayoutMinimal';
import LayoutHero from '../../components/studio/LayoutHero';
import LayoutSplit from '../../components/studio/LayoutSplit';
import LayoutGrid from '../../components/studio/LayoutGrid';
import LayoutMagazine from '../../components/studio/LayoutMagazine';
import LayoutCard from '../../components/studio/LayoutCard';
import { DEFAULT_SECTION_ORDER } from '../../components/studio/SectionOrderEditor';
import '../../styles/studio.css';

const LAYOUTS = {
  minimal: LayoutMinimal,
  hero: LayoutHero,
  split: LayoutSplit,
  grid: LayoutGrid,
  magazine: LayoutMagazine,
  card: LayoutCard,
};

// Inject a Google Fonts <link> for the chosen pairing (once per load)
const injectedFonts = new Set();
function injectFont(url) {
  if (!url || injectedFonts.has(url)) return;
  injectedFonts.add(url);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

export default function StudioPublicPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [studio, setStudio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    publicApi.getStudioBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        setStudio(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 404) {
          navigate('/', { replace: true });
        } else {
          setError(err.message || 'Failed to load studio.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [slug, navigate]);

  // Inject font and set theme override once studio loads
  useEffect(() => {
    if (!studio) return;

    // Font injection
    const fontUrl = FONT_URLS[studio.fontPairing];
    if (fontUrl) injectFont(fontUrl);

    // Theme override: if studio specifies light/dark, apply it
    if (studio.themeOverride) {
      document.documentElement.setAttribute('data-theme', studio.themeOverride);
    }

    // Cleanup: restore system/user theme when leaving page
    return () => {
      if (studio.themeOverride) {
        // Read user's preferred theme back from localStorage
        const saved = localStorage.getItem('efyia-theme');
        if (saved) {
          document.documentElement.setAttribute('data-theme', saved);
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }
      }
    };
  }, [studio]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem' }}>
        <p style={{ color: 'var(--muted)' }}>{error}</p>
        <Link to="/" style={{ color: 'var(--studio-accent, #62f3d4)' }}>← Back to Efyia Book</Link>
      </div>
    );
  }

  const Layout = LAYOUTS[studio.layoutType] || LayoutMinimal;
  const studioVars = buildStudioVars(studio);

  const sectionOrder = Array.isArray(studio.sectionOrder) && studio.sectionOrder.length
    ? studio.sectionOrder
    : DEFAULT_SECTION_ORDER;
  const hiddenSections = new Set(Array.isArray(studio.hiddenSections) ? studio.hiddenSections : []);

  const noTopOffset = studio.layoutType === 'hero' || studio.layoutType === 'split' || studio.layoutType === 'magazine';

  return (
    <div className="sp-root" style={studioVars}>
      <nav className="sp-nav">
        <Link to="/">← Efyia Book</Link>
        <Link to={`/studios/${studio.slug}`}>Platform profile</Link>
        <span className="sp-nav-title">{studio.name}</span>
      </nav>

      {!noTopOffset ? (
        <div style={{ height: '48px' }} aria-hidden="true" />
      ) : null}

      <Layout studio={studio} sectionOrder={sectionOrder} hiddenSections={hiddenSections} />
    </div>
  );
}
