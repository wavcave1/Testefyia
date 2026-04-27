import { Link } from 'react-router-dom';
import { getDisplayLocation } from '../../lib/location';
import { DEFAULT_SECTION_ORDER } from './SectionOrderEditor';

function Stars({ rating }) {
  return (
    <span className="sp-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= Math.round(rating) ? 'var(--studio-accent)' : '#555' }}>★</span>
      ))}
    </span>
  );
}

function renderSection(key, studio) {
  const { accentColor, richDescription, description, gallery, services, amenities, equipment,
    contactInfo, socialLinks, reviews, credits, portfolio, team } = studio;

  switch (key) {
    case 'about':
      return richDescription || description ? (
        <div key="about" className="sp-card-block">
          <h3 className="sp-heading-sm" style={{ color: accentColor }}>About</h3>
          <p className="sp-body-text" style={{ maxWidth: '100%' }}>{richDescription || description}</p>
        </div>
      ) : null;

    case 'gallery':
      return gallery?.length ? (
        <div key="gallery" className="sp-card-block sp-card-block--full">
          <h3 className="sp-heading-sm" style={{ color: accentColor }}>Gallery</h3>
          <div className="sp-card-gallery-strip">
            {gallery.map((img, i) => (
              <div key={i} className="sp-card-gallery-img">
                <img src={img.url} alt={img.caption || `Photo ${i + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      ) : null;

    case 'services':
      return services?.length ? (
        <div key="services" className="sp-card-block sp-card-block--full">
          <h3 className="sp-heading-sm" style={{ color: accentColor }}>Services</h3>
          <div className="sp-services-grid">
            {services.map((svc, i) => (
              <div key={i} className="sp-service-card" style={{ borderTop: `3px solid ${accentColor}` }}>
                <strong>{svc.name}</strong>
                {svc.description ? <p>{svc.description}</p> : null}
                {svc.price != null ? <p className="sp-service-price-hero">${svc.price}{svc.unit ? `/${svc.unit}` : ''}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null;

    case 'amenities':
      return amenities?.length ? (
        <div key="amenities" className="sp-card-block">
          <h3 className="sp-heading-sm" style={{ color: accentColor }}>Amenities</h3>
          <ul className="sp-list">{amenities.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      ) : null;

    case 'equipment':
      return equipment?.length ? (
        <div key="equipment" className="sp-card-block">
          <h3 className="sp-heading-sm" style={{ color: accentColor }}>Equipment</h3>
          <ul className="sp-list">{equipment.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      ) : null;

    case 'contact':
      return contactInfo || socialLinks ? (
        <div key="contact" className="sp-card-block">
          <h3 className="sp-heading-sm" style={{ color: accentColor }}>Contact</h3>
          {contactInfo?.phone ? <p style={{ marginBottom: '0.25rem' }}>📞 {contactInfo.phone}</p> : null}
          {contactInfo?.email ? <p style={{ marginBottom: '0.5rem' }}>✉ <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a></p> : null}
          {socialLinks ? (
            <div className="sp-social-row" style={{ flexWrap: 'wrap' }}>
              {Object.entries(socialLinks).filter(([, v]) => v).map(([p, u]) => (
                <a key={p} href={u} target="_blank" rel="noopener noreferrer" className="sp-social-link">
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null;

    case 'reviews':
      return reviews?.length ? (
        <div key="reviews" className="sp-card-block sp-card-block--full">
          <h3 className="sp-heading-sm" style={{ color: accentColor }}>Reviews</h3>
          <div className="sp-reviews-grid">
            {reviews.slice(0, 6).map((r) => (
              <div key={r.id} className="sp-review-card">
                <div className="sp-review-header">
                  <strong>{r.user?.name}</strong>
                  <Stars rating={r.rating} />
                </div>
                <p>{r.content}</p>
                {r.ownerReply ? <p className="sp-owner-reply"><strong>Studio reply:</strong> {r.ownerReply}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null;

    case 'credits':
      return credits?.length ? (
        <div key="credits" className="sp-card-block">
          <h3 className="sp-heading-sm" style={{ color: accentColor }}>Credits</h3>
          {credits.map((c, i) => (
            <div key={i} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <strong>{c.artistName}</strong>
              {c.projectName ? ` — ${c.projectName}` : ''}
              {c.year ? <span className="sp-muted"> {c.year}</span> : null}
            </div>
          ))}
        </div>
      ) : null;

    case 'portfolio':
      return portfolio?.length ? (
        <div key="portfolio" className="sp-card-block sp-card-block--full">
          <h3 className="sp-heading-sm" style={{ color: accentColor }}>Portfolio</h3>
          {portfolio.map((item, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              {item.title ? <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{item.title}</p> : null}
              {item.embedUrl ? (
                <iframe src={item.embedUrl} title={item.title || `Portfolio ${i + 1}`}
                  style={{ width: '100%', height: 180, border: 'none', borderRadius: 8 }} allow="autoplay; encrypted-media" />
              ) : null}
              {item.audioUrl ? <audio controls src={item.audioUrl} style={{ width: '100%' }} /> : null}
            </div>
          ))}
        </div>
      ) : null;

    case 'team':
      return team?.length ? (
        <div key="team" className="sp-card-block">
          <h3 className="sp-heading-sm" style={{ color: accentColor }}>Team</h3>
          {team.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              {m.photoUrl ? <img src={m.photoUrl} alt={m.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : null}
              <div>
                <strong style={{ display: 'block' }}>{m.name}</strong>
                {m.role ? <span className="sp-muted" style={{ fontSize: '0.85rem' }}>{m.role}</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null;

    default:
      return null;
  }
}

export default function LayoutCard({ studio, sectionOrder, hiddenSections }) {
  const locationLabel = getDisplayLocation(studio);
  const { name, logoUrl, coverUrl, accentColor, pricePerHour, city, state, rating,
    reviewCount, sessionTypes, contactInfo, id } = studio;

  const effectiveOrder = sectionOrder?.length ? sectionOrder : DEFAULT_SECTION_ORDER;
  const hiddenSet = hiddenSections instanceof Set ? hiddenSections : new Set(hiddenSections || []);

  return (
    <div className="sp-card-layout">
      {/* Masthead */}
      <header className="sp-card-masthead" style={{ background: coverUrl ? undefined : accentColor, backgroundImage: coverUrl ? `url(${coverUrl})` : undefined }}>
        <div className="sp-card-masthead-overlay">
          {logoUrl ? <img src={logoUrl} alt={`${name} logo`} className="sp-logo sp-logo--light" style={{ marginBottom: '0.75rem' }} /> : null}
          <h1 className="sp-heading-xl" style={{ color: 'white', marginBottom: '0.25rem' }}>{name}</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            {locationLabel || [city, state].filter(Boolean).join(', ')} · ${pricePerHour}/hr
          </p>
          {rating > 0 ? (
            <p className="sp-rating-row" style={{ marginBottom: '0.5rem' }}>
              <Stars rating={rating} />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{rating.toFixed(1)} ({reviewCount})</span>
            </p>
          ) : null}
          {sessionTypes?.length ? (
            <div className="sp-tags sp-tags--hero">
              {sessionTypes.map((t) => <span key={t} className="sp-tag sp-tag--hero">{t}</span>)}
            </div>
          ) : null}
        </div>
      </header>

      {/* CTA bar */}
      <div className="sp-card-cta-bar">
        <Link to={`/booking/${id}`} className="sp-button-primary" style={{ background: accentColor, color: '#111' }}>
          Book a session
        </Link>
        {contactInfo?.bookingUrl ? (
          <a href={contactInfo.bookingUrl} target="_blank" rel="noopener noreferrer" className="sp-button-ghost">
            External booking
          </a>
        ) : null}
      </div>

      {/* Card grid body */}
      <div className="sp-card-grid">
        {effectiveOrder
          .filter((k) => !hiddenSet.has(k))
          .map((key) => renderSection(key, studio))}
      </div>
    </div>
  );
}
