import { Link } from 'react-router-dom';
import { getDisplayLocation } from '../../lib/location';
import { DEFAULT_SECTION_ORDER } from './SectionOrderEditor';

function Stars({ rating }) {
  return (
    <span className="sp-stars" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= Math.round(rating) ? 'var(--studio-accent)' : '#555' }}>
          ★
        </span>
      ))}
    </span>
  );
}

function ServicesList({ services }) {
  if (!services?.length) return null;
  return (
    <div className="sp-services-list">
      {services.map((svc, i) => (
        <div key={i} className="sp-service-row">
          <div>
            <strong>{svc.name}</strong>
            {svc.description ? <p>{svc.description}</p> : null}
          </div>
          {svc.price != null ? (
            <span className="sp-service-price">
              ${svc.price}
              {svc.unit ? <span className="sp-muted">/{svc.unit}</span> : null}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SocialRow({ links }) {
  if (!links) return null;
  const items = Object.entries(links).filter(([, v]) => v);
  if (!items.length) return null;
  return (
    <div className="sp-social-row">
      {items.map(([platform, url]) => (
        <a
          key={platform}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="sp-social-link"
        >
          {platform.charAt(0).toUpperCase() + platform.slice(1)}
        </a>
      ))}
    </div>
  );
}

function renderSection(key, studio) {
  const { accentColor, richDescription, description, gallery, services, amenities, equipment,
    contactInfo, socialLinks, reviews } = studio;

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
          <ServicesList services={services} />
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
      return contactInfo || socialLinks ? (
        <section key="contact" className="sp-section">
          <h2 className="sp-heading-md">Connect</h2>
          {contactInfo?.phone ? <p>📞 {contactInfo.phone}</p> : null}
          {contactInfo?.email ? <p>✉ <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a></p> : null}
          <SocialRow links={socialLinks} />
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
                  <Stars rating={r.rating} />
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

export default function LayoutMinimal({ studio, sectionOrder, hiddenSections }) {
  const locationLabel = getDisplayLocation(studio);
  const { name, richDescription, description, logoUrl, coverUrl, accentColor, sessionTypes,
    pricePerHour, city, state, rating, reviewCount, contactInfo, id } = studio;

  const effectiveOrder = sectionOrder?.length ? sectionOrder : DEFAULT_SECTION_ORDER;
  const hiddenSet = hiddenSections instanceof Set ? hiddenSections : new Set(hiddenSections || []);

  return (
    <div className="sp-minimal">
      {coverUrl ? (
        <div className="sp-minimal-cover" style={{ backgroundImage: `url(${coverUrl})` }} aria-hidden="true" />
      ) : (
        <div className="sp-minimal-cover sp-minimal-cover--color" style={{ background: accentColor }} />
      )}

      <div className="sp-minimal-body">
        <header className="sp-minimal-header">
          {logoUrl ? <img src={logoUrl} alt={`${name} logo`} className="sp-logo" /> : null}
          <div>
            <h1 className="sp-heading-xl">{name}</h1>
            <p className="sp-muted">{locationLabel || [city, state].filter(Boolean).join(', ')} · ${pricePerHour}/hr</p>
            {rating > 0 ? (
              <p className="sp-rating-row">
                <Stars rating={rating} />
                <span className="sp-muted">{rating.toFixed(1)} ({reviewCount} reviews)</span>
              </p>
            ) : null}
          </div>
        </header>

        {sessionTypes?.length ? (
          <div className="sp-tags">
            {sessionTypes.map((t) => <span key={t} className="sp-tag" style={{ borderColor: accentColor }}>{t}</span>)}
          </div>
        ) : null}

        {effectiveOrder.filter((k) => !hiddenSet.has(k)).map((key) => renderSection(key, studio))}

        <div className="sp-cta-row">
          <Link to={`/booking/${id}`} className="sp-button-primary" style={{ background: accentColor }}>
            Book a session
          </Link>
          {contactInfo?.bookingUrl ? (
            <a href={contactInfo.bookingUrl} target="_blank" rel="noopener noreferrer" className="sp-button-ghost">
              External booking
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
