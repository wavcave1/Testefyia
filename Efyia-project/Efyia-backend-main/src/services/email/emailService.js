'use strict';

const prisma = require('../../lib/prisma');
const { buildEmailProvider } = require('./providerFactory');

const provider = buildEmailProvider();

function formatBookingDate(dateStr) {
  if (!dateStr) return dateStr;
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch (_) { return dateStr; }
}

function formatAmount(amount) {
  if (amount == null) return null;
  return '$' + Number(amount).toFixed(2);
}

function buildMapsUrl(lat, lng, addressLine1, city, state, postalCode) {
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const parts = [addressLine1, city, state, postalCode].filter(Boolean);
  if (parts.length) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
  }
  return null;
}

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin:0;padding:0;background:#f0f4f3;font-family:Inter,Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0f4f3;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">
      <tr><td style="background:#0d1117;border-radius:12px 12px 0 0;padding:20px 32px;">
        <span style="color:#62f3d4;font-size:20px;font-weight:700;letter-spacing:-0.3px;font-family:Inter,Arial,sans-serif;">Efyia</span>
      </td></tr>
      <tr><td style="background:#ffffff;padding:32px 32px 28px;">
        ${content}
      </td></tr>
      <tr><td style="background:#f5f9f8;border-radius:0 0 12px 12px;padding:18px 32px;text-align:center;">
        <p style="margin:0;color:#8aaca5;font-size:12px;font-family:Inter,Arial,sans-serif;">
          &copy; Efyia &middot; Studio Booking Marketplace
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function detailRow(label, value, isLast) {
  const border = isLast ? '' : 'border-bottom:1px solid #d5e8e2;';
  return `<tr><td style="padding:11px 16px;${border}">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="color:#5a7870;font-size:12px;font-weight:600;font-family:Inter,Arial,sans-serif;letter-spacing:0.4px;">${label}</td>
        <td align="right" style="color:#1a2a25;font-size:13px;font-family:Inter,Arial,sans-serif;">${value}</td>
      </tr>
    </table>
  </td></tr>`;
}

function receiptRow(label, value, highlight) {
  const textStyle = highlight
    ? 'color:#0a7a66;font-size:14px;font-weight:700;font-family:Inter,Arial,sans-serif;'
    : 'color:#1a2a25;font-size:14px;font-family:Inter,Arial,sans-serif;';
  const labelStyle = highlight
    ? 'color:#0a7a66;font-size:13px;font-weight:600;font-family:Inter,Arial,sans-serif;'
    : 'color:#5a7870;font-size:13px;font-family:Inter,Arial,sans-serif;';
  return `<tr>
    <td style="${labelStyle}padding:6px 0;">${label}</td>
    <td align="right" style="${textStyle}padding:6px 0;">${value}</td>
  </tr>`;
}

class EmailService {
  constructor(adapter = provider) {
    this.adapter = adapter;
    this.defaultFrom = process.env.EMAIL_DEFAULT_FROM || 'Efyia <noreply@efyiabook.com>';
    this.defaultReplyTo = process.env.EMAIL_DEFAULT_REPLY_TO || 'support@efyiabook.com';
  }

  async sendTransactionalEmail({ to, subject, html, text, eventType, actorUserId, studioId, metadata }) {
    let providerMessageId = null;
    let status = 'FAILED';
    let errorMessage = null;
    let payload = null;

    try {
      const result = await this.adapter.sendEmail({
        to,
        from: this.defaultFrom,
        replyTo: this.defaultReplyTo,
        subject,
        html,
        text,
      });

      providerMessageId = result.id || null;
      status = result.status || 'SENT';
      payload = result.raw || null;
    } catch (err) {
      errorMessage = err.message;
      payload = err.payload || null;
    }

    await prisma.emailEvent.create({
      data: {
        actorUserId: actorUserId || null,
        studioId: studioId || null,
        eventType,
        providerMessageId,
        deliveryStatus: status === 'FAILED' ? 'FAILED' : 'SENT',
        errorMessage,
        metadata: metadata || null,
        payload,
      },
    });

    if (errorMessage) {
      const e = new Error(errorMessage);
      e.status = 502;
      throw e;
    }

    return { providerMessageId, status };
  }

  sendProfileApprovedEmail({ to, ownerName, studioName, actorUserId, studioId }) {
    return this.sendTransactionalEmail({
      to,
      actorUserId,
      studioId,
      eventType: 'profile_approved',
      subject: `Your profile for ${studioName} has been approved`,
      text: `Hi ${ownerName}, your studio profile for ${studioName} has been approved on Efyia.`,
      html: `<p>Hi ${ownerName},</p><p>Your studio profile for <strong>${studioName}</strong> has been approved on Efyia.</p>`,
      metadata: { ownerName, studioName },
    });
  }

  sendStripeOnboardingReminder({ to, ownerName, studioName, onboardingUrl, actorUserId, studioId }) {
    return this.sendTransactionalEmail({
      to,
      actorUserId,
      studioId,
      eventType: 'stripe_onboarding_reminder',
      subject: `Complete Stripe onboarding for ${studioName}`,
      text: `Hi ${ownerName}, complete Stripe onboarding for ${studioName}: ${onboardingUrl}`,
      html: `<p>Hi ${ownerName},</p><p>Please complete Stripe onboarding for <strong>${studioName}</strong>.</p><p><a href="${onboardingUrl}">Continue onboarding</a></p>`,
      metadata: { ownerName, studioName, onboardingUrl },
    });
  }

  sendBookingCreated({ to, customerName, studioName, bookingId, date, time, sessionType, location, actorUserId, studioId }) {
    const formattedDate = formatBookingDate(date);

    const locationRow = location
      ? detailRow('LOCATION', location, false)
      : '';

    const html = emailWrapper(`
      <h1 style="margin:0 0 6px;font-size:22px;color:#1a2a25;font-weight:700;font-family:Inter,Arial,sans-serif;">Booking Request Received</h1>
      <p style="margin:0 0 24px;color:#5a7870;font-size:14px;font-family:Inter,Arial,sans-serif;">We'll notify you as soon as the studio confirms.</p>

      <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
        <tr><td style="background:#fff8e1;border:1px solid #f0c040;border-radius:6px;padding:8px 14px;color:#856404;font-size:13px;font-weight:600;font-family:Inter,Arial,sans-serif;">
          Pending Confirmation
        </td></tr>
      </table>

      <p style="margin:0 0 20px;color:#2a3a35;font-size:15px;font-family:Inter,Arial,sans-serif;">Hi ${customerName},</p>
      <p style="margin:0 0 24px;color:#2a3a35;font-size:15px;line-height:1.65;font-family:Inter,Arial,sans-serif;">
        Your booking request at <strong>${studioName}</strong> has been received. The studio will review your request and confirm it shortly. You will receive another email once it is confirmed.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #d5e8e2;border-radius:8px;margin-bottom:28px;">
        ${detailRow('BOOKING ID', `#${bookingId}`, false)}
        ${detailRow('STUDIO', studioName, false)}
        ${detailRow('DATE', formattedDate || date, false)}
        ${detailRow('TIME', time, !location)}
        ${locationRow}
      </table>

      <p style="margin:0;color:#5a7870;font-size:13px;line-height:1.6;font-family:Inter,Arial,sans-serif;">
        Questions? Reply to this email or reach us at <a href="mailto:support@efyiabook.com" style="color:#0a9e84;text-decoration:none;">support@efyiabook.com</a>.
      </p>
    `);

    const text = [
      `Hi ${customerName},`,
      '',
      `Your booking request at ${studioName} has been received and is pending confirmation.`,
      'The studio will review your request and confirm it shortly.',
      'You will receive another email once it is confirmed.',
      '',
      `Booking ID:  #${bookingId}`,
      `Studio:      ${studioName}`,
      `Date:        ${formattedDate || date}`,
      `Time:        ${time}`,
      location ? `Location:    ${location}` : '',
      '',
      'Questions? Contact us at support@efyiabook.com',
    ].filter((l) => l !== undefined).join('\n');

    return this.sendTransactionalEmail({
      to,
      actorUserId,
      studioId,
      eventType: 'booking_created',
      subject: `Booking request received – ${studioName}`,
      html,
      text,
      metadata: { customerName, studioName, bookingId, date, time, sessionType, location },
    });
  }

  sendBookingConfirmation({
    to, customerName, studioName, bookingId,
    date, time, sessionType,
    addressLine1, city, state, postalCode, lat, lng, location,
    total, amountPaid, amountRemaining, paymentType,
    actorUserId, studioId,
  }) {
    const formattedDate = formatBookingDate(date);

    // Build address display
    let addressDisplay = '';
    if (addressLine1) {
      const line2Parts = [city, state, postalCode].filter(Boolean).join(', ');
      addressDisplay = addressLine1 + (line2Parts ? '<br>' + line2Parts : '');
    } else if (location) {
      addressDisplay = location;
    }

    // Build Google Maps URL
    const mapsUrl = buildMapsUrl(lat, lng, addressLine1, city, state, postalCode);

    const directionsButton = mapsUrl
      ? `<table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:12px;">
          <tr><td style="border-radius:6px;background:#0a9e84;">
            <a href="${mapsUrl}" target="_blank" style="display:inline-block;padding:10px 20px;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;font-family:Inter,Arial,sans-serif;">Get Directions</a>
          </td></tr>
        </table>`
      : '';

    // Build address section
    const addressSection = addressDisplay
      ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #d5e8e2;border-radius:8px;margin-bottom:20px;">
          <tr><td style="padding:14px 16px;">
            <p style="margin:0 0 4px;color:#5a7870;font-size:12px;font-weight:600;letter-spacing:0.4px;font-family:Inter,Arial,sans-serif;">STUDIO LOCATION</p>
            <p style="margin:0;color:#1a2a25;font-size:14px;line-height:1.6;font-family:Inter,Arial,sans-serif;">${addressDisplay}</p>
            ${directionsButton}
          </td></tr>
        </table>`
      : '';

    // Build booking detail rows
    const detailRows = [
      detailRow('BOOKING ID', `#${bookingId}`, false),
      detailRow('STUDIO', studioName, false),
      date ? detailRow('DATE', formattedDate || date, false) : '',
      time ? detailRow('TIME', time, !sessionType) : '',
      sessionType ? detailRow('SESSION TYPE', sessionType, true) : '',
    ].join('');

    // Build receipt section
    let receiptSection = '';
    const hasReceipt = total != null || amountPaid != null;
    if (hasReceipt) {
      const paymentLabel = paymentType === 'deposit' ? 'Deposit Paid' : 'Amount Paid';
      const receiptRows = [
        total != null ? receiptRow('Total Booking Price', formatAmount(total), false) : '',
        amountPaid != null ? receiptRow(paymentLabel, formatAmount(amountPaid), false) : '',
        amountRemaining != null && amountRemaining > 0
          ? receiptRow('Remaining Balance', formatAmount(amountRemaining), false)
          : amountRemaining === 0
            ? receiptRow('Remaining Balance', 'Paid in full', true)
            : '',
      ].join('');

      receiptSection = `
        <p style="margin:24px 0 10px;color:#5a7870;font-size:12px;font-weight:600;letter-spacing:0.4px;font-family:Inter,Arial,sans-serif;">PAYMENT SUMMARY</p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid #d5e8e2;border-bottom:1px solid #d5e8e2;margin-bottom:24px;">
          ${receiptRows}
        </table>`;
    }

    const html = emailWrapper(`
      <h1 style="margin:0 0 6px;font-size:22px;color:#1a2a25;font-weight:700;font-family:Inter,Arial,sans-serif;">Booking Confirmed</h1>
      <p style="margin:0 0 24px;color:#5a7870;font-size:14px;font-family:Inter,Arial,sans-serif;">Your session is all set. See you there.</p>

      <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
        <tr><td style="background:#e6f7f1;border:1px solid #0a9e84;border-radius:6px;padding:8px 14px;color:#0a7a66;font-size:13px;font-weight:600;font-family:Inter,Arial,sans-serif;">
          Confirmed
        </td></tr>
      </table>

      <p style="margin:0 0 20px;color:#2a3a35;font-size:15px;font-family:Inter,Arial,sans-serif;">Hi ${customerName},</p>
      <p style="margin:0 0 24px;color:#2a3a35;font-size:15px;line-height:1.65;font-family:Inter,Arial,sans-serif;">
        Your booking at <strong>${studioName}</strong> is confirmed. Everything is locked in &mdash; see the details below.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #d5e8e2;border-radius:8px;margin-bottom:20px;">
        ${detailRows}
      </table>

      ${addressSection}
      ${receiptSection}

      <p style="margin:0;color:#5a7870;font-size:13px;line-height:1.6;font-family:Inter,Arial,sans-serif;">
        Questions? Reply to this email or reach us at <a href="mailto:support@efyiabook.com" style="color:#0a9e84;text-decoration:none;">support@efyiabook.com</a>.
      </p>
    `);

    const addressText = addressLine1
      ? [addressLine1, [city, state, postalCode].filter(Boolean).join(', ')].filter(Boolean).join('\n             ')
      : (location || '');

    const textLines = [
      `Hi ${customerName},`,
      '',
      `Your booking at ${studioName} is confirmed.`,
      '',
      `Booking ID:    #${bookingId}`,
      `Studio:        ${studioName}`,
      date ? `Date:          ${formattedDate || date}` : '',
      time ? `Time:          ${time}` : '',
      sessionType ? `Session Type:  ${sessionType}` : '',
      addressText ? `Address:       ${addressText}` : '',
      mapsUrl ? `Directions:    ${mapsUrl}` : '',
      '',
    ];

    if (hasReceipt) {
      if (total != null) textLines.push(`Total Price:   ${formatAmount(total)}`);
      if (amountPaid != null) {
        const paymentLabel = paymentType === 'deposit' ? 'Deposit Paid' : 'Amount Paid';
        textLines.push(`${paymentLabel}:  ${formatAmount(amountPaid)}`);
      }
      if (amountRemaining != null) {
        textLines.push(`Remaining:     ${amountRemaining > 0 ? formatAmount(amountRemaining) : 'Paid in full'}`);
      }
      textLines.push('');
    }

    textLines.push('Questions? Contact us at support@efyiabook.com');

    const text = textLines.filter((l) => l !== undefined).join('\n');

    return this.sendTransactionalEmail({
      to,
      actorUserId,
      studioId,
      eventType: 'booking_confirmation',
      subject: `Booking #${bookingId} confirmed – ${studioName}`,
      html,
      text,
      metadata: { customerName, studioName, bookingId, date, time, sessionType, total, amountPaid, amountRemaining, paymentType },
    });
  }

  sendBookingCancellation({ to, customerName, studioName, bookingId, actorUserId, studioId }) {
    return this.sendTransactionalEmail({
      to,
      actorUserId,
      studioId,
      eventType: 'booking_cancellation',
      subject: `Booking #${bookingId} cancelled`,
      text: `Hi ${customerName}, your booking at ${studioName} has been cancelled.`,
      html: `<p>Hi ${customerName},</p><p>Your booking at <strong>${studioName}</strong> has been cancelled.</p>`,
      metadata: { customerName, studioName, bookingId },
    });
  }

  sendPasswordReset({ to, userName, resetToken, actorUserId }) {
    return this.sendTransactionalEmail({
      to,
      actorUserId,
      eventType: 'password_reset',
      subject: 'Password reset requested',
      text: `Hi ${userName}, use this reset token: ${resetToken}`,
      html: `<p>Hi ${userName},</p><p>Use this reset token to continue: <strong>${resetToken}</strong></p>`,
      metadata: { userName },
    });
  }

  sendPaymentReceipt({ to, customerName, bookingId, amount, actorUserId, studioId }) {
    return this.sendTransactionalEmail({
      to,
      actorUserId,
      studioId,
      eventType: 'payment_receipt',
      subject: `Payment receipt for booking #${bookingId}`,
      text: `Hi ${customerName}, we received your payment of $${amount} for booking #${bookingId}.`,
      html: `<p>Hi ${customerName},</p><p>We received your payment of <strong>$${amount}</strong> for booking #${bookingId}.</p>`,
      metadata: { customerName, bookingId, amount },
    });
  }

  sendFinalPaymentReminder({ to, customerName, studioName, bookingId, amount, actorUserId, studioId }) {
    return this.sendTransactionalEmail({
      to,
      actorUserId,
      studioId,
      eventType: 'final_payment_reminder',
      subject: `Final payment due for booking #${bookingId}`,
      text: `Hi ${customerName}, your session at ${studioName} is complete. Please pay the remaining balance of $${amount} for booking #${bookingId}.`,
      html: `<p>Hi ${customerName},</p><p>Your session at <strong>${studioName}</strong> is complete. Please pay the remaining balance of <strong>$${amount}</strong> for booking #${bookingId}.</p>`,
      metadata: { customerName, studioName, bookingId, amount },
    });
  }
}

module.exports = { EmailService };
