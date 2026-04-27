import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studiosApi } from '../../lib/api';
import { useAppContext } from '../../context/AppContext';
import { ErrorMessage, SectionHeading, Spinner, StudioCard } from '../../components/efyia/ui';

const CATEGORIES = [
  { icon: '♪', label: 'Recording' },
  { icon: '⊞', label: 'Mixing' },
  { icon: '◈', label: 'Mastering' },
  { icon: '♫', label: 'Production' },
  { icon: '◎', label: 'Podcast' },
  { icon: '▷', label: 'Voiceover' },
  { icon: '◉', label: 'Rehearsal' },
];

const CITIES = ['Los Angeles', 'New York', 'Atlanta', 'Nashville', 'Miami'];

export default function HomePage() {
  const navigate = useNavigate();
  const { favoriteStudioIds, toggleFavorite, currentUser } = useAppContext();

  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ studios: 0 });

  const [locationInput, setLocationInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [category, setCategory] = useState('');

  const locationRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    studiosApi.list({ limit: 12 })
      .then(({ studios, pagination }) => {
        if (cancelled) return;
        setFeatured(studios);
        setStats({ studios: pagination.total });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const handleSearch = () => {
    const parts = [];
    if (locationInput.trim()) parts.push(locationInput.trim());
    if (category) parts.push(category);
    const params = new URLSearchParams();
    if (parts.length) params.set('q', parts.join(' '));
    if (dateInput) params.set('date', dateInput);
    navigate(`/discover?${params.toString()}`);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="eyf-page eyf-home">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="eyf-home-hero">
        {/* Background placeholder — drop your image here */}
        <div className="eyf-home-hero__bg" aria-hidden="true" />
        <div className="eyf-home-hero__overlay" aria-hidden="true" />

        <div className="eyf-home-hero__content">
          <p className="eyf-home-hero__eyebrow">The <br /><span className="eyf-gradient-text"> #1</span> booking marketplace</p>
          <h1 className="eyf-home-hero__heading">
            Book your next<br /><span className="eyf-gradient-text"> session.</span>
          </h1>
          <p className="eyf-home-hero__sub">
            Discover, compare, and book recording studios.
          </p>

          {/* Search bar */}
          <div className="eyf-hero-search" role="search">
            <div className="eyf-hero-search__field">
              <label htmlFor="hero-location" className="eyf-hero-search__field-label">Where</label>
              <input
                id="hero-location"
                ref={locationRef}
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="City, zip code, or studio name"
                className="eyf-hero-search__input"
              />
            </div>
            <div className="eyf-hero-search__divider" aria-hidden="true" />
            <div className="eyf-hero-search__field">
              <label htmlFor="hero-date" className="eyf-hero-search__field-label">Session date</label>
              <input
                id="hero-date"
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                min={today}
                className="eyf-hero-search__input"
              />
            </div>
            <button
              type="button"
              className="eyf-hero-search__btn"
              onClick={handleSearch}
              aria-label="Search studios"
            >
              Search
            </button>
          </div>

          {/* Quick city chips */}
          <div className="eyf-home-cities">
            {CITIES.map((city) => (
              <button
                key={city}
                type="button"
                className="eyf-chip"
                onClick={() => {
                  setLocationInput(city);
                  setTimeout(() => handleSearch(), 0);
                }}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ──────────────────────────────────────────────────────── */}
      <div className="eyf-container">
        <div className="eyf-home-categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              type="button"
              className={`eyf-home-category${category === cat.label ? ' is-active' : ''}`}
              onClick={() => {
                const next = category === cat.label ? '' : cat.label;
                setCategory(next);
              }}
            >
              <span className="eyf-home-category__icon" aria-hidden="true">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* ── Stats strip ──────────────────────────────────────────────────── */}
        <div className="eyf-home-stats">
          <div className="eyf-home-stats__item">
            <strong className="eyf-home-stats__num">{stats.studios > 0 ? stats.studios : '—'}</strong>
            <span>Verified studios </span>
          </div>
          
          <div className="eyf-home-stats__item">
            <strong className="eyf-home-stats__num">Instant</strong>
            <span>booking</span>
          </div>
        
        
        <div className="eyf-home-stats__item">
            <strong className="eyf-home-stats__num">Secure</strong>
            <span>checkout</span>
          </div>
           <div className="eyf-home-stats__item">
            <strong className="eyf-home-stats__num">24/7</strong>
            <span>support</span>
          </div>
        </div>
        
        {/* ── How it works ──────────────────────────────────────────────────── */}
        <section className="eyf-section eyf-how-it-works">
          <SectionHeading
            eyebrow="How it works"
            title="Book in three steps"
          />
          <div className="eyf-how-steps">
            <div className="eyf-how-step">
              <div className="eyf-how-step__num">01</div>
              <h4>Search &amp; filter</h4>
              <p className="eyf-muted">Browse studios by city, session type, price, and rating to find the perfect fit.</p>
            </div>
            <div className="eyf-how-step">
              <div className="eyf-how-step__num">02</div>
              <h4>Compare &amp; save</h4>
              <p className="eyf-muted">View detailed profiles, equipment lists, verified reviews, and portfolio samples.</p>
            </div>
            <div className="eyf-how-step">
              <div className="eyf-how-step__num">03</div>
              <h4>Book instantly</h4>
              <p className="eyf-muted">Confirm your session and pay.</p>
            </div>
          </div>
        </section>

        {/* ── Featured studios ─────────────────────────────────────────────── */}
        <section className="eyf-section">
          <SectionHeading
            eyebrow="Featured studios"
            title="Top rated spaces across the marketplace"
            action={<Link className="eyf-link-button" to="/discover">View all studios</Link>}
          />
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorMessage
              message={error}
              onRetry={() => {
                setError(null);
                setLoading(true);
                studiosApi.list({ limit: 12 })
                  .then(({ studios }) => { setFeatured(studios); setLoading(false); })
                  .catch((err) => { setError(err.message); setLoading(false); });
              }}
            />
          ) : featured.length > 0 ? (
            <div className="eyf-card-grid">
              {featured.map((studio) => (
                <StudioCard
                  key={studio.id}
                  studio={studio}
                  isFavorite={favoriteStudioIds.includes(studio.id)}
                  onFavoriteToggle={currentUser ? toggleFavorite : null}
                />
              ))}
            </div>
          ) : (
            <div className="eyf-card eyf-empty">
              <p className="eyf-muted">No studios are listed yet.</p>
            </div>
          )}
        </section>

        {/* ── Sign-up CTA ───────────────────────────────────────────────────── */}
        {!currentUser ? (
          <section className="eyf-home-cta">
            <div className="eyf-home-cta__inner">
              <p className="eyf-eyebrow">For studio owners</p>
              <h2>Reach artists who are ready to book</h2>
              <p className="eyf-muted">
                List your space on Efyia Book. Set your rates, manage availability, and get discovered by clients in your city.
              </p>
              <div className="eyf-row eyf-row--center">
                <Link className="eyf-button" to="/signup">
                  List your studio
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
