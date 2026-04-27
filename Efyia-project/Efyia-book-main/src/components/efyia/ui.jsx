import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getDisplayLocation } from '../../lib/location';

export function SectionHeading({ eyebrow, title, description, action }) {
return (
<div className="eyf-section-heading">
{eyebrow ? <p className="eyf-eyebrow">{eyebrow}</p> : null}
<div className="eyf-section-heading__row eyf-row eyf-row--between">
<div>
<h2>{title}</h2>
{description ? <p>{description}</p> : null}
</div>
{action}
</div>
</div>
);
}

export function Stars({ rating }) {
return (
<span className="eyf-stars" aria-label={`${rating} out of 5 stars`}>
{[1, 2, 3, 4, 5].map((value) => (
<span key={value} style={{ color: value <= Math.round(rating) ? '#f59e0b' : 'var(--star-empty)' }}>
★
</span>
))}
</span>
);
}

export function Badge({ children, tone = 'default' }) {
return <span className={`eyf-badge eyf-badge--${tone}`}>{children}</span>;
}

export function Toast({ message, onClose }) {
if (!message) return null;
return (
<div className="eyf-toast" role="status" aria-live="polite">
<span>{message}</span>
<button type="button" onClick={onClose} aria-label="Dismiss notification">✕</button>
</div>
);
}

export function EmptyState({ title, description, action }) {
return (
<div className="eyf-card eyf-empty">
<h3>{title}</h3>
{description ? <p className="eyf-muted">{description}</p> : null}
{action}
</div>
);
}

export function Spinner() {
return (
<div className="eyf-loading-center" aria-label="Loading">
<span className="eyf-spinner" />
</div>
);
}

export function ErrorMessage({ message, onRetry }) {
return (
<div className="eyf-error-box eyf-stack" role="alert">
<p>{message || 'Something went wrong. Please try again.'}</p>
{onRetry ? (
<button type="button" className="eyf-button eyf-button--ghost" onClick={onRetry}>
Retry
</button>
) : null}
</div>
);
}

// ─── Mini carousel for studio cards ──────────────────────────────────────────
function CardCarousel({ images, color, studioName }) {
const [index, setIndex] = useState(0);

// Build slide list - real photos first, then color fallback
const slides = images && images.length > 0 ? images : [];
const hasImages = slides.length > 0;

const prev = (e) => {
e.preventDefault();
e.stopPropagation();
setIndex((i) => (i === 0 ? slides.length - 1 : i - 1));
};

const next = (e) => {
e.preventDefault();
e.stopPropagation();
setIndex((i) => (i === slides.length - 1 ? 0 : i + 1));
};

// Touch swipe support
const [touchStart, setTouchStart] = useState(null);
const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
const handleTouchEnd = (e) => {
if (touchStart === null) return;
const diff = touchStart - e.changedTouches[0].clientX;
if (Math.abs(diff) > 40) {
if (diff > 0) setIndex((i) => (i === slides.length - 1 ? 0 : i + 1));
else setIndex((i) => (i === 0 ? slides.length - 1 : i - 1));
}
setTouchStart(null);
};

return (
<div
className="eyf-card-carousel"
style={{ '--studio-color': color || '#62f3d4' }}
onTouchStart={hasImages ? handleTouchStart : undefined}
onTouchEnd={hasImages ? handleTouchEnd : undefined}
>
{hasImages ? (
<>
{/* Slides */}
<div className="eyf-card-carousel__track">
{slides.map((img, i) => (
<div
key={i}
className="eyf-card-carousel__slide"
style={{
transform: `translateX(${(i - index) * 100}%)`,
backgroundImage: `url(${img.url || img})`,
}}
aria-hidden={i !== index}
/>
))}
</div>

{/* Arrows - only show if more than 1 image */}
{slides.length > 1 ? (
<>
<button
type="button"
className="eyf-card-carousel__btn eyf-card-carousel__btn--prev"
onClick={prev}
aria-label="Previous photo"
>
‹
</button>
<button
type="button"
className="eyf-card-carousel__btn eyf-card-carousel__btn--next"
onClick={next}
aria-label="Next photo"
>
›
</button>

{/* Dots */}
<div className="eyf-card-carousel__dots">
{slides.map((_, i) => (
<button
key={i}
type="button"
className={`eyf-card-carousel__dot${i === index ? ' is-active' : ''}`}
onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIndex(i); }}
aria-label={`Photo ${i + 1}`}
/>
))}
</div>
</>
) : null}
</>
) : (
/* Fallback gradient when no photos */
<div className="eyf-card-carousel__fallback" />
)}
</div>
);
}

export function StudioCard({ studio, onFavoriteToggle, isFavorite = false }) {
const color = studio.color || studio.accentColor || '#62f3d4';
const locationLabel = getDisplayLocation(studio);
const hourlyRate = studio.hourlyRate || studio.pricePerHour || studio.basePrice || null;
const svcPrices = (studio.services || []).map((s) => Number(s.price)).filter((p) => p > 0);
const lowestPrice = svcPrices.length ? Math.min(...svcPrices) : hourlyRate;
const isFromPrice = svcPrices.length > 0 && lowestPrice !== hourlyRate;

// Build image list from gallery, coverUrl, logoUrl in priority order
const images = [];
if (studio.coverUrl) images.push({ url: studio.coverUrl });
if (studio.gallery && studio.gallery.length) {
studio.gallery.forEach((g) => {
if (g.url && g.url !== studio.coverUrl) images.push(g);
});
}

return (
<article className="eyf-card eyf-studio-card">
{/* Carousel replaces the old static media div */}
<div style={{ position: 'relative' }}>
<CardCarousel images={images} color={color} studioName={studio.name} />

<div className="eyf-studio-card__badges" style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 2 }}>
{studio.featured ? <Badge tone="mint">Featured</Badge> : null}
{studio.verified ? <Badge tone="sage">Verified</Badge> : null}
</div>

{onFavoriteToggle ? (
<button
type="button"
className="eyf-favorite"
onClick={() => onFavoriteToggle(studio.id)}
aria-label={isFavorite ? 'Remove from saved' : 'Save studio'}
style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 2 }}
>
{isFavorite ? '♥' : '♡'}
</button>
) : null}

{lowestPrice ? (
<div className="eyf-studio-card__price" aria-label={`${isFromPrice ? 'from ' : ''}$${lowestPrice} per hour`}>
{isFromPrice ? <span style={{ fontSize: '0.72em', fontWeight: 500, opacity: 0.85 }}>from </span> : null}
${lowestPrice}<span style={{ fontWeight: 500, opacity: 0.75 }}>/hr</span>
</div>
) : null}
</div>

<div className="eyf-studio-card__body">
<div className="eyf-row eyf-row--between eyf-row--start">
<div>
<h3 style={{ fontSize: '1rem', margin: '0 0 0.2rem', letterSpacing: '-0.01em' }}>{studio.name}</h3>
<p className="eyf-muted" style={{ margin: 0, fontSize: '0.82rem' }}>
{locationLabel}
</p>
</div>
{(studio.rating > 0) ? (
<div className="eyf-rating-wrap" style={{ textAlign: 'right' }}>
<Stars rating={studio.rating || 0} />
<span className="eyf-muted" style={{ fontSize: '0.78rem' }}>{studio.rating} ({studio.reviewCount || 0})</span>
</div>
) : null}
</div>
<div className="eyf-tags">
{(studio.tags || studio.sessionTypes || []).slice(0, 3).map((tag) => (
<span key={tag} className="eyf-tag">{tag}</span>
))}
</div>
{studio.description ? (
<p className="eyf-muted" style={{ fontSize: '0.875rem', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{studio.description}</p>
) : null}
<div className="eyf-row eyf-row--between">
<Link className="eyf-link-button" to={`/studios/${studio.slug}`}>
View profile
</Link>
<Link className="eyf-link-button eyf-link-button--ghost" to={`/booking/${studio.id}`}>
Book now
</Link>
</div>
</div>
</article>
);
}

// ─── Full-size gallery carousel for profile pages ─────────────────────────────
export function GalleryCarousel({ images, accentColor }) {
const [index, setIndex] = useState(0);
const [lightbox, setLightbox] = useState(false);

if (!images || images.length === 0) return null;

const prev = () => setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
const next = () => setIndex((i) => (i === images.length - 1 ? 0 : i + 1));

const [touchStart, setTouchStart] = useState(null);
const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
const handleTouchEnd = (e) => {
if (touchStart === null) return;
const diff = touchStart - e.changedTouches[0].clientX;
if (Math.abs(diff) > 40) {
if (diff > 0) next();
else prev();
}
setTouchStart(null);
};

const current = images[index];
const currentUrl = current?.url || current;
const currentCaption = current?.caption || '';

return (
<>
{/* Lightbox */}
{lightbox ? (
<div
style={{
position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
}}
onClick={() => setLightbox(false)}
>
<img
src={currentUrl}
alt={currentCaption || `Photo ${index + 1}`}
style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
onClick={(e) => e.stopPropagation()}
/>
<button
type="button"
onClick={() => setLightbox(false)}
style={{
position: 'absolute', top: '1rem', right: '1rem',
background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
width: 40, height: 40, color: 'white', fontSize: '1.25rem', cursor: 'pointer',
}}
aria-label="Close"
>
✕
</button>
{images.length > 1 ? (
<>
<button
type="button"
onClick={(e) => { e.stopPropagation(); prev(); }}
style={{
position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
width: 44, height: 44, color: 'white', fontSize: '1.5rem', cursor: 'pointer',
}}
>
‹
</button>
<button
type="button"
onClick={(e) => { e.stopPropagation(); next(); }}
style={{
position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
width: 44, height: 44, color: 'white', fontSize: '1.5rem', cursor: 'pointer',
}}
>
›
</button>
</>
) : null}
{currentCaption ? (
<p style={{
position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', textAlign: 'center',
background: 'rgba(0,0,0,0.5)', padding: '0.4rem 1rem', borderRadius: 8,
}}>
{currentCaption}
</p>
) : null}
</div>
) : null}

<div
className="eyf-gallery-carousel"
onTouchStart={handleTouchStart}
onTouchEnd={handleTouchEnd}
>
<div
className="eyf-gallery-carousel__main"
onClick={() => setLightbox(true)}
style={{ cursor: 'zoom-in' }}
>
<img
src={currentUrl}
alt={currentCaption || `Studio photo ${index + 1}`}
className="eyf-gallery-carousel__img"
/>
{currentCaption ? (
<div className="eyf-gallery-carousel__caption">{currentCaption}</div>
) : null}
<span className="eyf-gallery-carousel__counter">
{index + 1} / {images.length}
</span>
</div>

{images.length > 1 ? (
<>
<button type="button" className="eyf-gallery-carousel__btn eyf-gallery-carousel__btn--prev" onClick={prev} aria-label="Previous">‹</button>
<button type="button" className="eyf-gallery-carousel__btn eyf-gallery-carousel__btn--next" onClick={next} aria-label="Next">›</button>
</>
) : null}

{images.length > 1 ? (
<div className="eyf-gallery-carousel__thumbs">
{images.map((img, i) => (
<button
key={i}
type="button"
className={`eyf-gallery-carousel__thumb${i === index ? ' is-active' : ''}`}
onClick={() => setIndex(i)}
style={{
backgroundImage: `url(${img.url || img})`,
borderColor: i === index ? (accentColor || 'var(--mint)') : 'transparent',
}}
aria-label={`Photo ${i + 1}`}
/>
))}
</div>
) : null}
</div>
</>
);
}
