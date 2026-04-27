import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { analyticsApi, authApi, bookingsApi, reviewsApi, studioProfileApi, studiosApi, usersApi, depositApi, websiteApi } from '../../lib/api';
import { useAppContext } from '../../context/AppContext';
import TeamManager from '../../components/studio/TeamManager';
import StudioSwitcher from '../../components/studio/StudioSwitcher';
import {
  EmptyState,
  ErrorMessage,
  SectionHeading,
  Spinner,
  StudioCard,
} from '../../components/efyia/ui';
import ProfileSetupWizard from '../../components/studio/ProfileSetupWizard';
import StudioStripeOnboarding from '../../components/stripe/StudioStripeOnboarding';
import BookingCheckout from '../../components/stripe/BookingCheckout';
import SavedCardSection from '../../components/stripe/SavedCardSection';
import FileList from '../../components/booking/FileList';
import BookingDetailModal from '../../components/booking/BookingDetailModal';
import RevenueChart from '../../components/studio/RevenueChart';
import AvailabilityManager from '../../components/studio/AvailabilityManager';
import { canRevealBookingAddress, getPrivateAddress } from '../../lib/location';
import EmailDomainManager from '../../components/efyia/EmailDomainManager';

function getStatusUpdateErrorMessage(error) {
  const message = error?.message || '';
  if (message.includes('Deposit must be paid before completion')) {
    return 'Deposit must be paid before completion. If payment already went through, refresh and try again.';
  }
  if (message.includes('Stripe is not configured for this studio. Final payment cannot be processed.')) {
    return 'Stripe is not configured for this studio. Final payment cannot be processed.';
  }
  return message || 'Could not update booking status.';
}

function getFinalPaymentDueAmount(booking = {}) {
  if (typeof booking.finalPaymentDue === 'number') return Math.max(booking.finalPaymentDue, 0);
  if (typeof booking.total === 'number' && typeof booking.depositAmount === 'number') {
    return Math.max(booking.total - booking.depositAmount, 0);
  }
  return 0;
}

function getManualPaymentNotice(result = {}) {
  if (result?.autoChargeAttempted) {
    return 'Automatic charge attempt failed, so manual payment is required.';
  }
  return 'No saved payment method was available, so manual payment is required.';
}

// ─── Confirm action modal ─────────────────────────────────────────────────────
function ConfirmModal({
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onClose,
  loading,
}) {
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
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '2rem',
          width: 'min(420px, 100%)',
          display: 'grid',
          gap: '1.25rem',
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
          {description}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            className="eyf-button eyf-button--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Go back
          </button>
          <button
            type="button"
            className="eyf-button"
            onClick={onConfirm}
            disabled={loading}
            style={
              danger
                ? {
                    background: 'transparent',
                    borderColor: '#f87171',
                    color: '#f87171',
                  }
                : {}
            }
          >
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AccountSettingsModal({ currentUser, onClose, onSaved, showToast, studioId }) {
  const normalizedAddress = currentUser?.address && typeof currentUser.address === 'object'
    ? currentUser.address
    : currentUser;
  const addressKeys = ['line1', 'line2', 'city', 'state', 'postalCode', 'country'];
  const hasAddressFields = addressKeys.some((key) =>
    Object.prototype.hasOwnProperty.call(normalizedAddress || {}, key)
  );

  const [form, setForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    line1: normalizedAddress?.line1 || '',
    line2: normalizedAddress?.line2 || '',
    city: normalizedAddress?.city || '',
    state: normalizedAddress?.state || '',
    postalCode: normalizedAddress?.postalCode || '',
    country: normalizedAddress?.country || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const profilePayload = {
      name: form.name.trim(),
      email: form.email.trim(),
    };
    if (hasAddressFields) {
      addressKeys.forEach((key) => {
        profilePayload[key] = form[key].trim() || null;
      });
    }

    const shouldUpdateProfile =
      profilePayload.name !== (currentUser?.name || '') ||
      profilePayload.email !== (currentUser?.email || '') ||
      (hasAddressFields && addressKeys.some((key) => {
        const currentValue = normalizedAddress?.[key] ?? '';
        const nextValue = profilePayload[key] ?? '';
        return currentValue !== nextValue;
      }));

    const hasAnyPasswordInput = Boolean(
      form.currentPassword.trim() || form.newPassword.trim() || form.confirmPassword.trim()
    );
    if (hasAnyPasswordInput) {
      if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
        setError('Complete all password fields to change your password.');
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        setError('New password and confirmation do not match.');
        return;
      }
    }

    if (!shouldUpdateProfile && !hasAnyPasswordInput) {
      setError('No changes to save yet.');
      return;
    }

    setSaving(true);
    try {
      if (shouldUpdateProfile) {
        await usersApi.updateMe(profilePayload);
      }
      if (hasAnyPasswordInput) {
        await usersApi.changePassword({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        });
      }
      await onSaved?.();
      showToast?.('Account settings updated.');
      onClose?.();
    } catch (err) {
      setError(err.message || 'Unable to update account settings.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 220,
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Account settings"
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '1.4rem',
          width: 'min(640px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'grid',
          gap: '1.5rem',
        }}
      >
        <form className="eyf-stack" onSubmit={handleSubmit}>
          <div className="eyf-row eyf-row--between" style={{ alignItems: 'start' }}>
            <div>
              <h3 style={{ margin: 0 }}>Account settings</h3>
              <p className="eyf-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
                Update your profile details and optionally change your password.
              </p>
            </div>
            <button type="button" className="eyf-button eyf-button--ghost" onClick={onClose} disabled={saving}>
              Close
            </button>
          </div>

          {error ? <ErrorMessage message={error} /> : null}

          <div className="eyf-form-grid">
            <label className="eyf-field">
              <span>Name</span>
              <input type="text" value={form.name} onChange={setField('name')} required />
            </label>
            <label className="eyf-field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={setField('email')} required />
            </label>
          </div>

          {hasAddressFields ? (
            <>
              <h4 style={{ margin: 0 }}>Address</h4>
              <div className="eyf-form-grid">
                <label className="eyf-field">
                  <span>Address line 1</span>
                  <input type="text" value={form.line1} onChange={setField('line1')} />
                </label>
                <label className="eyf-field">
                  <span>Address line 2</span>
                  <input type="text" value={form.line2} onChange={setField('line2')} />
                </label>
                <label className="eyf-field">
                  <span>City</span>
                  <input type="text" value={form.city} onChange={setField('city')} />
                </label>
                <label className="eyf-field">
                  <span>State</span>
                  <input type="text" value={form.state} onChange={setField('state')} />
                </label>
                <label className="eyf-field">
                  <span>Postal code</span>
                  <input type="text" value={form.postalCode} onChange={setField('postalCode')} />
                </label>
                <label className="eyf-field">
                  <span>Country</span>
                  <input type="text" value={form.country} onChange={setField('country')} />
                </label>
              </div>
            </>
          ) : null}

          <h4 style={{ margin: 0 }}>Change password (optional)</h4>
          <div className="eyf-form-grid">
            <label className="eyf-field">
              <span>Current password</span>
              <input type="password" value={form.currentPassword} onChange={setField('currentPassword')} autoComplete="current-password" />
            </label>
            <label className="eyf-field">
              <span>New password</span>
              <input type="password" value={form.newPassword} onChange={setField('newPassword')} autoComplete="new-password" />
            </label>
            <label className="eyf-field">
              <span>Confirm new password</span>
              <input type="password" value={form.confirmPassword} onChange={setField('confirmPassword')} autoComplete="new-password" />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'end', gap: '0.75rem' }}>
            <button type="button" className="eyf-button eyf-button--ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="eyf-button" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />
        <SavedCardSection studioId={studioId} showToast={showToast} />
      </div>
    </div>,
    document.body
  );
}

// ─── Booking status badge ─────────────────────────────────────────────────────
function BookingStatusBadge({ status }) {
  const map = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  };

  return (
    <span className={`eyf-badge eyf-badge--${map[status] || 'default'}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function BookingLocationDetails({ booking }) {
  const [open, setOpen] = useState(false);
  if (!canRevealBookingAddress(booking)) return null;

  const location = getPrivateAddress(booking?.locationDetails) || getPrivateAddress(booking?.studio);
  if (!location) return null;

  const cityLine = [location.city, location.state, location.postalCode].filter(Boolean).join(', ');

  return (
    <div className="eyf-stack" style={{ gap: '0.45rem', marginTop: '0.4rem' }}>
      <button
        type="button"
        className="eyf-button eyf-button--ghost"
        style={{ justifySelf: 'start', minHeight: 'unset', padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? 'Hide location details' : 'View address'}
      </button>
      {open ? (
        <div className="eyf-card" style={{ background: 'var(--bg-subtle)', padding: '0.8rem 0.9rem' }}>
          {location.line1 ? <p style={{ margin: 0 }}>{location.line1}</p> : null}
          {location.line2 ? <p style={{ margin: '0.2rem 0 0' }}>{location.line2}</p> : null}
          {cityLine ? <p style={{ margin: '0.2rem 0 0' }}>{cityLine}</p> : null}
          {location.country ? <p style={{ margin: '0.2rem 0 0' }}>{location.country}</p> : null}
          {location.fallback && !location.line1 ? <p style={{ margin: '0.2rem 0 0' }}>{location.fallback}</p> : null}
          {location.directions ? (
            <p className="eyf-muted" style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap' }}>
              {location.directions}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function isFinalPaymentPaid(booking) {
  return booking?.finalPaymentPaid === true || Boolean(booking?.finalPaymentDate);
}

function hasFinalPaymentRequest(booking) {
  return Boolean(booking?.finalPaymentIntentId);
}

// ─── Client booking rows ──────────────────────────────────────────────────────
function ClientBookingRows({ bookings, onCancel, currentUserId, reviewedStudioIds = new Set(), showToast }) {
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [finalPaymentBooking, setFinalPaymentBooking] = useState(null);
  const [finalPaymentCheckout, setFinalPaymentCheckout] = useState(null);
  const [processingFinalPayment, setProcessingFinalPayment] = useState(false);
  const [finalPaymentError, setFinalPaymentError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');

  if (!bookings.length) {
    return (
      <EmptyState
        title="No bookings yet"
        description="Your confirmed bookings will appear here."
      />
    );
  }

  const handleConfirmCancel = async () => {
    setCancelling(true);
    await onCancel(confirmCancel.id);
    setCancelling(false);
    setConfirmCancel(null);
  };

  const handleFinalPaymentSuccess = () => {
    showToast?.('Final payment completed.');
    window.location.reload();
  };

  const handleOpenFinalPayment = async (booking) => {
    if (!booking?.id) return;
    setProcessingFinalPayment(true);
    setFinalPaymentError('');
    setFinalPaymentCheckout(null);
    try {
      const paymentIntent = await depositApi.getFinalClientSecret(booking.id);
      setFinalPaymentCheckout({ ...paymentIntent, booking });
      setFinalPaymentBooking(booking);
      setSelectedBooking(null);
    } catch (err) {
      setFinalPaymentError(err.message || 'Unable to load final payment.');
      showToast?.(err.message || 'Unable to load final payment.');
    } finally {
      setProcessingFinalPayment(false);
    }
  };

  const groupedBookings = {
    upcoming: bookings.filter((b) => ['PENDING', 'CONFIRMED', 'AWAITING_FINAL_PAYMENT'].includes(b.status)),
    completed: bookings.filter((b) => b.status === 'COMPLETED'),
    cancelled: bookings.filter((b) => b.status === 'CANCELLED'),
  };

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', count: groupedBookings.upcoming.length, color: 'var(--mint)' },
    { id: 'completed', label: 'Completed', count: groupedBookings.completed.length, color: 'var(--sage)' },
    { id: 'cancelled', label: 'Cancelled', count: groupedBookings.cancelled.length, color: 'var(--earth)' },
  ];

  const activeBookings = groupedBookings[activeTab] || [];

  return (
    <>
      {confirmCancel ? (
        <ConfirmModal
          title="Cancel booking?"
          description={`Cancel your ${confirmCancel.sessionType} session at ${confirmCancel.studio?.name} on ${confirmCancel.date} at ${confirmCancel.time}? This cannot be undone.`}
          confirmLabel="Yes, cancel booking"
          danger
          loading={cancelling}
          onConfirm={handleConfirmCancel}
          onClose={() => setConfirmCancel(null)}
        />
      ) : null}

      {selectedBooking ? (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          canUploadFiles={false}
          currentUserId={currentUserId}
          onAction={({ status, depositPaid, finalPaymentPaid, finalPaymentIntentId }) => {
            const actions = [];

            if (status === 'COMPLETED' && selectedBooking?.studio?.slug) {
              if (reviewedStudioIds.has(selectedBooking.studio.id)) {
                actions.push(
                  <span key="reviewed" className="eyf-badge eyf-badge--sage" style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}>
                    ✓ Reviewed
                  </span>
                );
              } else {
                actions.push(
                  <Link
                    key="review"
                    to={`/studios/${selectedBooking.studio.slug}?tab=reviews`}
                    className="eyf-button"
                    onClick={() => setSelectedBooking(null)}
                  >
                    Leave a Review
                  </Link>
                );
              }
            }

            if (['PENDING', 'CONFIRMED'].includes(status) && !depositPaid) {
              actions.push(
                <button
                  key="cancel"
                  type="button"
                  className="eyf-button eyf-button--ghost"
                  style={{ color: '#f87171', borderColor: '#f87171' }}
                  onClick={() => {
                    setSelectedBooking(null);
                    setConfirmCancel(selectedBooking);
                  }}
                >
                  Cancel Booking
                </button>
              );
            }

            if (depositPaid && !finalPaymentPaid && finalPaymentIntentId) {
              actions.push(
                <button
                  key="payment"
                  type="button"
                  className="eyf-button eyf-button--secondary"
                  onClick={() => handleOpenFinalPayment(selectedBooking)}
                  disabled={processingFinalPayment}
                >
                  {processingFinalPayment ? 'Loading...' : 'Pay Remaining Balance'}
                </button>
              );
            }

            if (depositPaid && !finalPaymentPaid && !finalPaymentIntentId) {
              actions.push(
                <div key="payment-pending" className="eyf-muted" style={{ fontSize: '0.88rem' }}>
                  Final payment has not been requested by the studio yet.
                </div>
              );
            }

            if (finalPaymentPaid) {
              actions.push(
                <span key="payment-complete" className="eyf-badge eyf-badge--sage" style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}>
                  Final payment completed
                </span>
              );
            }

            if (['CANCELLED', 'COMPLETED'].includes(status) && selectedBooking?.studio?.id) {
              actions.push(
                <Link
                  key="bookagin"
                  to={`/booking/${selectedBooking.studio.id}`}
                  className="eyf-button eyf-button--secondary"
                  onClick={() => setSelectedBooking(null)}
                >
                  Book again
                </Link>
              );
            }

            return actions;
          }}
        />
      ) : null}

      {finalPaymentBooking && finalPaymentBooking.id ? createPortal(
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
            if (e.target === e.currentTarget) {
              setFinalPaymentBooking(null);
              setFinalPaymentCheckout(null);
              setFinalPaymentError('');
            }
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '2rem',
              width: 'min(520px, 100%)',
              display: 'grid',
              gap: '1.25rem',
            }}
          >
            <div>
              <p
                style={{
                  margin: '0 0 0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--mint)',
                }}
              >
                Payment due
              </p>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Pay Remaining Balance</h2>
              <p
                style={{
                  margin: '0.25rem 0 0',
                  color: 'var(--muted)',
                  fontSize: '0.9rem',
                }}
              >
                {finalPaymentBooking.studio?.name}
              </p>
            </div>

            <div
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--muted)' }}>Session</span>
                <strong>{finalPaymentBooking.date} at {finalPaymentBooking.time}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--muted)' }}>Total session cost</span>
                <strong>${finalPaymentBooking.total?.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--muted)' }}>Deposit paid</span>
                <strong style={{ color: 'var(--mint)' }}>−${finalPaymentBooking.depositAmount?.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                <strong>Balance due</strong>
                <strong style={{ color: 'var(--mint)' }}>${((finalPaymentCheckout?.amountCents || 0) / 100).toFixed(2)}</strong>
              </div>
            </div>

            {finalPaymentError ? (
              <ErrorMessage message={finalPaymentError} />
            ) : null}

            {finalPaymentCheckout?.clientSecret ? (
              <BookingCheckout
                clientSecret={finalPaymentCheckout.clientSecret}
                connectedAccountId={finalPaymentCheckout.connectedAccountId}
                bookingId={finalPaymentBooking.id}
                studioName={finalPaymentBooking.studio?.name || 'Studio'}
                amountCents={finalPaymentCheckout.amountCents}
                bookingDetails={{
                  date: finalPaymentBooking.date,
                  time: finalPaymentBooking.time,
                  duration: `${finalPaymentBooking.hours}hr`,
                }}
                onSuccess={handleFinalPaymentSuccess}
                onError={(message) => setFinalPaymentError(message)}
                paymentLabel="Final payment due"
              />
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                Final payment is not yet requested. Please check back later.
              </p>
            )}

            <div>
              <button
                type="button"
                className="eyf-button eyf-button--ghost"
                onClick={() => {
                  setFinalPaymentBooking(null);
                  setFinalPaymentCheckout(null);
                  setFinalPaymentError('');
                }}
                disabled={processingFinalPayment}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Tab Navigation */}
      <div className="eyf-stack" style={{ gap: '1.25rem' }}>
        <div className="eyf-booking-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`eyf-booking-tab-btn eyf-button eyf-button--ghost ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : 'none',
                color: activeTab === tab.id ? tab.color : 'var(--muted)',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="eyf-booking-tab-badge" style={{ background: tab.color }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Booking Cards */}
        {activeBookings.length === 0 ? (
          <EmptyState
            title={`No ${activeTab} bookings`}
            description={`Check back soon for new ${activeTab} bookings.`}
          />
        ) : (
          <div className="eyf-stack" style={{ gap: '0.75rem' }}>
            {activeBookings.map((booking) => (
              <article
                key={booking.id}
                className="eyf-card"
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid var(--border)',
                }}
                onClick={() => setSelectedBooking(booking)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedBooking(booking);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="eyf-row eyf-row--between eyf-row--start">
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{booking.studio?.name || 'Studio'}</h3>
                    <p className="eyf-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
                      {booking.date} · {booking.time} · {booking.sessionType} · {booking.hours}hr
                    </p>
                    <BookingLocationDetails booking={booking} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '1.1rem' }}>${booking.total?.toFixed(2)}</strong>
                    {booking.depositPaid && !isFinalPaymentPaid(booking) && hasFinalPaymentRequest(booking) && (
                      <span className="eyf-badge eyf-badge--amber" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
                        FINAL DUE
                      </span>
                    )}
                    {isFinalPaymentPaid(booking) && (
                      <span className="eyf-badge eyf-badge--sage" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
                        PAID
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Click to view details
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Studio owner booking rows (organized by status) ─────────────────────────
function OwnerBookingRows({ bookings, onStatusChange, currentUserId, showToast }) {
  const [confirmAction, setConfirmAction] = useState(null);
  const [acting, setActing] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [finalPaymentLoading, setFinalPaymentLoading] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (!selectedBooking?.id) return;
    const updatedBooking = bookings.find((booking) => booking.id === selectedBooking.id);
    if (updatedBooking) {
      setSelectedBooking(updatedBooking);
    }
  }, [bookings, selectedBooking?.id]);

  if (!bookings.length) {
    return (
      <EmptyState
        title="No bookings yet"
        description="Booking requests will appear here."
      />
    );
  }

  const handleConfirm = async () => {
    if (!confirmAction || acting || statusUpdating) return;
    setActing(true);
    setStatusUpdating(true);
    try {
      await onStatusChange(confirmAction.booking.id, confirmAction.action);
      setConfirmAction(null);
    } finally {
      setActing(false);
      setStatusUpdating(false);
    }
  };

  const handleRequestFinalPayment = async (bookingId) => {
    if (finalPaymentLoading || statusUpdating) return;
    setFinalPaymentLoading(bookingId);
    try {
      await depositApi.payFinal(bookingId);
      showToast?.('Final payment requested from client.');
      window.location.reload();
    } catch (err) {
      showToast?.(getStatusUpdateErrorMessage(err));
    } finally {
      setFinalPaymentLoading(null);
    }
  };

  const groupedBookings = {
    pending: bookings.filter((b) => b.status === 'PENDING'),
    confirmed: bookings.filter((b) => ['CONFIRMED', 'AWAITING_FINAL_PAYMENT'].includes(b.status)),
    completed: bookings.filter((b) => b.status === 'COMPLETED'),
    cancelled: bookings.filter((b) => b.status === 'CANCELLED'),
  };

  const tabs = [
    { id: 'pending', label: 'Pending', count: groupedBookings.pending.length, color: 'var(--amber)' },
    { id: 'confirmed', label: 'Confirmed', count: groupedBookings.confirmed.length, color: 'var(--mint)' },
    { id: 'completed', label: 'Completed', count: groupedBookings.completed.length, color: 'var(--sage)' },
    { id: 'cancelled', label: 'Cancelled', count: groupedBookings.cancelled.length, color: 'var(--earth)' },
  ];

  const activeBookings = groupedBookings[activeTab] || [];

  return (
    <>
      {confirmAction ? (
        <ConfirmModal
          title={
            confirmAction.action === 'CONFIRMED'
              ? 'Confirm booking?'
              : confirmAction.action === 'COMPLETED'
                ? 'Mark as completed?'
                : 'Cancel booking?'
          }
          description={
            confirmAction.action === 'CONFIRMED'
              ? `Confirm the ${confirmAction.booking.sessionType} session on ${confirmAction.booking.date} at ${confirmAction.booking.time}? The client will be notified.`
              : confirmAction.action === 'COMPLETED'
                ? (() => {
                    const finalPaymentOwed =
                      confirmAction.booking.depositPaid &&
                      confirmAction.booking.depositAmount != null &&
                      (confirmAction.booking.total - confirmAction.booking.depositAmount) > 0 &&
                      !confirmAction.booking.finalPaymentPaid;

                    return finalPaymentOwed
                      ? `This booking has an outstanding balance of $${(confirmAction.booking.total - confirmAction.booking.depositAmount).toFixed(2)}. Mark as complete to request the remaining payment from the customer.`
                      : 'Mark this session as completed? This will finalize the booking.';
                  })()
                : `Cancel this booking for ${confirmAction.booking.user?.name}? This cannot be undone.`
          }
          confirmLabel={
            confirmAction.action === 'CONFIRMED'
              ? 'Confirm session'
              : confirmAction.action === 'COMPLETED'
                ? 'Mark complete'
                : 'Cancel booking'
          }
          danger={confirmAction.action === 'CANCELLED'}
          loading={acting}
          onConfirm={handleConfirm}
          onClose={() => setConfirmAction(null)}
        />
      ) : null}

      {selectedBooking ? (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          canUploadFiles={true}
          currentUserId={currentUserId}
          onAction={({ status, depositPaid, finalPaymentPaid, finalPaymentIntentId }) => {
            const actions = [];

            if (status === 'PENDING') {
              actions.push(
                <button
                  key="confirm"
                  type="button"
                  className="eyf-button eyf-button--secondary"
                  onClick={() => {
                    setSelectedBooking(null);
                    setConfirmAction({ booking: selectedBooking, action: 'CONFIRMED' });
                  }}
                >
                  Confirm
                </button>,
                <button
                  key="decline"
                  type="button"
                  className="eyf-button eyf-button--ghost"
                  style={{ color: '#f87171', borderColor: '#f87171' }}
                  onClick={() => {
                    setSelectedBooking(null);
                    setConfirmAction({ booking: selectedBooking, action: 'CANCELLED' });
                  }}
                >
                  Decline
                </button>
              );
            }

            if (status === 'AWAITING_FINAL_PAYMENT') {
              actions.push(
                <div key="awaiting-payment" style={{ display: 'grid', gap: '0.5rem' }}>
                  <span className="eyf-badge eyf-badge--amber">
                    Final payment required{getFinalPaymentDueAmount(selectedBooking) > 0 ? ` · $${getFinalPaymentDueAmount(selectedBooking).toFixed(2)} due` : ''}
                  </span>
                  <p className="eyf-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                    {getManualPaymentNotice(selectedBooking)}
                  </p>
                  <button
                    type="button"
                    className="eyf-button eyf-button--secondary"
                    onClick={() => handleRequestFinalPayment(selectedBooking.id)}
                    disabled={finalPaymentLoading === selectedBooking.id || statusUpdating}
                  >
                    {finalPaymentLoading === selectedBooking.id ? 'Requesting...' : 'Complete Payment'}
                  </button>
                </div>
              );
            }

            if (status === 'COMPLETED') {
              if (depositPaid && !finalPaymentPaid && !finalPaymentIntentId) {
                actions.push(
                  <button
                    key="payment"
                    type="button"
                    className="eyf-button eyf-button--secondary"
                    onClick={() => handleRequestFinalPayment(selectedBooking.id)}
                    disabled={finalPaymentLoading === selectedBooking.id}
                  >
                    {finalPaymentLoading === selectedBooking.id ? 'Requesting...' : 'Request Final Payment'}
                  </button>
                );
              }
              if (depositPaid && !finalPaymentPaid && finalPaymentIntentId) {
                actions.push(
                  <span key="requested" className="eyf-badge eyf-badge--amber">
                    Final payment requested
                  </span>
                );
              }
            }

            if (status === 'CONFIRMED') {
              const hasUnpaidFinalPayment =
                depositPaid &&
                selectedBooking.depositAmount != null &&
                (selectedBooking.total - selectedBooking.depositAmount) > 0 &&
                !finalPaymentPaid;

              if (hasUnpaidFinalPayment && !finalPaymentIntentId) {
                actions.push(
                  <button
                    key="request-payment"
                    type="button"
                    className="eyf-button eyf-button--secondary"
                    onClick={() => handleRequestFinalPayment(selectedBooking.id)}
                    disabled={finalPaymentLoading === selectedBooking.id}
                  >
                    {finalPaymentLoading === selectedBooking.id ? 'Requesting...' : 'Request Final Payment'}
                  </button>
                );
              }

              if (hasUnpaidFinalPayment && finalPaymentIntentId) {
                actions.push(
                  <span key="requested" className="eyf-badge eyf-badge--amber">
                    Final payment requested
                  </span>
                );
              }

              actions.push(
                <button
                  key="complete"
                  type="button"
                  className="eyf-button eyf-button--ghost"
                  onClick={() => {
                    if (statusUpdating) return;
                    setSelectedBooking(null);
                    setConfirmAction({ booking: selectedBooking, action: 'COMPLETED' });
                  }}
                  disabled={statusUpdating}
                  title={hasUnpaidFinalPayment && !finalPaymentIntentId ? 'Request final payment from customer before completing' : ''}
                >
                  {statusUpdating ? 'Updating…' : 'Mark Complete'}
                </button>,
                <button
                  key="cancel"
                  type="button"
                  className="eyf-button eyf-button--ghost"
                  style={{ color: '#f87171', borderColor: '#f87171' }}
                  onClick={() => {
                    if (statusUpdating) return;
                    setSelectedBooking(null);
                    setConfirmAction({ booking: selectedBooking, action: 'CANCELLED' });
                  }}
                  disabled={statusUpdating}
                >
                  Cancel
                </button>
              );
            }

            return actions;
          }}
        />
      ) : null}

      {/* Tab Navigation */}
      <div className="eyf-stack" style={{ gap: '1.25rem' }}>
        <div className="eyf-booking-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`eyf-booking-tab-btn eyf-button eyf-button--ghost ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : 'none',
                color: activeTab === tab.id ? tab.color : 'var(--muted)',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="eyf-booking-tab-badge" style={{ background: tab.color }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Booking Cards Grid */}
        {activeBookings.length === 0 ? (
          <EmptyState
            title={`No ${activeTab} bookings`}
            description={`Check back soon for new ${activeTab} booking requests.`}
          />
        ) : (
          <div className="eyf-stack" style={{ gap: '0.75rem' }}>
            {activeBookings.map((booking) => (
              <article
                key={booking.id}
                className="eyf-card"
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid var(--border)',
                }}
                onClick={() => setSelectedBooking(booking)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedBooking(booking);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="eyf-row eyf-row--between eyf-row--start">
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{booking.user?.name || 'Client'}</h3>
                    <p className="eyf-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
                      {booking.date} · {booking.time} · {booking.sessionType} · {booking.hours}hr
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '1.1rem' }}>${booking.total?.toFixed(2)}</strong>
                    {booking.depositPaid && !isFinalPaymentPaid(booking) && hasFinalPaymentRequest(booking) && (
                      <span className="eyf-badge eyf-badge--amber" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
                        FINAL DUE
                      </span>
                    )}
                    {isFinalPaymentPaid(booking) && (
                      <span className="eyf-badge eyf-badge--sage" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
                        PAID
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Click to view details
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Profile completion widget ────────────────────────────────────────────────
function calcCompletion(studio) {
  if (!studio) return { pct: 0, checklist: [] };

  const checks = [
    { label: 'Studio name', done: !!studio.name?.trim() },
    { label: 'Profile picture (logo)', done: !!studio.logoUrl },
    { label: 'Cover photo', done: !!studio.coverUrl },
    { label: 'Bio & story', done: !!studio.richDescription?.trim() },
    { label: 'At least 1 service', done: !!studio.services?.length },
    {
      label: 'Contact info',
      done: !!(studio.contactInfo?.email || studio.contactInfo?.phone),
    },
    { label: 'Gallery photos', done: !!studio.gallery?.length },
    { label: 'Genre tags', done: !!studio.genres?.length },
    { label: 'Credits', done: !!studio.credits?.length },
    {
      label: 'Social links',
      done: !!(
        studio.socialLinks &&
        Object.values(studio.socialLinks).some(Boolean)
      ),
    },
  ];

  const done = checks.filter((c) => c.done).length;

  return {
    pct: Math.round((done / checks.length) * 100),
    checklist: checks,
  };
}

function CompletionWidget({ studio, onSetupClick }) {
  const { pct, checklist } = calcCompletion(studio);

  if (pct === 100) {
    return (
      <div className="eyf-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--sage)' }}>100%</span>
        <button
          type="button"
          className="eyf-button eyf-button--ghost"
          style={{ minHeight: 'unset', padding: '0.35rem 0.85rem', fontSize: '0.875rem' }}
          onClick={onSetupClick}
        >
          Edit profile
        </button>
      </div>
    );
  }

  return (
    <div className="eyf-card eyf-stack">
      <div className="eyf-row eyf-row--between">
        <h3 style={{ margin: 0 }}>Profile completion</h3>
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: 'var(--muted)',
          }}
        >
          {pct}%
        </span>
      </div>

      <div className="eyf-completion-widget">
        <div className="eyf-completion-track">
          <div className="eyf-completion-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="eyf-completion-checklist">
          {checklist.map((item) => (
            <div
              key={item.label}
              className={`eyf-completion-item${item.done ? ' is-done' : ''}`}
            >
              <span className="eyf-completion-dot">{item.done ? '✓' : ''}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="eyf-button eyf-button--secondary"
        style={{ justifySelf: 'start' }}
        onClick={onSetupClick}
      >
        Complete setup
      </button>
    </div>
  );
}

// ─── Client dashboard ─────────────────────────────────────────────────────────
export function ClientDashboard() {
  const { currentUser, favoriteStudioIds, toggleFavorite, showToast, reloadCurrentUser } =
    useAppContext();

  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewedStudioIds, setReviewedStudioIds] = useState(new Set());
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [bkgs, { studios }] = await Promise.all([
        bookingsApi.list().catch(() => []),
        studiosApi.list({ limit: 50 }).catch(() => ({ studios: [] })),
      ]);

      setBookings(bkgs);
      setFavorites(studios.filter((s) => favoriteStudioIds.includes(s.id)));

      // Check which studios the current user has already reviewed
      const completedStudioIds = [...new Set(
        bkgs
          .filter((b) => b.status === 'COMPLETED' && b.studio?.id)
          .map((b) => b.studio.id),
      )];

      if (completedStudioIds.length > 0 && currentUser?.id) {
        const reviewResults = await Promise.all(
          completedStudioIds.map((id) => reviewsApi.listByStudio(id).catch(() => [])),
        );
        const reviewed = new Set();
        reviewResults.forEach((reviews, i) => {
          if (reviews.some((r) => r.user?.id === currentUser.id || r.userId === currentUser.id)) {
            reviewed.add(completedStudioIds[i]);
          }
        });
        setReviewedStudioIds(reviewed);
      }

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [favoriteStudioIds, currentUser?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancel = async (bookingId) => {
    try {
      const result = await bookingsApi.updateStatus(bookingId, 'CANCELLED');

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: 'CANCELLED' } : b
        )
      );

      if (result.refund?.refundId) {
        showToast('Booking cancelled. Refund issued — allow 5–10 business days.');
      } else if (result.refund?.status === 'cancelled_before_capture') {
        showToast('Booking cancelled. You were not charged.');
      } else if (result.refund?.error) {
        showToast('Booking cancelled. Contact support about your refund.');
      } else {
        showToast('Booking cancelled.');
      }
    } catch (err) {
      showToast(err.message || 'Could not cancel booking.');
    }
  };

  const latestStudioId = bookings.find((b) => b.studio?.id)?.studio?.id ?? null;

  return (
    <div className="eyf-page">
      {showAccountSettings ? (
        <AccountSettingsModal
          currentUser={currentUser}
          onClose={() => setShowAccountSettings(false)}
          onSaved={reloadCurrentUser}
          showToast={showToast}
          studioId={latestStudioId}
        />
      ) : null}
      <div className="eyf-client-dashboard">
        <section className="eyf-section eyf-stack">
          <SectionHeading
            eyebrow="Client dashboard"
            title={`Welcome back, ${currentUser?.name}`}
          />
          
          <button
            type="button"
            className="eyf-button eyf-button--secondary"
            style={{ width: 'fit-content' }}
            onClick={() => setShowAccountSettings(true)}
          >
            Account settings
          </button>
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorMessage message={error} onRetry={fetchData} />
          ) : (
            <>
              <h3>Your bookings</h3>
              <ClientBookingRows
                bookings={bookings}
                onCancel={handleCancel}
                currentUserId={currentUser?.id}
                reviewedStudioIds={reviewedStudioIds}
                showToast={showToast}
              />

              {favorites.length > 0 ? (
                <>
                  <SectionHeading
                    eyebrow="Saved studios"
                    title="Quick access to your saved rooms"
                  />
                  <div className="eyf-card-grid">
                    {favorites.map((studio) => (
                      <StudioCard
                        key={studio.id}
                        studio={studio}
                        isFavorite={favoriteStudioIds.includes(studio.id)}
                        onFavoriteToggle={toggleFavorite}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Studio owner dashboard ───────────────────────────────────────────────────
export function StudioDashboard() {
  const { currentUser, showToast, studioMemberships, activeStudioId, setActiveStudio, canEditProfile, canManageBookings, reloadCurrentUser } = useAppContext();

  const [bookings, setBookings] = useState([]);
  const [studio, setStudio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [websiteData, setWebsiteData] = useState(null);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      bookingsApi.list().catch(() => []),
      studioProfileApi.get(activeStudioId).catch(() => null),
      studiosApi.list({ limit: 50 }).catch(() => ({ studios: [] })),
      analyticsApi.studio().catch(() => null),
    ])
      .then(([bkgs, profile, { studios }, analytics]) => {
        setBookings(bkgs);
        setAnalyticsData(analytics);

        if (profile) {
          setStudio(profile);
          const wizardKey = `efyia_wizard_seen_${profile.id}`;
          if (!localStorage.getItem(wizardKey) && !profile.richDescription?.trim()) {
            setShowWizard(true);
          }
          // Load website data
          websiteApi.get(profile.id).then(setWebsiteData).catch(() => {});
        } else {
          const owned = studios.find(
            (s) => s.owner?.id === currentUser?.id || s.ownerId === currentUser?.id
          );
          if (owned) {
            setStudio(owned);
            websiteApi.get(owned.id).then(setWebsiteData).catch(() => {});
          }
        }

        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [currentUser?.id, activeStudioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (bookingId, status) => {
    try {
      const result = await bookingsApi.updateStatus(bookingId, status);
      const refreshedBookingResponse = await bookingsApi.getById(bookingId).catch(() => null);
      const refreshedBooking =
        refreshedBookingResponse?.booking && typeof refreshedBookingResponse.booking === 'object'
          ? refreshedBookingResponse.booking
          : refreshedBookingResponse;
      const latestBooking = refreshedBooking || result;

      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? latestBooking : b))
      );

      if (status === 'CANCELLED') {
        if (latestBooking.refund?.refundId) {
          showToast('Booking cancelled. Client refund has been issued.');
        } else if (latestBooking.refund?.error) {
          showToast(
            'Booking cancelled. Refund could not be processed — check Stripe dashboard.'
          );
        } else if (latestBooking.refund?.status === 'cancelled_before_capture') {
          showToast('Booking cancelled. Payment was voided before capture.');
        } else {
          showToast('Booking cancelled.');
        }
      } else if (latestBooking.status === 'AWAITING_FINAL_PAYMENT' && latestBooking.requiresManualPayment) {
        const amountDue = getFinalPaymentDueAmount(latestBooking);
        showToast(
          amountDue > 0
            ? `Final payment required. $${amountDue.toFixed(2)} is still due.`
            : 'Final payment required. Please complete payment manually.'
        );
      } else if (latestBooking.status === 'AWAITING_FINAL_PAYMENT') {
        showToast('Awaiting final payment from client. Payment request sent.');
      } else if (status === 'CONFIRMED') {
        showToast('Booking confirmed.');
      } else if (latestBooking.status === 'COMPLETED') {
        showToast('Booking completed successfully.');
      }
    } catch (err) {
      showToast(getStatusUpdateErrorMessage(err));
    }
  };

  const handleWizardFinished = (updated) => {
    setStudio(updated);
    setShowWizard(false);
    if (studio?.id) localStorage.setItem(`efyia_wizard_seen_${studio.id}`, '1');
    showToast('Profile set up successfully!');
  };

  const handleWizardDismiss = () => {
    setShowWizard(false);
    if (studio?.id) localStorage.setItem(`efyia_wizard_seen_${studio.id}`, '1');
  };

  const revenue = bookings.filter((b) => ['CONFIRMED', 'COMPLETED'].includes(b.status))
    .reduce((sum, b) => sum + (b.subtotal || 0), 0);

  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;

  return (
    <>
      {showAccountSettings ? (
        <AccountSettingsModal
          currentUser={currentUser}
          onClose={() => setShowAccountSettings(false)}
          onSaved={reloadCurrentUser}
          showToast={showToast}
          studioId={activeStudioId}
        />
      ) : null}
      {showWizard && studio ? (
        <ProfileSetupWizard
          studio={studio}
          onFinished={handleWizardFinished}
          onDismiss={handleWizardDismiss}
        />
      ) : null}

      <div className="eyf-page">
        <section className="eyf-section eyf-stack" style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
          <StudioSwitcher
            memberships={studioMemberships}
            activeStudioId={activeStudioId}
            onSwitch={setActiveStudio}
          />
                <SectionHeading
            eyebrow="Studio dashboard"
            title={studio ? `Manage ${studio.name}` : 'Studio dashboard'}
          />
          
          <button
            type="button"
            className="eyf-button eyf-button--secondary"
            style={{ width: 'fit-content' }}
            onClick={() => setShowAccountSettings(true)}
          >
            Account settings
          </button>
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorMessage message={error} onRetry={fetchData} />
          ) : (
            <>
              <div className="eyf-stats-grid">
                <div className="eyf-card">
                  <strong>{bookings.length}</strong>
                  <span>Total bookings</span>
                </div>
                <div className="eyf-card">
                  <strong style={pendingCount > 0 ? { color: '#fbbf24' } : {}}>
                    {pendingCount}
                  </strong>
                  <span>Awaiting confirmation</span>
                </div>
                <div className="eyf-card">
                  <strong>${revenue.toFixed(0)}</strong>
                  <span>Revenue</span>
                </div>
                <div className="eyf-card">
                  <strong>{studio?.rating || '—'}</strong>
                  <span>Rating</span>
                </div>
              </div>

              {pendingCount > 0 ? (
                <div
                  style={{
                    background: 'rgba(251,191,36,0.08)',
                    border: '1px solid rgba(251,191,36,0.3)',
                    borderRadius: 14,
                    padding: '1rem 1.25rem',
                    fontSize: '0.9rem',
                  }}
                >
                  <strong style={{ color: '#fbbf24' }}>
                    ⏳ {pendingCount} booking{pendingCount !== 1 ? 's' : ''} waiting for your confirmation
                  </strong>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)' }}>
                    Review and confirm below to lock in your client's session.
                  </p>
                </div>
              ) : null}

              <h3>Bookings</h3>
              <OwnerBookingRows bookings={bookings} onStatusChange={handleStatusChange} currentUserId={currentUser?.id} showToast={showToast} />

              {studio ? (
                <>
                  <StudioStripeOnboarding
                    studioId={studio.id}
                    studioName={studio.name}
                    existingStripeAccountId={studio.stripeConnectAccountId}
                    onboardingComplete={Boolean(studio.stripeOnboardingComplete)}
                    chargesEnabled={Boolean(studio.stripeChargesEnabled)}
                    payoutsEnabled={Boolean(studio.stripePayoutsEnabled)}
                    detailsSubmitted={Boolean(studio.stripeDetailsSubmitted)}
                    connectStatus={studio.stripeConnectStatus}
                  />

                  <CompletionWidget studio={studio} onSetupClick={() => setShowWizard(true)} />

                  <div className="eyf-card eyf-stack">
                    <div className="eyf-row eyf-row--between">
                      <h3 style={{ margin: 0 }}>Studio page &amp; branding</h3>
                      {studio.slug ? (
                        <a
                          href={`/studios/${studio.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.82rem',
                            color: 'var(--muted)',
                            textDecoration: 'underline',
                          }}
                        >
                          View public profile ↗
                        </a>
                      ) : null}
                    </div>

                    <p className="eyf-muted" style={{ margin: 0 }}>
                      Edit branding, layout, services, cancellation policy, and contact details.
                    </p>

                    {studio.slug ? (
                      <a
                        href={`/studios/${studio.slug}`}
                        className="eyf-button"
                        style={{ width: 'fit-content' }}
                      >
                        Open profile editor
                      </a>
                    ) : (
                      <p className="eyf-muted" style={{ margin: 0 }}>
                        A public studio URL is required to open the profile editor.
                      </p>
                    )}
                  </div>

                  <div className="eyf-card eyf-stack">
                    <div className="eyf-row eyf-row--between">
                      <h3 style={{ margin: 0 }}>Revenue</h3>
                      <span className="eyf-muted" style={{ fontSize: '0.85rem' }}>Last 6 months</span>
                    </div>
                    <RevenueChart data={analyticsData?.monthly || []} />
                    {analyticsData ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <span className="eyf-muted" style={{ fontSize: '0.8rem' }}>Top session type</span>
                          <p style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>
                            {analyticsData.topSessionTypes?.[0]?.sessionType || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="eyf-muted" style={{ fontSize: '0.8rem' }}>Avg session length</span>
                          <p style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>
                            {analyticsData.averageSessionHours ? analyticsData.averageSessionHours.toFixed(1) + ' hrs' : 'N/A'}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="eyf-card eyf-stack">
                    <h3 style={{ margin: 0 }}>Availability</h3>
                    <p className="eyf-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                      Set your weekly schedule and block off unavailable times.
                    </p>
                    <AvailabilityManager
                      studioId={studio?.id || null}
                      onSaved={() => showToast('Availability updated.')}
                    />
                  </div>

                  <EmailDomainManager studioId={studio?.id} />

                  {/* Website Builder card */}
                  <div className="eyf-card eyf-stack">
                    <div className="eyf-row eyf-row--between">
                      <h3 style={{ margin: 0 }}>Website Builder</h3>
                      {websiteData?.subdomain ? (
                        <a
                          href={`https://${websiteData.subdomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.82rem', color: 'var(--muted)', textDecoration: 'underline' }}
                        >
                          {websiteData.subdomain} ↗
                        </a>
                      ) : null}
                    </div>
                    <p className="eyf-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                      {websiteData
                        ? `Your free subdomain: ${websiteData.subdomain || `${studio.slug}.efyiabook.com`}`
                        : 'Build a standalone website for your studio with your own domain.'}
                    </p>
                    <Link to="/dashboard/studio/website" className="eyf-button" style={{ width: 'fit-content' }}>
                      Open Website Builder
                    </Link>
                  </div>

                  {/* Team card (owner only) */}
                  {canEditProfile ? (
                    <div className="eyf-card eyf-stack">
                      <h3 style={{ margin: 0 }}>Team</h3>
                      <p className="eyf-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                        Invite managers and engineers to help run your studio.
                      </p>
                      <TeamManager studioId={studio.id} canEdit={canEditProfile} />
                    </div>
                  ) : null}
                </>
              ) : (
                <EmptyState
                  title="No studio linked"
                  description="Contact support to link your studio profile."
                />
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}

// ─── Admin dashboard ─────────────────────────────────────────────────────────
export function AdminDashboard() {
  const { showToast, currentUser, reloadCurrentUser } = useAppContext();
  const [bookings, setBookings] = useState([]);
  const [studios, setStudios] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      bookingsApi.list(),
      studiosApi.list({ limit: 100 }),
      usersApi.list(),
    ])
      .then(([bkgs, { studios: studioList }, userList]) => {
        setBookings(bkgs);
        setStudios(studioList);
        setUsers(userList);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    try {
      const updated = await usersApi.adminUpdate(user.id, { status: newStatus });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast(
        `User ${updated.name} ${
          newStatus === 'SUSPENDED' ? 'suspended' : 'reactivated'
        }.`
      );
    } catch (err) {
      showToast(err.message || 'Could not update user.');
    }
  };

  return (
    <div className="eyf-page">
      {showAccountSettings ? (
        <AccountSettingsModal
          currentUser={currentUser}
          onClose={() => setShowAccountSettings(false)}
          onSaved={reloadCurrentUser}
          showToast={showToast}
        />
      ) : null}
      <section className="eyf-section eyf-stack">
        <SectionHeading eyebrow="Admin" title="Marketplace overview" />
        <button
          type="button"
          className="eyf-button eyf-button--ghost"
          style={{ width: 'fit-content' }}
          onClick={() => setShowAccountSettings(true)}
        >
          Account settings
        </button>

        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchData} />
        ) : (
          <>
            <div className="eyf-stats-grid">
              <div className="eyf-card">
                <strong>{studios.length}</strong>
                <span>Studios</span>
              </div>
              <div className="eyf-card">
                <strong>{users.length}</strong>
                <span>Users</span>
              </div>
              <div className="eyf-card">
                <strong>{bookings.length}</strong>
                <span>Bookings</span>
              </div>
              <div className="eyf-card">
                <strong>{bookings.filter((b) => b.status === 'PENDING').length}</strong>
                <span>Pending</span>
              </div>
            </div>

            <div className="eyf-admin-grid">
              <div className="eyf-card eyf-stack">
                <h3>Studios ({studios.length})</h3>
                {studios.map((s) => (
                  <div key={s.id} className="eyf-row eyf-row--between">
                    <div>
                      <span>{s.name}</span>
                      <span
                        className="eyf-muted"
                        style={{ display: 'block', fontSize: '0.85rem' }}
                      >
                        {[s.city, s.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                    <span className="eyf-muted">${s.pricePerHour}/hr</span>
                  </div>
                ))}
              </div>

              <div className="eyf-card eyf-stack">
                <h3>Users ({users.length})</h3>
                {users.map((user) => (
                  <div key={user.id} className="eyf-row eyf-row--between">
                    <div>
                      <span>{user.name}</span>
                      <span
                        className="eyf-muted"
                        style={{ display: 'block', fontSize: '0.85rem' }}
                      >
                        {user.email} · {user.role.toLowerCase()}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`eyf-badge ${
                        user.status === 'ACTIVE'
                          ? 'eyf-badge--sage'
                          : 'eyf-badge--earth'
                      }`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      onClick={() => toggleUserStatus(user)}
                      title={
                        user.status === 'ACTIVE'
                          ? 'Click to suspend'
                          : 'Click to reactivate'
                      }
                    >
                      {user.status.toLowerCase()}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <h3>All bookings</h3>
            <OwnerBookingRows bookings={bookings} onStatusChange={async () => {}} currentUserId={null} showToast={() => {}} />
          </>
        )}
      </section>
    </div>
  );
}
