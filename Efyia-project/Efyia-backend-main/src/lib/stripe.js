'use strict';

const Stripe = require('stripe');

let _stripe = null;

function getStripe() {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    _stripe = new Stripe(secretKey, {
      // Pin to latest GA release for Connect + Payments
      apiVersion: '2026-03-25.dahlia',
      appInfo: {
        name: 'Efyia Book',
        version: '1.0.0',
      },
    });
  }
  return _stripe;
}

/**
 * Calculate platform application fee in cents.
 * Defaults to STRIPE_APPLICATION_FEE_PERCENT env (fallback 10%).
 */
function calculateApplicationFee(amountCents) {
  const flatFeeCents = Number(process.env.STRIPE_FLAT_FEE_CENTS ?? 200);
  const capCents = Number(process.env.STRIPE_FEE_CAP_CENTS ?? 1500);
  const feePercent = Number(process.env.STRIPE_FEE_PERCENT ?? 2);
  const percentFee = Math.round(amountCents * (feePercent / 100));
  return Math.min(Math.max(flatFeeCents, percentFee), capCents);
}

async function createOffSessionCharge(
  amountCents,
  paymentMethodId,
  connectedAccountId,
  metadata,
  customerId,
) {
  const stripe = getStripe();
  const platformFeeCents = calculateApplicationFee(amountCents);

  if (!customerId) {
    // Stripe rejects off-session charges that reuse a saved payment_method
    // without an attached customer. Surface a clear error rather than letting
    // Stripe return an opaque "payment_method not attached" failure.
    const err = new Error('Off-session charge requires a Stripe customer for the saved payment method.');
    err.code = 'missing_customer_for_off_session';
    throw err;
  }

  return stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      application_fee_amount: platformFeeCents,
      metadata: {
        ...metadata,
        auto_charged: 'true',
      },
    },
    {
      stripeAccount: connectedAccountId,
      idempotencyKey: `off-session-${metadata?.bookingId}`,
    }
  );
}

// Find or create a Stripe Customer on the studio's connected account for the
// given Efyia user. Customers are scoped per connected account, so a user
// has one Stripe Customer per studio they pay.
async function ensureStripeCustomer({ user, connectedAccountId, existingCustomerId }) {
  const stripe = getStripe();

  if (existingCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(existingCustomerId, {
        stripeAccount: connectedAccountId,
      });
      if (existing && !existing.deleted) {
        return existing.id;
      }
    } catch (err) {
      // Fall through and create a fresh customer.
    }
  }

  const customer = await stripe.customers.create(
    {
      email: user.email || undefined,
      name: user.name || undefined,
      metadata: { userId: String(user.id) },
    },
    { stripeAccount: connectedAccountId },
  );
  return customer.id;
}

module.exports = {
  getStripe,
  calculateApplicationFee,
  createOffSessionCharge,
  ensureStripeCustomer,
};
