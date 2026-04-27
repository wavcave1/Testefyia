import { Link } from 'react-router-dom';
import { getDisplayLocation } from '../../lib/location';
import { DEFAULT_SECTION_ORDER } from './SectionOrderEditor';

function Stars({ rating }) {
  return (
    <span className="sp-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= Math.round(rating) ? 'var(--studio-accent)' : 'rgba(255,255,255,0.4)' }}>
          ★
        </span>
      ))}
    </span>
  );
}

function SocialRow({ links }) {
  if (!links) return null;
  const items = Object.entries(links).filter(([, v]) => v);
  if (!items.length) return null;
  return (
    <div className="sp-social-row">
      {items.map(([platform, url]) => (
        <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="sp-social-link sp-social-link--light">
          {platform.charAt(0).toUpperCase() + platform.slice(1)}
        </a>
      ))}
    </div>
  );
}

function renderSection(key, studio) {
  const { accentColor, richDescription, description, gallery, services, amenities, equipment,
    contactInfo, reviews } = studio;

  switch (key) {
    case 'about':
      return richDescription || description ? (
        <p key="about" className="sp-body-text">{richDescription || description}</p>
      ) : null;
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
          <h2 className="sp-heading-md">Services</h2>
          <div className="sp-services-grid">
            {services.map((svc, i) => (
              <div key={i} className="sp-service-card">
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
          <h2 className="sp-heading-md">Amenities</h2>
          <ul className="sp-list">{amenities.map((a) => <li key={a}>{a}</li>)}</ul>
        </section>
      ) : null;
    case 'equipment':
      return equipment?.length ? (
        <section key="equipment" className="sp-section">
          <h2 className="sp-heading-md">Equipment</h2>
          <ul className="sp-list">{equipment.map((e) => <li key={e}>{e}</li>)}</ul>
        </section>
      ) : null;
    case 'contact':
      return contactInfo?.phone || contactInfo?.email ? (
        <section key="contact" className="sp-section">
          <h2 className="sp-heading-md">Contact</h2>
          {contactInfo.phone ? <p>📞 {contactInfo.phone}</p> : null}
          {contactInfo.email ? <p>✉ <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a></p> : null}
        </section>
      ) : null;
    case 'reviews':
      return reviews?.length ? (
        <section key="reviews" className="sp-section">
          <h2 className="sp-heading-md">Reviews</h2>
          <div className="sp-reviews">
            {reviews.slice(0, 4).map((r) => (
              <div key={r.id} className="sp-review-card">
                <div className="sp-review-header">
                  <strong>{r.user?.name}</strong>
                  <span style={{ color: 'var(--studio-accent)' }}>{'★'.repeat(r.rating)}</span>
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

export default function LayoutHero({ studio, sectionOrder, hiddenSections }) {
  const locationLabel = getDisplayLocation(studio);
  const { name, logoUrl, coverUrl, accentColor, sessionTypes, pricePerHour, city, state,
    rating, reviewCount, socialLinks, contactInfo, id } = studio;

  const effectiveOrder = sectionOrder?.length ? sectionOrder : DEFAULT_SECTION_ORDER;
  const hiddenSet = hiddenSections instanceof Set ? hiddenSections : new Set(hiddenSections || []);

  return (
    <div className="sp-hero">
      <div className="sp-hero-banner" style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : undefined, backgroundColor: coverUrl ? undefined : accentColor }}>
        <div className="sp-hero-overlay">
          <div className="sp-hero-inner">
            {logoUrl ? <img src={logoUrl} alt={`${name} logo`} className="sp-logo sp-logo--light" /> : null}
            <h1 className="sp-heading-hero">{name}</h1>
            <p className="sp-hero-sub">{locationLabel || [city, state].filter(Boolean).join(', ')} · ${pricePerHour}/hr</p>
            {rating > 0 ? (
              <p className="sp-rating-row">
                <Stars rating={rating} />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>{rating.toFixed(1)} ({reviewCount})</span>
              </p>
            ) : null}
            {sessionTypes?.length ? (
              <div className="sp-tags sp-tags--hero">
                {sessionTypes.map((t) => <span key={t} className="sp-tag sp-tag--hero">{t}</span>)}
              </div>
            ) : null}
            <div className="sp-hero-actions">
              <Link to={`/booking/${id}`} className="sp-button-primary" style={{ background: accentColor, color: '#111' }}>
                Book a session
              </Link>
            </div>
            <SocialRow links={socialLinks} />
          </div>
        </div>
      </div>

      <div className="sp-hero-content">
        {effectiveOrder.filter((k) => !hiddenSet.has(k)).map((key) => renderSection(key, studio))}
      </div>
    </div>
  );
}
