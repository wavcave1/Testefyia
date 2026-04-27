import { getCoordinates, getDisplayLocation } from './location';

const cache = {};

async function geocodeLocation(location, token) {
  if (!location) return { lat: null, lng: null };
  if (cache[location] !== undefined) return cache[location];

  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${token}&types=place,region&limit=1`,
    );
    const data = await res.json();
    const feature = data.features?.[0];
    cache[location] = feature
      ? { lat: feature.center[1], lng: feature.center[0] }
      : { lat: null, lng: null };
  } catch {
    cache[location] = { lat: null, lng: null };
  }

  return cache[location];
}

/**
 * Returns { lat, lng } for a studio.
 * Uses explicit coordinates if present, otherwise geocodes via Mapbox.
 */
export async function resolveStudioCoords(studio, token) {
  const explicit = getCoordinates(studio);
  if (explicit.lat != null && explicit.lng != null) return explicit;
  return geocodeLocation(getDisplayLocation(studio), token);
}
