function pick(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function getDisplayLocation(studio) {
  if (!studio) return '';
  const explicit = pick(studio.publicLocationLabel, studio.displayLocation, studio.locationLabel);
  if (explicit) return explicit;

  const cityState = [pick(studio.city), pick(studio.state)].filter(Boolean).join(', ');
  if (cityState) return cityState;

  return pick(studio.region, studio.country);
}

export function getCoordinates(studio) {
  if (!studio) return { lat: null, lng: null };

  const lat = Number(studio.lat ?? studio.latitude);
  const lng = Number(studio.lng ?? studio.longitude);

  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

export function getPrivateAddress(studioLike) {
  if (!studioLike) return null;

  const line1 = pick(studioLike.addressLine1);
  const line2 = pick(studioLike.addressLine2);
  const city = pick(studioLike.city);
  const state = pick(studioLike.state);
  const postalCode = pick(studioLike.postalCode);
  const country = pick(studioLike.country);
  const fallback = pick(studioLike.address);

  if (!line1 && !line2 && !city && !state && !postalCode && !country && !fallback) {
    return null;
  }

  return {
    line1,
    line2,
    city,
    state,
    postalCode,
    country,
    fallback,
    directions: pick(studioLike.arrivalInstructions, studioLike.directions),
  };
}

export function canRevealBookingAddress(booking) {
  const status = booking?.status;
  return status === 'CONFIRMED' || status === 'COMPLETED';
}
