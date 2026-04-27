import { useMemo, useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { savedCardApi } from '../../lib/api';
import { ErrorMessage, Spinner } from '../efyia/ui';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

const STRIPE_APPEARANCE = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#62f3d4',
    colorBackground: '#111820',
    colorText: '#e8f4f0',
    colorDanger: '#f87171',
    borderRadius: '10px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  rules: {
    '.Input': { border: '1px solid #1e2d3a', backgroundColor: '#0d1117' },
    '.Input:focus': { border: '1px solid #62f3d4', boxShadow: '0 0 0 3px rgba(98,243,212,0.15)' },
    '.Label': { color: '#6b8f85' },
  },
};

function brandLabel(brand) {
  const map = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    jcb: 'JCB',
    diners: 'Diners Club',
    unionpay: 'UnionPay',
  };
  return map[brand?.toLowerCase()] || (brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'Card');
}

function CardSummary({ card }) {
  const expMonth = String(card.expMonth).padStart(2, '0');
  const expYear = String(card.expYear).slice(-2);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 600 }}>{brandLabel(card.brand)}</span>
      <span style={{ color: 'var(--muted)' }}>•••• {card.last4}</span>
      <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Exp {expMonth}/{expYear}</span>
    </div>
  );
}

function SetupForm({ onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}`,
      },
    });

    if (confirmError) {
      setError(confirmError.message || 'Failed to save card. Please try again.');
      setProcessing(false);
      return;
    }

    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
      <PaymentElement
        options={{
          layout: 'tabs',
          fields: { billingDetails: { name: 'auto', email: 'auto' } },
        }}
      />
      {error ? <ErrorMessage message={error} /> : null}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="eyf-button eyf-button--ghost"
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </button>
        <button type="submit" className="eyf-button" disabled={!stripe || processing}>
          {processing ? 'Saving...' : 'Save card'}
        </button>
      </div>
      <p style={{ margin: 0, textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>
        🔒 Payments processed securely by Stripe
      </p>
    </form>
  );
}

export default function SavedCardSection({ studioId, showToast }) {
  const [loadingCard, setLoadingCard] = useState(true);
  const [savedCard, setSavedCard] = useState(null);
  const [cardError, setCardError] = useState(null);

  const [setupIntent, setSetupIntent] = useState(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState(null);

  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const fetchCard = async () => {
    setLoadingCard(true);
    setCardError(null);
    try {
      const data = await savedCardApi.get();
      setSavedCard(data.hasSavedCard ? data.card : null);
    } catch (err) {
      setCardError(err.message || 'Could not load saved card.');
    } finally {
      setLoadingCard(false);
    }
  };

  useEffect(() => {
    fetchCard();
  }, []);

  const handleStartSave = async () => {
    setLoadingIntent(true);
    setIntentError(null);
    setSetupIntent(null);
    setConfirmRemove(false);
    try {
      const data = await savedCardApi.createSetupIntent(studioId);
      setSetupIntent(data);
    } catch (err) {
      setIntentError(err.message || 'Could not start card setup. Please try again.');
    } finally {
      setLoadingIntent(false);
    }
  };

  const handleCancelSetup = () => {
    setSetupIntent(null);
    setIntentError(null);
  };

  const handleSetupSuccess = async () => {
    setSetupIntent(null);
    showToast?.('Card saved successfully.');
    await fetchCard();
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await savedCardApi.remove();
      setSavedCard(null);
      setConfirmRemove(false);
      showToast?.('Saved card removed.');
    } catch (err) {
      showToast?.(err.message || 'Could not remove saved card.');
    } finally {
      setRemoving(false);
    }
  };

  const stripePromise = useMemo(() => {
    if (!publishableKey || !setupIntent?.connectedAccountId) return null;
    return loadStripe(publishableKey, { stripeAccount: setupIntent.connectedAccountId });
  }, [setupIntent?.connectedAccountId]);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div>
        <h4 style={{ margin: '0 0 0.35rem' }}>Saved card</h4>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Saved card may be used for faster checkout and eligible future charges.
        </p>
      </div>

      {loadingCard ? (
        <Spinner />
      ) : cardError ? (
        <ErrorMessage message={cardError} onRetry={fetchCard} />
      ) : (
        <>
          {savedCard ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                background: 'rgba(98,243,212,0.04)',
                border: '1px solid var(--border)',
                borderRadius: 12,
              }}
            >
              <CardSummary card={savedCard} />
              {!setupIntent ? (
                confirmRemove ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Remove this card?</span>
                    <button
                      type="button"
                      className="eyf-button eyf-button--ghost"
                      onClick={() => setConfirmRemove(false)}
                      disabled={removing}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="eyf-button"
                      onClick={handleRemove}
                      disabled={removing}
                      style={{ background: 'transparent', borderColor: '#f87171', color: '#f87171' }}
                    >
                      {removing ? 'Removing...' : 'Confirm remove'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="eyf-button eyf-button--ghost"
                      onClick={handleStartSave}
                      disabled={loadingIntent}
                    >
                      {loadingIntent ? 'Loading...' : 'Update card'}
                    </button>
                    <button
                      type="button"
                      className="eyf-button eyf-button--ghost"
                      onClick={() => setConfirmRemove(true)}
                      style={{ borderColor: '#f87171', color: '#f87171' }}
                    >
                      Remove
                    </button>
                  </div>
                )
              ) : null}
            </div>
          ) : !setupIntent ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No card saved yet.</span>
              <button
                type="button"
                className="eyf-button"
                onClick={handleStartSave}
                disabled={loadingIntent}
              >
                {loadingIntent ? 'Loading...' : 'Save card'}
              </button>
            </div>
          ) : null}

          {intentError ? <ErrorMessage message={intentError} /> : null}

          {setupIntent && stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: setupIntent.clientSecret, appearance: STRIPE_APPEARANCE }}
            >
              <SetupForm onSuccess={handleSetupSuccess} onCancel={handleCancelSetup} />
            </Elements>
          ) : null}
        </>
      )}
    </div>
  );
}
