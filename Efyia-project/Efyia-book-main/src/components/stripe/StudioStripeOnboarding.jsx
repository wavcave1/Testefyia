import { useEffect, useState } from 'react';
import { stripeConnectApi } from '../../lib/api';

export default function StudioStripeOnboarding({
  studioId,
  studioName,
  existingStripeAccountId,
  onboardingComplete,
  chargesEnabled = false,
  payoutsEnabled = false,
  detailsSubmitted = false,
  connectStatus,
}) {
  const [loading, setLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (existingStripeAccountId) {
      fetchStripeStatus();
    } else {
      setStripeStatus(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingStripeAccountId]);

  async function fetchStripeStatus() {
    try {
      const data = await stripeConnectApi.status(studioId);
      setStripeStatus(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch Stripe status');
    }
  }

  async function handleEnableStripe() {
    setLoading(true);
    setError(null);
    try {
      const data = await stripeConnectApi.onboard(studioId);
      window.open(data.url, '_blank');
    } catch (err) {
      setError(err.message || 'Unable to start Stripe onboarding');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshOnboarding() {
    setLoading(true);
    setError(null);
    try {
      const data = await stripeConnectApi.refresh(studioId);
      window.open(data.url, '_blank');
    } catch (err) {
      setError(err.message || 'Failed to refresh onboarding link');
    } finally {
      setLoading(false);
    }
  }

  const normalizedStatus = stripeStatus?.status || connectStatus;
  const isActive = normalizedStatus === 'ACTIVE' || onboardingComplete;
  const isPending = Boolean(existingStripeAccountId) && !isActive;
  const isNotStarted = !existingStripeAccountId;
  const feePercent = import.meta.env.VITE_APP_FEE_PERCENT ?? 10;
  const liveChargesEnabled = stripeStatus?.chargesEnabled ?? chargesEnabled;
  const livePayoutsEnabled = stripeStatus?.payoutsEnabled ?? payoutsEnabled;
  const liveDetailsSubmitted = stripeStatus?.detailsSubmitted ?? detailsSubmitted;

  return (
    <div className="eyf-card stripe-onboarding-panel">
      <div className="panel-header">
        <StripeLogo />
        <div>
          <h3>Stripe Payments</h3>
          <p className="studio-name">{studioName}</p>
        </div>
        <StatusBadge status={isActive ? 'active' : isPending ? 'pending' : 'not_started'} />
      </div>

      {error && (
        <div className="error-banner" role="alert">
          ⚠️ {error}
        </div>
      )}

      {isActive && (
        <div className="status-details success">
          <p>✅ This studio is fully set up to accept payments.</p>
          <ul>
            <li>Card payments: {liveChargesEnabled ? '✓ Enabled' : '⏳ Pending'}</li>
            <li>Payouts: {livePayoutsEnabled ? '✓ Enabled' : '⏳ Pending'}</li>
            <li>Details submitted: {liveDetailsSubmitted ? '✓ Complete' : '⏳ Pending'}</li>
          </ul>
          <button onClick={fetchStripeStatus} className="eyf-button eyf-button--ghost">
            Refresh Status
          </button>
        </div>
      )}

      {isPending && (
        <div className="status-details warning">
          <p>⏳ Stripe onboarding is in progress. The studio owner needs to complete their Stripe setup.</p>
          <div className="action-row">
            <button onClick={handleRefreshOnboarding} disabled={loading} className="eyf-button">
              {loading ? 'Generating link...' : 'Resend Onboarding Link'}
            </button>
            <button onClick={fetchStripeStatus} className="eyf-button eyf-button--ghost">
              Check Status
            </button>
          </div>
        </div>
      )}

      {isNotStarted && (
        <div className="status-details">
          <p>
            Enabling this studio will create a Stripe Express account and send the studio
            owner through Stripe's secure identity verification and bank account setup.
          </p>
          <p className="note">
            A small booking fee applies per session. Your subscription includes your website, booking system, and payments.
          </p>
          <button onClick={handleEnableStripe} disabled={loading} className="eyf-button">
            {loading ? 'Setting up Stripe...' : '⚡ Enable Studio & Start Onboarding'}
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const labels = { active: '● Active', pending: '● Pending', not_started: '○ Not Started' };
  return <span className={`status-badge status-${status}`}>{labels[status]}</span>;
}

function StripeLogo() {
  return (
    <svg width="40" height="16" viewBox="0 0 60 25" fill="currentColor">
      <path d="M0 0h60v25H0z" fill="#635BFF" rx="4" />
      <text x="8" y="18" fontSize="14" fill="white" fontFamily="sans-serif" fontWeight="bold">
        stripe
      </text>
    </svg>
  );
}
