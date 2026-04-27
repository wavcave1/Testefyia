import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { studiosApi } from '../../lib/api';
import { useAppContext } from '../../context/AppContext';
import { EmptyState, ErrorMessage, SectionHeading, Spinner, StudioCard } from '../../components/efyia/ui';
import StudioMapView from '../../components/efyia/StudioMapView';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { favoriteStudioIds, toggleFavorite, currentUser } = useAppContext();

  const [query, setQuery] = useState(params.get('q') || '');
  const [priceMax, setPriceMax] = useState(200);
  const [minRating, setMinRating] = useState(0);
  const [studios, setStudios] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(!!params.get('q'));
  const [selectedStudio, setSelectedStudio] = useState(null);

  // Sync query from URL
  useEffect(() => {
    setQuery(params.get('q') || '');
    setHasSearched(!!params.get('q'));
  }, [params]);

  const fetchStudios = (overrides = {}) => {
    setLoading(true);
    setError(null);

    const q = overrides.q !== undefined ? overrides.q : params.get('q') || '';
    const max = overrides.priceMax !== undefined ? overrides.priceMax : priceMax;
    const rating = overrides.minRating !== undefined ? overrides.minRating : minRating;

    studiosApi.list({
      q: q || undefined,
      maxPrice: max < 200 ? max : undefined,
      minRating: rating > 0 ? rating : undefined,
      limit: 50,
    })
      .then(({ studios: list, pagination }) => {
        setStudios(list);
        setTotal(pagination.total);
        setLoading(false);
        setSelectedStudio(null);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStudios();
  }, [params.get('q')]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = () => {
    if (query) setParams({ q: query });
    else setParams({});
    setHasSearched(true);
    fetchStudios({ q: query });
  };

  return (
    <div className="eyf-page">
      <section className="eyf-section">
        <SectionHeading
          eyebrow="Find Studios"
          title="Discover your perfect recording space"
        />

        <div className="eyf-search-layout">
          {/* ── Filter sidebar ──────────────────────────────────────────── */}
          <aside className="eyf-card eyf-filter-panel">
            <h3>Filters</h3>
            <label>
              Search
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder="City, zip code, or studio name"
              />
            </label>
            <label>
              Max hourly rate: ${priceMax}{priceMax === 200 ? '+' : ''}
              <input
                type="range"
                min="40"
                max="200"
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
              />
            </label>
            <div>
              <span className="eyf-filter-label">Minimum rating</span>
              <div className="eyf-city-list">
                {[0, 4, 4.5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={`eyf-chip ${minRating === rating ? 'is-active' : ''}`}
                    onClick={() => setMinRating(rating)}
                  >
                    {rating === 0 ? 'Any' : `${rating}+`}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="eyf-button" onClick={applyFilters}>
              Apply filters
            </button>
          </aside>

          {/* ── Map + Results ────────────────────────────────────────────── */}
          <div className="eyf-results-area">
            {/* ── Embedded map ─────────────────────────────────────────── */}
            <StudioMapView
              studios={studios}
              selected={selectedStudio}
              onSelect={setSelectedStudio}
            />

            {/* ── Studio results ────────────────────────────────────────── */}
            <div className="eyf-results-panel">
              {loading ? (
                <Spinner />
              ) : error ? (
                <ErrorMessage message={error} onRetry={() => fetchStudios()} />
              ) : (
                <>
                  <div className="eyf-results-count">
                    <strong>{total}</strong> studio{total !== 1 ? 's' : ''} found
                  </div>
                  {studios.length > 0 ? (
                    <div className="eyf-card-grid">
                      {studios.map((studio) => (
                        <StudioCard
                          key={studio.id}
                          studio={studio}
                          isFavorite={favoriteStudioIds.includes(studio.id)}
                          onFavoriteToggle={currentUser ? toggleFavorite : null}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No studios found"
                      description="Try adjusting your location, rating, or price filters."
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
