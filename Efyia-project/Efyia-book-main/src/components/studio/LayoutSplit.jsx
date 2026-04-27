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
    contactInfo, reviews } = studio;

  switch (key) {
    case 'about':
      return richDescription || description ? (
        <p key="about" className="sp-body-text">{richDescription || description}</p>
      ) : null;
    case 'gallery':
      return gallery?.length ? (
        <section key="gallery" className="sp-section">
          <h2 className="sp-heading-md" style={{ color: accentColor }}>Gallery</h2>
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
          <h2 className="sp-heading-md" style={{ color: accentColor }}>Services</h2>
          <div className="sp-services-list">
            {services.map((svc, i) => (
              <div key={i} className="sp-service-row">
                <div>
                  <strong>{svc.name}</strong>
                  {svc.description ? <p>{svc.description}</p> : null}
                </div>
                {svc.price != null ? <span className="sp-service-price">${svc.price}{svc.unit ? <span className="sp-muted">/{svc.unit}</span> : null}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null;
    case 'amenities':
      return amenities?.length ? (
        <section key="amenities" className="sp-section">
          <h2 className="sp-heading-md" style={{ color: accentColor }}>Amenities</h2>
          <ul className="sp-list">{amenities.map((a) => <li key={a}>{a}</li>)}</ul>
        </section>
      ) : null;
    case 'equipment':
      return equipment?.length ? (
        <section key="equipment" className="sp-section">
          <h2 className="sp-heading-md" style={{ color: accentColor }}>Equipment</h2>
          <ul className="sp-list">{equipment.map((e) => <li key={e}>{e}</li>)}</ul>
        </section>
      ) : null;
    case 'contact':
      return contactInfo?.phone || contactInfo?.email ? (
        <section key="contact" className="sp-section">
          <h2 className="sp-heading-md" style={{ color: accentColor }}>Contact</h2>
          {contactInfo.phone ? <p>📞 {contactInfo.phone}</p> : null}
          {contactInfo.email ? <p>✉ <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a></p> : null}
        </section>
      ) : null;
    case 'reviews':
      return reviews?.length ? (
        <section key="reviews" className="sp-section">
          <h2 className="sp-heading-md" style={{ color: accentColor }}>Reviews</h2>
          <div className="sp-reviews">
            {reviews.slice(0, 4).map((r) => (
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

export default function LayoutSplit({ studio, sectionOrder, hiddenSections }) {
  const locationLabel = getDisplayLocation(studio);
  const { name, logoUrl, coverUrl, accentColor, sessionTypes, pricePerHour, city, state,
    rating, reviewCount, socialLinks, contactInfo, id } = studio;

  const effectiveOrder = sectionOrder?.length ? sectionOrder : DEFAULT_SECTION_ORDER;
  const hiddenSet = hiddenSections instanceof Set ? hiddenSections : new Set(hiddenSections || []);

  return (
    <div className="sp-split">
      <aside className="sp-split-aside" style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : undefined, backgroundColor: coverUrl ? undefined : accentColor }}>
        <div className="sp-split-aside-inner">
          {logoUrl ? <img src={logoUrl} alt={`${name} logo`} className="sp-logo sp-logo--light" /> : null}
          <h1 className="sp-heading-split">{name}</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>{locationLabel || [city, state].filter(Boolean).join(', ')}</p>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>${pricePerHour}/hr</p>
          {rating > 0 ? (
            <p className="sp-rating-row">
              <Stars rating={rating} accent="white" />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{rating.toFixed(1)} ({reviewCount})</span>
            </p>
          ) : null}
          {sessionTypes?.length ? (
            <div className="sp-tags sp-tags--hero" style={{ marginTop: '1rem' }}>
              {sessionTypes.map((t) => <span key={t} className="sp-tag sp-tag--hero">{t}</span>)}
            </div>
          ) : null}
          <Link to={`/booking/${id}`} className="sp-button-primary" style={{ marginTop: 'auto', background: 'white', color: '#111' }}>
            Book a session
          </Link>
          {socialLinks ? (
            <div className="sp-social-row" style={{ marginTop: '1rem' }}>
              {Object.entries(socialLinks).filter(([, v]) => v).map(([platform, url]) => (
                <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="sp-social-link sp-social-link--light">
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </aside>

      <main className="sp-split-main">
        {effectiveOrder.filter((k) => !hiddenSet.has(k)).map((key) => renderSection(key, studio))}
      </main>
    </div>
  );
}
