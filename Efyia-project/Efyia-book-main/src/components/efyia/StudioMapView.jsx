import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getDisplayLocation } from '../../lib/location';
import { resolveStudioCoords } from '../../lib/geocode';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function StudioMapView({ studios, selected, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [-98.5795, 39.8283],
      zoom: 3,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current.on('click', (e) => {
      if (!e.originalEvent.target.closest('.eyf-map-pin')) {
        onSelect(null);
      }
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapRef.current || !studios.length) return;

    const addMarkers = async () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];

      const token = mapboxgl.accessToken;
      const resolved = await Promise.all(
        studios.map(async (studio) => ({
          studio,
          ...(await resolveStudioCoords(studio, token)),
        })),
      );

      const bounds = new mapboxgl.LngLatBounds();
      let hasCoords = false;

      resolved.forEach(({ studio, lat, lng }) => {
        if (lat == null || lng == null) return;
        hasCoords = true;
        bounds.extend([lng, lat]);

        const el = document.createElement('button');
        el.className = 'eyf-map-pin';
        el.style.background = studio.color || '#62f3d4';
        el.setAttribute('aria-label', `${studio.name} — ${getDisplayLocation(studio)}`);
        el.title = studio.name;
        el.addEventListener('click', () => {
          onSelect((prev) => (prev?.id === studio.id ? null : studio));
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);
        markersRef.current.push({ marker, el, id: studio.id, lat, lng });
      });

      if (hasCoords) {
        mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 800 });
      }
    };

    if (mapRef.current.isStyleLoaded()) addMarkers();
    else mapRef.current.once('load', addMarkers);
  }, [studios]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    markersRef.current.forEach(({ el, id }) => {
      el.classList.toggle('is-selected', selected?.id === id);
    });
    if (selected && mapRef.current) {
      const entry = markersRef.current.find((m) => m.id === selected.id);
      if (entry) {
        mapRef.current.flyTo({ center: [entry.lng, entry.lat], zoom: 12, duration: 800 });
      }
    }
  }, [selected]);

  return (
    <div className="eyf-card eyf-map-canvas" style={{ position: 'relative', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {selected && (
        <div
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '1rem',
            maxWidth: '320px',
            width: 'calc(100% - 2rem)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            zIndex: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>{selected.name}</strong>
              <p className="eyf-muted" style={{ margin: '0.2rem 0 0', fontSize: '0.82rem' }}>
                {getDisplayLocation(selected)} · ${selected.pricePerHour}/hr
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelect(null)}
              aria-label="Close studio preview"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted)',
                fontSize: '1.1rem',
                lineHeight: 1,
                padding: '0',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
          <Link className="eyf-link-button" to={`/studios/${selected.slug}`}>
            View profile
          </Link>
        </div>
      )}
    </div>
  );
}
