import { Link } from 'react-router-dom';
import { getDisplayLocation } from '../../lib/location';
import { DEFAULT_SECTION_ORDER } from './SectionOrderEditor';

function Stars({ rating, accent }) {
  return (
    <span className="sp-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= Math.round(rating) ? accent : '#aaa' }}>★</span>
      ))}
    </span>
  );
}

function renderSection(key, studio) {
  const { accentColor, richDescription, description, gallery, services, amenities, equipment,
    contactInfo, socialLinks, reviews, sessionTypes, pricePerHour, id } = studio;

  switch (key) {
    case 'about':
      return (
        <section key="about" className="sp-grid-about">
          {richDescription || description ? <p className="sp-body-text">{richDescription || description}</p> : null}
          {sessionTypes?.length ? (
            <div className="sp-tags" style={{ marginTop: '1rem' }}>
              {sessionTypes.map((t) => <span key={t} className="sp-tag" style={{ borderColor: accentColor }}>{t}</span>)}
            </div>
          ) : null}
        </section>
      );
    case 'gallery':
      return gallery?.length ? (
        <section key="gallery" className="sp-section">
          <h2 className="sp-heading-md">Gallery</h2>
          <div className="sp-gallery">
            {gallery.map((img, i) => (
              <div key={i} className="sp-gallery-item">
                <img src={img.url} alt={img.caption || `Studio photo ${i + 1}`} loading="lazy" />
                {img.caption ? <span className="sp-gallery-item__caption">{img.caption}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null;
    case 'services':
      return services?.length ? (
        <section key="services" className="sp-section">
          <h2 className="sp-heading-md">Services & Pricing</h2>
          <div className="sp-services-grid">
            {services.map((svc, i) => (
              <div key={i} className="sp-service-card" style={{ borderTop: `3px solid ${accentColor}` }}>
                <strong>{svc.name}</strong>
                {svc.description ? <p>{svc.description}</p> : null}
                {svc.price != null ? <p className="sp-service-price-hero">${svc.price}{svc.unit ? `/${svc.unit}` : ''}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null;
    case 'amenities':
      return amenities?.length ? (
        <section key="amenities" className="sp-section">
          <h2 className="sp-heading-sm" style={{ color: accentColor }}>Amenities</h2>
          <ul className="sp-list">{amenities.map((a) => <li key={a}>{a}</li>)}</ul>
        </section>
      ) : null;
    case 'equipment':
      return equipment?.length ? (
        <section key="equipment" className="sp-section">
          <h2 className="sp-heading-sm" style={{ color: accentColor }}>Equipment</h2>
          <ul className="sp-list">{equipment.map((e) => <li key={e}>{e}</li>)}</ul>
        </section>
      ) : null;
    case 'contact':
      return (
        <section key="contact" className="sp-section sp-cta-card" style={{ borderColor: accentColor }}>
          <h2 className="sp-heading-sm">Ready to book?</h2>
          <p className="sp-muted">Starting at ${pricePerHour}/hr</p>
          <Link to={`/booking/${id}`} className="sp-button-primary" style={{ background: accentColor, display: 'block', textAlign: 'center' }}>Book now</Link>
          {contactInfo?.bookingUrl ? (
            <a href={contactInfo.bookingUrl} target="_blank" rel="noopener noreferrer" className="sp-button-ghost" style={{ display: 'block', textAlign: 'center', marginTop: '0.5rem' }}>External booking</a>
          ) : null}
          {contactInfo?.phone ? <p style={{ marginTop: '0.75rem' }}>📞 {contactInfo.phone}</p> : null}
          {contactInfo?.email ? <p>✉ <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a></p> : null}
          {socialLinks ? (
            <div className="sp-social-row" style={{ marginTop: '0.75rem' }}>
              {Object.entries(socialLinks).filter(([, v]) => v).map(([platform, url]) => (
                <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="sp-social-link">
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </a>
              ))}
            </div>
          ) : null}
        </section>
      );
    case 'reviews':
      return reviews?.length ? (
        <section key="reviews" className="sp-section">
          <h2 className="sp-heading-md">Reviews</h2>
          <div className="sp-reviews-grid">
            {reviews.slice(0, 6).map((r) => (
              <div key={r.id} className="sp-review-card">
                <div className="sp-review-header">
                  <strong>{r.user?.name}</strong>
                  <span style={{ color: accentColor }}>{'★'.repeat(r.rating)}</span>
                </div>
                <p>{r.content}</p>
                {r.ownerReply ? <p className="sp-owner-reply"><strong>Studio reply:</strong> {r.ownerReply}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null;
    default:
      return null;
  }
}

export default function LayoutGrid({ studio, sectionOrder, hiddenSections }) {
  const locationLabel = getDisplayLocation(studio);
  const { name, logoUrl, coverUrl, accentColor, pricePerHour, city, state, rating, reviewCount, id } = studio;

  const effectiveOrder = sectionOrder?.length ? sectionOrder : DEFAULT_SECTION_ORDER;
  const hiddenSet = hiddenSections instanceof Set ? hiddenSections : new Set(hiddenSections || []);

  return (
    <div className="sp-grid-layout">
      <header className="sp-grid-masthead">
        <div className="sp-grid-masthead-bg" style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : undefined, backgroundColor: coverUrl ? undefined : accentColor }} />
        <div className="sp-grid-masthead-inner">
          {logoUrl ? <img src={logoUrl} alt={`${name} logo`} className="sp-logo" /> : null}
          <h1 className="sp-heading-xl">{name}</h1>
          <p className="sp-muted">{locationLabel || [city, state].filter(Boolean).join(', ')} · ${pricePerHour}/hr</p>
          {rating > 0 ? (
            <p className="sp-rating-row">
              <Stars rating={rating} accent={accentColor} />
              <span className="sp-muted">{rating.toFixed(1)} ({reviewCount})</span>
            </p>
          ) : null}
        </div>
      </header>

      <div className="sp-grid-body">
        {effectiveOrder.filter((k) => !hiddenSet.has(k)).map((key) => renderSection(key, studio))}
      </div>
    </div>
  );
}
