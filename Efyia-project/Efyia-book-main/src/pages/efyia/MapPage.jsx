import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studiosApi } from '../../lib/api';
import { ErrorMessage, SectionHeading, Spinner, Stars } from '../../components/efyia/ui';
import { getDisplayLocation } from '../../lib/location';
import StudioMapView from '../../components/efyia/StudioMapView';

export default function MapPage() {
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const fetchStudios = () => {
    setLoading(true);
    setError(null);
    studiosApi.list({ limit: 50 })
      .then(({ studios: list }) => {
        setStudios(list);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => { fetchStudios(); }, []);

  return (
    <div className="eyf-page">
      <section className="eyf-section">
        <SectionHeading
          eyebrow="Map view"
          title="Studio locations in your favorite cities"
          description="Select a pin to explore studios near you."
        />
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchStudios} />
        ) : (
          <div className="eyf-map-layout">
            <StudioMapView studios={studios} selected={selected} onSelect={setSelected} />
            <div className="eyf-map-sidebar">
              {studios.map((studio) => (
                <article
                  key={studio.id}
                  className="eyf-card eyf-map-card"
                  style={{ borderColor: selected?.id === studio.id ? 'var(--mint)' : undefined, cursor: 'pointer' }}
                  onClick={() => setSelected((prev) => (prev?.id === studio.id ? null : studio))}
                >
                  <div className="eyf-row eyf-row--between eyf-row--start">
                    <div>
                      <h3>{studio.name}</h3>
                      <p className="eyf-muted">{getDisplayLocation(studio)}</p>
                    </div>
                    <span className="eyf-price">${studio.pricePerHour}/hr</span>
                  </div>
                  <Stars rating={studio.rating || 0} />
                  <p className="eyf-muted">{studio.description}</p>
                  <Link
                    className="eyf-link-button"
                    to={`/studios/${studio.slug}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    View profile
                  </Link>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
