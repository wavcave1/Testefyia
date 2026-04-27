'use strict';

function normalizeText(value) {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || null;
}

function buildPublicLocationLabel(input) {
  const explicit = normalizeText(input.publicLocationLabel);
  if (explicit) return explicit;

  const city = normalizeText(input.city);
  const state = normalizeText(input.state);
  if (city && state) return city + ', ' + state;
  if (city) return city;
  if (state) return state;

  const legacy = normalizeText(input.location || input.address);
  return legacy || null;
}

function mapStudioLocationInput(data) {
  const next = { ...data };

  if (Object.prototype.hasOwnProperty.call(next, 'addressLine1') && next.addressLine1 !== undefined) {
    next.addressLine1 = normalizeText(next.addressLine1);
    if (next.address === undefined && next.addressLine1 != null) {
      next.address = next.addressLine1;
    }
  }

  if (Object.prototype.hasOwnProperty.call(next, 'postalCode') && next.postalCode !== undefined) {
    next.postalCode = normalizeText(next.postalCode);
    if (next.zip === undefined && next.postalCode != null) {
      next.zip = next.postalCode;
    }
  }

  if (Object.prototype.hasOwnProperty.call(next, 'latitude') && next.latitude !== undefined) {
    if (next.lat === undefined && next.latitude != null) {
      next.lat = next.latitude;
    }
  }

  if (Object.prototype.hasOwnProperty.call(next, 'longitude') && next.longitude !== undefined) {
    if (next.lng === undefined && next.longitude != null) {
      next.lng = next.longitude;
    }
  }

  if (Object.prototype.hasOwnProperty.call(next, 'address') && next.address !== undefined) {
    next.address = normalizeText(next.address) || '';
    if (next.addressLine1 === undefined) {
      next.addressLine1 = next.address || null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(next, 'zip') && next.zip !== undefined) {
    next.zip = normalizeText(next.zip) || '';
    if (next.postalCode === undefined) {
      next.postalCode = next.zip || null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(next, 'lat') && next.lat !== undefined) {
    if (next.latitude === undefined) {
      next.latitude = next.lat;
    }
  }

  if (Object.prototype.hasOwnProperty.call(next, 'lng') && next.lng !== undefined) {
    if (next.longitude === undefined) {
      next.longitude = next.lng;
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(next, 'publicLocationLabel') ||
    Object.prototype.hasOwnProperty.call(next, 'city') ||
    Object.prototype.hasOwnProperty.call(next, 'state') ||
    Object.prototype.hasOwnProperty.call(next, 'address')
  ) {
    const label = buildPublicLocationLabel(next);
    if (label != null) {
      next.publicLocationLabel = label;
    }
  }

  return next;
}

function toPublicStudio(studio) {
  if (!studio) return studio;

  const safe = {
    ...studio,
    publicLocationLabel: buildPublicLocationLabel(studio),
  };

  delete safe.address;
  delete safe.addressLine1;
  delete safe.addressLine2;
  delete safe.zip;
  delete safe.postalCode;
  delete safe.arrivalInstructions;

  delete safe.lat;
  delete safe.lng;
  delete safe.latitude;
  delete safe.longitude;

  return safe;
}

function attachAuthorizedBookingLocation(booking) {
  if (!booking || !booking.studio) return booking;

  const studio = booking.studio;
  return {
    ...booking,
    locationDetails: {
      publicLocationLabel: buildPublicLocationLabel(studio),
      addressLine1: studio.addressLine1 || studio.address || null,
      addressLine2: studio.addressLine2 || null,
      city: studio.city || null,
      state: studio.state || null,
      postalCode: studio.postalCode || studio.zip || null,
      country: studio.country || null,
      arrivalInstructions: studio.arrivalInstructions || null,
    },
  };
}

module.exports = {
  buildPublicLocationLabel,
  mapStudioLocationInput,
  toPublicStudio,
  attachAuthorizedBookingLocation,
};
