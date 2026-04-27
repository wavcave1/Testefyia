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

function SocialRow({ links }) {
  if (!links) return null;
  const items = Object.entries(links).filter(([, v]) => v);
  if (!items.length) return null;
  return (
    <div className="sp-social-row" style={{ flexWrap: 'wrap' }}>
      {items.map(([platform, url]) => (
        <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="sp-social-link">
          {platform.charAt(0).toUpperCase() + platform.slice(1)}
        </a>
      ))}
    </div>
  );
}

function renderSection(key, studio) {
  const { accentColor, richDescription, description, gallery, services, amenities, equipment,
    contactInfo, socialLinks, reviews, credits, portfolio, team } = studio;

  switch (key) {
    case 'about':
      return richDescription || description ? (
        <section key="about" className="sp-section sp-mag-section">
          <p className="sp-body-text">{richDescription || description}</p>
        </section>
      ) : null;

    case 'gallery':
      return gallery?.length ? (
        <section key="gallery" className="sp-section sp-mag-section">
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
        <section key="services" className="sp-section sp-mag-section">
          <h2 className="sp-heading-md">Services</h2>
          <div className="sp-services-list">
            {services.map((svc, i) => (
              <div key={i} className="sp-service-row">
                <div>
                  <strong>{svc.name}</strong>
                  {svc.description ? <p>{svc.description}</p> : null}
                </div>
                {svc.price != null ? (
                  <span className="sp-service-price">${svc.price}{svc.unit ? <span className="sp-muted">/{svc.unit}</span> : null}</span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null;

    case 'amenities':
      return amenities?.length ? (
        <section key="amenities" className="sp-section sp-mag-section">
          <h2 className="sp-heading-md">Amenities</h2>
          <ul className="sp-list">{amenities.map((a) => <li key={a}>{a}</li>)}</ul>
        </section>
      ) : null;

    case 'equipment':
      return equipment?.length ? (
        <section key="equipment" className="sp-section sp-mag-section">
          <h2 className="sp-heading-md">Equipment</h2>
          <ul className="sp-list">{equipment.map((e) => <li key={e}>{e}</li>)}</ul>
        </section>
      ) : null;

    case 'contact':
      return contactInfo || socialLinks ? (
        <section key="contact" className="sp-section sp-mag-section">
          <h2 className="sp-heading-md">Contact</h2>
          {contactInfo?.phone ? <p>📞 {contactInfo.phone}</p> : null}
          {contactInfo?.email ? <p>✉ <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a></p> : null}
          <SocialRow links={socialLinks} />
        </section>
      ) : null;

    case 'reviews':
      return reviews?.length ? (
        <section key="reviews" className="sp-section sp-mag-section">
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

    case 'credits':
      return credits?.length ? (
        <section key="credits" className="sp-section sp-mag-section">
          <h2 className="sp-heading-md">Credits</h2>
          <div className="sp-mag-credits">
            {credits.map((c, i) => (
              <div key={i} className="sp-mag-credit-row">
                <strong>{c.artistName}</strong>
                {c.projectName ? <span> — {c.projectName}</span> : null}
                {c.role ? <span className="sp-muted"> ({c.role})</span> : null}
                {c.year ? <span className="sp-muted"> {c.year}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null;

    case 'portfolio':
      return portfolio?.length ? (
        <section key="portfolio" className="sp-section sp-mag-section">
          <h2 className="sp-heading-md">Portfolio</h2>
          {portfolio.map((item, i) => (
            <div key={i} style={{ marginBottom: '1.25rem' }}>
              {item.title ? <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>{item.title}</p> : null}
              {item.embedUrl ? (
                <iframe
                  src={item.embedUrl}
                  title={item.title || `Portfolio ${i + 1}`}
                  style={{ width: '100%', height: 200, border: 'none', borderRadius: 8 }}
                  allow="autoplay; encrypted-media"
                />
              ) : null}
              {item.audioUrl ? <audio controls src={item.audioUrl} style={{ width: '100%', marginTop: '0.5rem' }} /> : null}
            </div>
          ))}
        </section>
      ) : null;

    case 'team':
      return team?.length ? (
        <section key="team" className="sp-section sp-mag-section">
          <h2 className="sp-heading-md">Team</h2>
          <div className="sp-mag-team">
            {team.map((m, i) => (
              <div key={i} className="sp-mag-team-member">
                {m.photoUrl ? <img src={m.photoUrl} alt={m.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} /> : null}
                <div>
                  <strong>{m.name}</strong>
                  {m.role ? <p className="sp-muted" style={{ margin: 0 }}>{m.role}</p> : null}
                  {m.bio ? <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{m.bio}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null;

    default:
      return null;
  }
}

export default function LayoutMagazine({ studio, sectionOrder, hiddenSections }) {
  const locationLabel = getDisplayLocation(studio);
  const { name, logoUrl, accentColor, pricePerHour, city, state, rating, reviewCount,
    sessionTypes, contactInfo, socialLinks, id } = studio;

  const effectiveOrder = sectionOrder?.length ? sectionOrder : DEFAULT_SECTION_ORDER;
  const hiddenSet = hiddenSections instanceof Set ? hiddenSections : new Set(hiddenSections || []);

  return (
    <div className="sp-mag">
      {/* Sticky left sidebar */}
      <aside className="sp-mag-sidebar">
        <div className="sp-mag-sidebar-inner">
          {logoUrl ? (
            <img src={logoUrl} alt={`${name} logo`} className="sp-logo" style={{ marginBottom: '1rem' }} />
          ) : null}
          <h1 className="sp-heading-xl" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', marginBottom: '0.4rem' }}>{name}</h1>
          <p className="sp-muted" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            {locationLabel || [city, state].filter(Boolean).join(', ')}
          </p>
          <p style={{ fontWeight: 700, color: 'var(--studio-accent)', marginBottom: '1rem' }}>
            ${pricePerHour}/hr
          </p>
          {rating > 0 ? (
            <p className="sp-rating-row" style={{ marginBottom: '1rem' }}>
              <Stars rating={rating} />
              <span className="sp-muted">{rating.toFixed(1)} ({reviewCount})</span>
            </p>
          ) : null}
          {sessionTypes?.length ? (
            <div className="sp-tags" style={{ marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {sessionTypes.map((t) => (
                <span key={t} className="sp-tag" style={{ borderColor: accentColor }}>{t}</span>
              ))}
            </div>
          ) : null}
          <SocialRow links={socialLinks} />
          {contactInfo?.phone ? <p style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>📞 {contactInfo.phone}</p> : null}
          <Link
            to={`/booking/${id}`}
            className="sp-button-primary"
            style={{ marginTop: 'auto', background: accentColor, color: '#111', display: 'block', textAlign: 'center' }}
          >
            Book a session
          </Link>
          {contactInfo?.bookingUrl ? (
            <a href={contactInfo.bookingUrl} target="_blank" rel="noopener noreferrer" className="sp-button-ghost" style={{ display: 'block', textAlign: 'center', marginTop: '0.5rem' }}>
              External booking
            </a>
          ) : null}
        </div>
      </aside>

      {/* Scrollable right content */}
      <main className="sp-mag-main">
        {effectiveOrder
          .filter((k) => !hiddenSet.has(k))
          .map((key, i) => {
            const section = renderSection(key, studio);
            if (!section) return null;
            return (
              <div key={key} className="sp-mag-numbered-section">
                <span className="sp-mag-section-num">{String(i + 1).padStart(2, '0')}</span>
                {section}
              </div>
            );
          })}
      </main>
    </div>
  );
}
