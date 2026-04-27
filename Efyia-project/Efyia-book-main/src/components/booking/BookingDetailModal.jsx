import { createPortal } from 'react-dom';
import { canRevealBookingAddress, getPrivateAddress } from '../../lib/location';
import FileList from './FileList';

function BookingStatusBadge({ status }) {
  const map = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    AWAITING_FINAL_PAYMENT: 'amber',
  };

  return (
    <span className={`eyf-badge eyf-badge--${map[status] || 'default'}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function AddressCard({ booking }) {
  if (!canRevealBookingAddress(booking)) return null;

  const location = getPrivateAddress(booking?.locationDetails) || getPrivateAddress(booking?.studio);
  if (!location) return null;

  const cityLine = [location.city, location.state, location.postalCode].filter(Boolean).join(', ');

  return (
    <div className="eyf-card" style={{ background: 'var(--bg-subtle)', padding: '1.25rem' }}>
      <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
         Location
      </h4>
      <div style={{ display: 'grid', gap: '0.35rem' }}>
        {location.line1 ? <p style={{ margin: 0, fontSize: '0.95rem' }}>{location.line1}</p> : null}
        {location.line2 ? <p style={{ margin: 0, fontSize: '0.95rem' }}>{location.line2}</p> : null}
        {cityLine ? <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--muted)' }}>{cityLine}</p> : null}
        {location.country ? <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--muted)' }}>{location.country}</p> : null}
        {location.fallback && !location.line1 ? <p style={{ margin: 0, fontSize: '0.95rem' }}>{location.fallback}</p> : null}
        {location.directions ? (
          <p className="eyf-muted" style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
             Directions: {location.directions}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function BookingDetailModal({
  booking,
  onClose,
  canUploadFiles = false,
  currentUserId = null,
  onStatusChange = null,
  onAction = null,
}) {
  if (!booking) return null;
  const finalPaymentPaid = booking.finalPaymentPaid === true || Boolean(booking.finalPaymentDate);
  const finalPaymentRequested = Boolean(booking.finalPaymentIntentId);
  const finalPaymentDue =
    typeof booking.finalPaymentDue === 'number'
      ? booking.finalPaymentDue
      : booking.depositAmount && booking.total
        ? Math.max(booking.total - booking.depositAmount, 0)
        : 0;

  const calculateRemainingBalance = () => {
    if (!booking.depositAmount || !booking.total) return 0;
    return booking.total - booking.depositAmount;
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
      }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '2rem',
          width: 'min(720px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'grid',
          gap: '1.5rem',
        }}
      >
        {/* Header */}
        <div className="eyf-row eyf-row--between eyf-row--start">
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{booking.user?.name || booking.studio?.name || 'Booking'}</h2>
            <p className="eyf-muted" style={{ margin: '0.35rem 0 0' }}>
              {booking.sessionType} · {booking.hours}hr
            </p>
          </div>
          <button
            type="button"
            className="eyf-button eyf-button--ghost"
            onClick={onClose}
            style={{ minHeight: 'unset', padding: '0.5rem 0.7rem', fontSize: '1.2rem' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Status badges */}
        <div className="eyf-row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
          <BookingStatusBadge status={booking.status} />
          {booking.depositPaid && !finalPaymentPaid && finalPaymentRequested && (
            <span className="eyf-badge eyf-badge--amber" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
              FINAL PAYMENT DUE
            </span>
          )}
          {finalPaymentPaid && (
            <span className="eyf-badge eyf-badge--sage" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
              FULLY PAID
            </span>
          )}
        </div>

        {/* Session Details */}
        <div className="eyf-card" style={{ background: 'var(--bg-subtle)', padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
             Session Details
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <span className="eyf-muted" style={{ fontSize: '0.8rem' }}>Date</span>
              <p style={{ margin: '0.2rem 0 0', fontWeight: 700, fontSize: '1rem' }}>{booking.date}</p>
            </div>
            <div>
              <span className="eyf-muted" style={{ fontSize: '0.8rem' }}>Time</span>
              <p style={{ margin: '0.2rem 0 0', fontWeight: 700, fontSize: '1rem' }}>{booking.time}</p>
            </div>
            <div>
              <span className="eyf-muted" style={{ fontSize: '0.8rem' }}>Duration</span>
              <p style={{ margin: '0.2rem 0 0', fontWeight: 700, fontSize: '1rem' }}>{booking.hours} hours</p>
            </div>
            <div>
              <span className="eyf-muted" style={{ fontSize: '0.8rem' }}>Session Type</span>
              <p style={{ margin: '0.2rem 0 0', fontWeight: 700, fontSize: '1rem' }}>{booking.sessionType}</p>
            </div>
          </div>
        </div>

        {/* Address Card */}
        <AddressCard booking={booking} />

        {/* Payment Details */}
        <div className="eyf-card" style={{ background: 'var(--bg-subtle)', padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
             Payment
          </h4>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyf-muted">Total cost</span>
              <strong>${booking.total?.toFixed(2)}</strong>
            </div>
            {booking.depositAmount ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="eyf-muted">Deposit</span>
                <strong style={{ color: 'var(--mint)' }}>−${booking.depositAmount?.toFixed(2)}</strong>
              </div>
            ) : null}
            {booking.depositAmount && !finalPaymentPaid ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
                <strong>Final payment</strong>
                <strong style={{ color: 'var(--mint)', fontSize: '1.1rem' }}>${calculateRemainingBalance().toFixed(2)}</strong>
              </div>
            ) : null}
          </div>
        </div>

        {booking.status === 'AWAITING_FINAL_PAYMENT' ? (
          <div
            className="eyf-card"
            style={{
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.35)',
              padding: '1rem 1.25rem',
              display: 'grid',
              gap: '0.4rem',
            }}
          >
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Final payment required</h4>
            {finalPaymentDue > 0 ? (
              <p style={{ margin: 0, color: 'var(--text)' }}>
                Amount due: <strong>${finalPaymentDue.toFixed(2)}</strong>
              </p>
            ) : null}
            <p className="eyf-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              We couldn&apos;t complete the automatic charge. Ask the client to complete final payment manually.
            </p>
          </div>
        ) : null}

        {/* Files */}
        {['CONFIRMED', 'COMPLETED'].includes(booking.status) ? (
          <div>
            <FileList bookingId={booking.id} canUpload={canUploadFiles} currentUserId={currentUserId} />
          </div>
        ) : null}

        {/* Actions */}
        {onAction ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
            {onAction({
              status: booking.status,
              depositPaid: booking.depositPaid,
              finalPaymentPaid,
              finalPaymentIntentId: booking.finalPaymentIntentId,
            })}
          </div>
        ) : null}

        <button
          type="button"
          className="eyf-button eyf-button--ghost"
          onClick={onClose}
          style={{ justifySelf: 'start' }}
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}
