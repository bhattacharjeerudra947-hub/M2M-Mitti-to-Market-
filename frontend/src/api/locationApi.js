import { apiGet, apiPost } from '../api';

/**
 * Geocode an address string (or village, district, state) into lat/lng.
 */
export async function geocodeAddress(addressData) {
  const payload = typeof addressData === 'string'
    ? { address: addressData }
    : addressData;
  return apiPost('/api/location/geocode', payload);
}

/**
 * Request optimal route calculation and multiple candidates with transparent scoring.
 */
export async function calculateRoute(body) {
  return apiPost('/api/logistics/route', body);
}

/**
 * Set confirmed logistics location coordinates (registered or live) on a deal.
 */
export async function setDealLocations(dealId, body) {
  return apiPost(`/api/deals/${dealId}/locations`, body);
}

/**
 * Fetch the shared route information for a deal (identical view for both Farmer & Buyer).
 */
export async function getDealRouteInfo(dealId) {
  return apiGet(`/api/deals/${dealId}/route-info`);
}