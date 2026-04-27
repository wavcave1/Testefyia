import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { availabilityApi, bookingsApi, paymentsApi, studiosApi, depositApi } from '../../lib/api';
import { useAppContext } from '../../context/AppContext';
import { ErrorMessage, Spinner } from '../../components/efyia/ui';
import { getDisplayLocation } from '../../lib/location';
import BookingCheckout from '../../components/stripe/BookingCheckout';

const TIMES = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM',
];

const FLAT_FEE = Number(import.meta.env.VITE_FLAT_FEE) || 2;
const FEE_CAP = Number(import.meta.env.VITE_FEE_CAP) || 15;
const FEE_PERCENT = (Number(import.meta.env.VITE_FEE_PERCENT) || 2) / 100;

function calcFee(sub) {
  if (!sub || isNaN(sub)) return 2;
  const pct = Math.round(sub * FEE_PERCENT * 100) / 100;
  return Math.min(Math.max(FLAT_FEE, pct), FEE_CAP);
}

// Parse "8:00 AM" or "08:00" → minutes since midnight
function parseToMinutes(t) {
  if (!t) return 0;
  const ampm = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    if (ampm[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ampm[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const parts = t.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function studioLocation(studio) {
  return getDisplayLocation(studio) || null;
}

// Match a session type name to a service and return its price
function getPriceForSession(studio, sessionType) {
  if (!sessionType) return studio.pricePerHour;

  const services = Array.isArray(studio.services) ? studio.services : [];
  const lower = sessionType.toLowerCase();

  const match = services.find((s) =>
    s.name?.toLowerCase() === lower ||
    s.name?.toLowerCase().includes(lower) ||
    lower.includes(s.name?.toLowerCase())
  );

  return match?.price || studio.pricePerHour || 0;
} 

function getServiceForSession(studio, sessionType) {
  if (!sessionType) return null;

  const services = Array.isArray(studio.services) ? studio.services : [];
  const lower = sessionType.toLowerCase();

  return (
    services.find((s) =>
      s.name?.toLowerCase() === lower ||
      s.name?.toLowerCase().includes(lower) ||
      lower.includes(s.name?.toLowerCase())
    ) || null
  );
}

// ─── Cancellation Policy Modal ────────────────────────────────────────────────
function CancellationPolicyModal({ policy, studioName, onAgree, onDecline }) {
  return (
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
      aria-label="Cancellation policy"
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
            Before you book
          </p>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Cancellation Policy</h2>
          <p
            style={{
              margin: '0.25rem 0 0',
              color: 'var(--muted)',
              fontSize: '0.9rem',
            }}
          >
            {studioName}
          </p>
        </div>

        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '1.25rem',
            fontSize: '0.9rem',
            lineHeight: 1.75,
            maxHeight: 240,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {policy ||
            'No specific cancellation policy has been provided by this studio. Please contact them directly for details.'}
        </div>

        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
          By clicking <strong>I agree &amp; continue</strong> you acknowledge you
          have read and accept this cancellation policy.
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
            onClick={onDecline}
          >
            Go back
          </button>
          <button
            type="button"
            className="eyf-button"
            onClick={onAgree}
          >
            I agree &amp; continue
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cancel Booking Modal ─────────────────────────────────────────────────────
function CancelBookingModal({
  booking,
  studioName,
  onConfirm,
  onClose,
  cancelling,
}) {
  return (
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
      aria-label="Cancel booking"
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '2rem',
          width: 'min(440px, 100%)',
          display: 'grid',
          gap: '1.25rem',
        }}
      >
        <h2 style={{ margin: 0 }}>Cancel booking?</h2>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
          Cancel your <strong>{booking.sessionType}</strong> session at{' '}
          <strong>{studioName}</strong> on <strong>{booking.date}</strong> at{' '}
          <strong>{booking.time}</strong>? This cannot be undone.
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
            disabled={cancelling}
          >
            Keep booking
          </button>
          <button
            type="button"
            className="eyf-button eyf-button--danger"
            onClick={onConfirm}
            disabled={cancelling}
            style={{
              background: 'transparent',
              borderColor: '#f87171',
              color: '#f87171',
            }}
          >
            {cancelling ? 'Cancelling…' : 'Yes, cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main BookingPage ─────────────────────────────────────────────────────────
export default function BookingPage() {
  const { studioId } = useParams();
  const { showToast } = useAppContext();

  const [studio, setStudio] = useState(null);
  const [studioLoading, setStudioLoading] = useState(true);
  const [studioError, setStudioError] = useState(null);

  const [sessionType, setSessionType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00 AM');
  const [hours, setHours] = useState(2);
  const [schedule, setSchedule] = useState([]);
  const [step, setStep] = useState(1);

  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [paymentInfo, setPaymentInfo] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentIntentError, setPaymentIntentError] = useState('');

  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Client's choice: 'deposit' or 'full'
  const [paymentChoice, setPaymentChoice] = useState('deposit');

  useEffect(() => {
    const id = parseInt(studioId, 10);

    if (isNaN(id)) {
      setStudioError('Invalid studio ID.');
      setStudioLoading(false);
      return;
    }

    studiosApi
      .getById(id)
      .then((data) => {
        setStudio(data);

        const types = Array.isArray(data.sessionTypes) && data.sessionTypes.length
          ? data.sessionTypes
          : [];

        setSessionType(types[0] || '');
        setStudioLoading(false);
        availabilityApi.getSchedule(id).then(setSchedule).catch(() => {});
      })
      .catch((err) => {
        setStudioError(err.message);
        setStudioLoading(false);
      });
  }, [studioId]);

  if (studioLoading) {
    return (
      <div className="eyf-page">
        <section className="eyf-section">
          <Spinner />
        </section>
      </div>
    );
  }

  if (studioError || !studio) {
    return (
      <div className="eyf-page">
        <section className="eyf-section">
          <ErrorMessage message={studioError} />
        </section>
      </div>
    );
  }

  const availableSessionTypes =
    Array.isArray(studio.sessionTypes) && studio.sessionTypes.length
      ? studio.sessionTypes
      : [];

  const pricePerHour = getPriceForSession(studio, sessionType) || studio.pricePerHour || 0;
  const selectedService = getServiceForSession(studio, sessionType);

  const subtotal = pricePerHour * hours;
  const fee = calcFee(subtotal);
  const total = subtotal + fee;

  // Deposit calculations
  const studioAllowsDeposit = studio.bookingInfo?.requireDeposit === true;
  const depositPercent = studioAllowsDeposit ? (studio.bookingInfo?.depositPercent || 50) : 0;
  const depositAmount = studioAllowsDeposit ? Math.round((total * depositPercent) / 100 * 100) / 100 : 0;
  const remainingBalance = studioAllowsDeposit ? total - depositAmount : 0;

  // Client's choice overrides the default behavior
  const isDepositPayment = studioAllowsDeposit && paymentChoice === 'deposit';
  const paymentAmount = isDepositPayment ? depositAmount : total;

  const location = studioLocation(studio);
  const cancellationPolicy =
    studio.bookingInfo?.cancellationPolicy ||
    studio.bookingInfo?.notes ||
    null;

  const validateStep1 = () => {
    const errors = {};

    if (!date) {
      errors.date = 'Please select a date.';
    } else if (date < todayString()) {
      errors.date = 'Date cannot be in the past.';
    }

    if (!sessionType) {
      errors.sessionType = 'Please select a session type.';
    }

    return errors;
  };

  const goToStep2 = async () => {
    const errors = validateStep1();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setCheckingAvailability(true);

    try {
      const avail = await availabilityApi.check(studio.id, date, time, hours);
      if (!avail.available) {
        setFieldErrors({ date: avail.reason || 'This time slot is not available.' });
        return;
      }
    } catch (err) {
      // If availability check fails (network error), allow booking to proceed
      // so a backend outage does not block all bookings
      console.warn('Availability check failed, proceeding:', err.message);
    } finally {
      setCheckingAvailability(false);
    }

    setShowPolicyModal(true);
  };

  const handlePolicyAgree = () => {
    setShowPolicyModal(false);
    setStep(2);
  };

  const confirmBooking = async () => {
    setSubmitting(true);
    setSubmitError('');
    setPaymentIntentError('');

    let created;

    try {
      created = await bookingsApi.create({
        studioId: parseInt(studioId, 10),
        sessionType,
        date,
        time,
        hours,
        depositAmount: isDepositPayment ? depositAmount : null,
        depositPercent: isDepositPayment ? depositPercent : null,
        isDepositPayment,
      });

      setBooking(created);
    } catch (err) {
      setSubmitError(err.message || 'Booking failed. Please try again.');
      setSubmitting(false);
      return;
    }

    try {
      const intent = isDepositPayment
        ? await depositApi.payDeposit(created.id)
        : await paymentsApi.createIntent(created.id);

      setPaymentInfo({
        clientSecret: intent.clientSecret,
        connectedAccountId: intent.connectedAccountId,
        paymentIntentId: intent.paymentIntentId,
        amountCents: Math.round(paymentAmount * 100),
        isDepositPayment,
      });

      showToast(isDepositPayment ? 'Booking created. Pay your deposit to confirm.' : 'Booking created. Complete payment to finalize.');
    } catch (err) {
      setPaymentIntentError(
        err.message?.includes('not yet set up')
          ? "This studio hasn't completed payment setup yet. Your booking is saved — contact the studio to arrange payment."
          : `Payment setup failed: ${err.message || 'Please contact support.'}`
      );
    }

    setStep(3);
    setSubmitting(false);
  };

  const handleCancelBooking = async () => {
    if (!booking) return;

    setCancelling(true);

    try {
      const result = await bookingsApi.updateStatus(booking.id, 'CANCELLED');

      setBooking((prev) => ({
        ...prev,
        status: 'CANCELLED',
      }));

      setShowCancelModal(false);

      if (result.refund?.refundId) {
        showToast(
          'Booking cancelled. Your refund has been issued and will appear in 5–10 business days.'
        );
      } else if (result.refund?.status === 'cancelled_before_capture') {
        showToast('Booking cancelled. Your payment was voided — you were not charged.');
      } else if (
        result.refund?.status === 'no_payment_found' ||
        result.refund?.status === 'no_charge'
      ) {
        showToast('Booking cancelled.');
      } else if (result.refund?.error) {
        showToast(
          'Booking cancelled. Refund could not be processed automatically — please contact support.'
        );
      } else {
        showToast('Booking cancelled.');
      }
    } catch (err) {
      showToast(err.message || 'Could not cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      {showPolicyModal ? (
        <CancellationPolicyModal
          policy={cancellationPolicy}
          studioName={studio.name}
          onAgree={handlePolicyAgree}
          onDecline={() => setShowPolicyModal(false)}
        />
      ) : null}

      {showCancelModal && booking ? (
        <CancelBookingModal
          booking={booking}
          studioName={studio.name}
          onConfirm={handleCancelBooking}
          onClose={() => setShowCancelModal(false)}
          cancelling={cancelling}
        />
      ) : null}

      <div className="eyf-page">
        <section className="eyf-section eyf-booking-flow">
          <div className="eyf-steps">
            {['Session details', 'Review & confirm', 'Payment', 'Done'].map(
              (label, index) => (
                <div
                  key={label}
                  className={`eyf-step ${step === index + 1 ? 'is-active' : ''} ${step > index + 1 ? 'is-done' : ''}`}
                >
                  <span>{step > index + 1 ? '✓' : index + 1}</span>
                  <strong>{label}</strong>
                </div>
              )
            )}
          </div>

          <div className="eyf-card eyf-stack">
            <div>
              <h1>Book {studio.name}</h1>
              <p className="eyf-muted">
                {location ? `${location} · ` : ''}
                ${pricePerHour}/hour
              </p>
            </div>

            {step === 1 ? (
              <>
                <div>
                  <label>
                    Session type
                    <select
                      value={sessionType || ''}
                      onChange={(e) => setSessionType(e.target.value)}
                    >
                      <option value="">Select session type</option>
                      {availableSessionTypes.map((item) => {
                        const servicePrice = getPriceForSession(studio, item);

                        return (
                          <option key={item} value={item}>
                            {item} — ${servicePrice}/hr
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  {fieldErrors.sessionType ? (
                    <p className="eyf-field-error">{fieldErrors.sessionType}</p>
                  ) : null}

                  {selectedService?.description ? (
                    <p
                      style={{
                        margin: '0.5rem 0 0',
                        fontSize: '0.85rem',
                        color: 'var(--muted)',
                      }}
                    >
                      {selectedService.description}
                    </p>
                  ) : null}
                </div>

                {(() => {
                  // Determine studio hours for the selected date
                  let dayEntry = null;
                  let closedDay = false;
                  if (date && schedule.length) {
                    const dow = new Date(date + 'T12:00:00').getDay();
                    dayEntry = schedule.find((s) => s.dayOfWeek === dow);
                    closedDay = dayEntry ? !dayEntry.isOpen : false;
                  }
                  const openMin = dayEntry?.isOpen ? parseToMinutes(dayEntry.openTime) : 0;
                  const closeMin = dayEntry?.isOpen ? parseToMinutes(dayEntry.closeTime) : 24 * 60;

                  const availableTimes = TIMES.filter((t) => {
                    if (!dayEntry) return true; // no schedule loaded yet — show all
                    if (!dayEntry.isOpen) return false;
                    const tMin = parseToMinutes(t);
                    return tMin >= openMin && tMin < closeMin;
                  });

                  return (
                    <div className="eyf-grid-2">
                      <div>
                        <label>
                          Date
                          <input
                            type="date"
                            value={date}
                            min={todayString()}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              setDate(newDate);
                              // Clear time if it falls outside new day's hours
                              if (newDate && schedule.length) {
                                const dow = new Date(newDate + 'T12:00:00').getDay();
                                const entry = schedule.find((s) => s.dayOfWeek === dow);
                                if (entry && entry.isOpen) {
                                  const tMin = parseToMinutes(time);
                                  const oMin = parseToMinutes(entry.openTime);
                                  const cMin = parseToMinutes(entry.closeTime);
                                  if (tMin < oMin || tMin >= cMin) setTime('');
                                } else if (entry && !entry.isOpen) {
                                  setTime('');
                                }
                              }
                            }}
                          />
                        </label>
                        {closedDay && date ? (
                          <p className="eyf-field-error">
                            Studio is closed on {DAY_NAMES[new Date(date + 'T12:00:00').getDay()]}s
                          </p>
                        ) : fieldErrors.date ? (
                          <p className="eyf-field-error">{fieldErrors.date}</p>
                        ) : null}
                      </div>

                      <div>
                        <label>
                          Start time
                          <select
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            disabled={closedDay}
                          >
                            {closedDay ? (
                              <option value="">Studio closed</option>
                            ) : availableTimes.length ? (
                              availableTimes.map((t) => <option key={t} value={t}>{t}</option>)
                            ) : (
                              TIMES.map((t) => <option key={t} value={t}>{t}</option>)
                            )}
                          </select>
                        </label>
                      </div>
                    </div>
                  );
                })()}

                <label>
                  Duration: {hours} hour{hours !== 1 ? 's' : ''}
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                  />
                  <span
                    className="eyf-muted"
                    style={{ fontSize: '0.85rem' }}
                  >
                   Estimated total: ${pricePerHour ? (pricePerHour * hours + calcFee(pricePerHour * hours)).toFixed(0) : '...'}
                  </span>
                </label>

                <button
                  type="button"
                  className="eyf-button"
                  onClick={goToStep2}
                  disabled={submitting || checkingAvailability}
                >
                  {checkingAvailability ? 'Checking availability...' : 'Continue'}
                </button>
              </>
            ) : null}

            {step === 2 ? (
              <>
                {submitError ? (
                  <div className="eyf-error-box" role="alert">
                    {submitError}
                  </div>
                ) : null}

                <div className="eyf-summary-list">
                  <div>
                    <span>Studio</span>
                    <strong>{studio.name}</strong>
                  </div>

                  {location ? (
                    <div>
                      <span>Location</span>
                      <strong>{location}</strong>
                    </div>
                  ) : null}

                  <div>
                    <span>Session type</span>
                    <strong>{sessionType}</strong>
                  </div>

                  <div>
                    <span>Date</span>
                    <strong>
                      {new Date(date + 'T12:00:00').toLocaleDateString(
                        'en-US',
                        {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Start time</span>
                    <strong>{time}</strong>
                  </div>

                  <div>
                    <span>Duration</span>
                    <strong>
                      {hours} hour{hours !== 1 ? 's' : ''}
                    </strong>
                  </div>

                  <div>
                    <span>Rate</span>
                    <strong>${pricePerHour}/hr</strong>
                  </div>

                  <div>
                    <span>Subtotal</span>
                    <strong>${subtotal.toFixed(2)}</strong>
                  </div>

                  <div>
                    <span>Booking fee</span>
                    <strong>${fee.toFixed(2)}</strong>
                  </div>

                  <div className="total-row">
                    <span>
                      <strong>Total</strong>
                    </span>
                    <strong style={{ color: 'var(--mint)' }}>
                      ${total.toFixed(2)}
                    </strong>
                  </div>

                  {studioAllowsDeposit ? (
                    <div
                      style={{
                        marginTop: '1.25rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                        <strong>Choose your payment option:</strong>
                      </p>

                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {/* Deposit option */}
                        <button
                          type="button"
                          onClick={() => setPaymentChoice('deposit')}
                          style={{
                            padding: '0.9rem 1rem',
                            border: `2px solid ${paymentChoice === 'deposit' ? 'var(--mint)' : 'var(--border)'}`,
                            background: paymentChoice === 'deposit' ? 'rgba(98,243,212,0.08)' : 'var(--card)',
                            borderRadius: 10,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '0.9rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong>Pay Deposit Now</strong>
                              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                                Pay {depositPercent}% upfront, balance later
                              </p>
                            </div>
                            <strong style={{ color: 'var(--mint)' }}>${depositAmount.toFixed(2)}</strong>
                          </div>
                        </button>

                        {/* Full payment option */}
                        <button
                          type="button"
                          onClick={() => setPaymentChoice('full')}
                          style={{
                            padding: '0.9rem 1rem',
                            border: `2px solid ${paymentChoice === 'full' ? 'var(--mint)' : 'var(--border)'}`,
                            background: paymentChoice === 'full' ? 'rgba(98,243,212,0.08)' : 'var(--card)',
                            borderRadius: 10,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '0.9rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong>Pay Full Amount Now</strong>
                              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                                Complete payment and confirm your booking
                              </p>
                            </div>
                            <strong style={{ color: 'var(--mint)' }}>${total.toFixed(2)}</strong>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    background: 'rgba(98,243,212,0.06)',
                    border: '1px solid rgba(98,243,212,0.2)',
                    borderRadius: 12,
                    padding: '0.9rem 1rem',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ color: 'var(--mint)' }}>📋 How it works</strong>
                  <br />
                  Payment is collected now. Your booking stays <strong>Pending</strong>{' '}
                  until the studio confirms your session.
                </div>

                <p className="eyf-muted" style={{ fontSize: '0.85rem' }}>
                  Payment processed securely by Stripe.
                </p>

                <div className="eyf-grid-2">
                  <button
                    type="button"
                    className="eyf-button eyf-button--ghost"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="eyf-button"
                    onClick={confirmBooking}
                    disabled={submitting}
                  >
                    {submitting ? 'Confirming…' : 'Confirm & pay'}
                  </button>
                </div>
              </>
            ) : null}

            {step === 3 && booking ? (
              <div className="eyf-stack">
                <h2>{isDepositPayment ? 'Pay deposit' : 'Complete payment'}</h2>
                <p className="eyf-muted">
                  Secure checkout for <strong>{studio.name}</strong>. {isDepositPayment ? 'Deposit due: ' : 'Total due: '}
                  <strong>${paymentAmount.toFixed(2)}</strong>
                  {isDepositPayment && <> ({depositPercent}% of ${total.toFixed(2)})</>}
                </p>

                {paymentIntentError ? (
                  <div className="eyf-error-box" role="alert">
                    <p style={{ margin: 0 }}>{paymentIntentError}</p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                      Booking #{booking.id} saved.{' '}
                      <Link
                        to="/dashboard/client"
                        style={{
                          color: 'inherit',
                          textDecoration: 'underline',
                        }}
                      >
                        View in dashboard
                      </Link>
                    </p>
                  </div>
                ) : null}

                {paymentError ? (
                  <div className="eyf-error-box" role="alert">
                    {paymentError}
                  </div>
                ) : null}

                {paymentInfo?.clientSecret && !paymentIntentError ? (
                  <BookingCheckout
                    clientSecret={paymentInfo.clientSecret}
                    connectedAccountId={paymentInfo.connectedAccountId}
                    bookingId={booking.id}
                    studioName={studio.name}
                    amountCents={paymentInfo.amountCents}
                    bookingDetails={{
                      date,
                      time,
                      duration: `${hours} hour${hours !== 1 ? 's' : ''}`,
                    }}
                    onSuccess={() => setStep(4)}
                    onError={(msg) => setPaymentError(msg)}
                    isDepositPayment={paymentInfo.isDepositPayment}
                  />
                ) : !paymentIntentError ? (
                  <div className="checkout-loading">
                    Setting up secure checkout…
                  </div>
                ) : null}

                {booking.status !== 'CANCELLED' ? (
                  <button
                    type="button"
                    className="eyf-button eyf-button--ghost"
                    style={{
                      marginTop: '0.5rem',
                      color: '#f87171',
                      borderColor: '#f87171',
                    }}
                    onClick={() => setShowCancelModal(true)}
                  >
                    Cancel this booking
                  </button>
                ) : (
                  <p
                    style={{
                      textAlign: 'center',
                      color: '#f87171',
                      fontSize: '0.875rem',
                    }}
                  >
                    This booking has been cancelled.
                  </p>
                )}
              </div>
            ) : null}

            {step === 4 && booking ? (
              <div className="eyf-stack" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem' }}>✓</div>
                <h2>{isDepositPayment ? 'Deposit received' : 'Payment received'}</h2>
                <p className="eyf-muted">
                  Your session at <strong>{studio.name}</strong> on{' '}
                  {new Date(booking.date + 'T12:00:00').toLocaleDateString(
                    'en-US',
                    {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    }
                  )}{' '}
                  at {booking.time} is saved.
                </p>

                <div
                  style={{
                    background: 'rgba(251,191,36,0.08)',
                    border: '1px solid rgba(251,191,36,0.3)',
                    borderRadius: 12,
                    padding: '0.9rem 1rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <strong style={{ color: '#fbbf24' }}>
                    {isDepositPayment ? '💰 Deposit confirmed' : '✅ Payment confirmed'}
                  </strong>
                  <p
                    style={{
                      margin: '0.35rem 0 0',
                      color: 'var(--muted)',
                    }}
                  >
                    {isDepositPayment
                      ? `Your deposit of $${depositAmount.toFixed(2)} has been secured. The studio will request your remaining balance ($${remainingBalance.toFixed(2)}) when ready to finalize your booking.`
                      : 'Your booking is Pending. The studio will confirm and you\'ll see the update in your dashboard.'}
                  </p>
                </div>

                <p className="eyf-muted" style={{ fontSize: '0.85rem' }}>
                  Booking reference: <strong>#{booking.id}</strong>
                </p>

                <div className="eyf-grid-2">
                  <Link
                    className="eyf-link-button eyf-link-button--ghost"
                    to="/discover"
                  >
                    Browse studios
                  </Link>
                  <Link className="eyf-link-button" to="/dashboard/client">
                    My dashboard
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}