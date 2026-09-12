import { apiGet, apiPost, apiPut } from '../api';

// ──────── Structured Negotiation Offers ────────

export async function createOffer(conversationId, body) {
  return apiPost('/api/offers', { conversationId, ...body });
}

export async function getConversationOffers(conversationId) {
  return apiGet(`/api/offers/conversation/${conversationId}`);
}

export async function acceptOffer(offerId) {
  return apiPost(`/api/offers/${offerId}/accept`);
}

export async function counterOffer(offerId, body) {
  return apiPost(`/api/offers/${offerId}/counter`, body);
}

export async function rejectOffer(offerId) {
  return apiPost(`/api/offers/${offerId}/reject`);
}

// ──────── Deal Lock ────────

export async function initiateDealLock(conversationId, details) {
  return apiPost('/api/deals/lock', { conversationId, details });
}

export async function confirmDeal(dealId) {
  return apiPost(`/api/deals/${dealId}/confirm`);
}

export async function cancelDeal(dealId) {
  return apiPost(`/api/deals/${dealId}/cancel`);
}

export async function getDeal(dealId) {
  return apiGet(`/api/deals/${dealId}`);
}

export async function getDealByConversation(conversationId) {
  return apiGet(`/api/deals/conversation/${conversationId}`);
}

export async function getFarmerDeals(farmerId) {
  return apiGet(`/api/deals/farmer/${farmerId}`);
}

export async function getBuyerDeals(buyerId) {
  return apiGet(`/api/deals/buyer/${buyerId}`);
}

// ──────── Logistics ────────

export async function selectLogistics(dealId, type) {
  return apiPost(`/api/deals/${dealId}/logistics/select`, { type });
}

export async function updateLogisticsDetails(logisticsId, details) {
  return apiPut(`/api/deals/logistics/${logisticsId}/details`, details);
}

export async function updateLogisticsStatus(logisticsId, status, location, description) {
  return apiPut(`/api/deals/logistics/${logisticsId}/status`, { status, location, description });
}

export async function updateLocation(logisticsId, latitude, longitude) {
  return apiPut(`/api/deals/logistics/${logisticsId}/location`, { latitude, longitude });
}

export async function getLogistics(dealId) {
  return apiGet(`/api/deals/${dealId}/logistics`);
}

export async function getTimeline(logisticsId) {
  return apiGet(`/api/deals/logistics/${logisticsId}/timeline`);
}

// ──────── Logistics Intelligence ────────

export async function getMyLogistics() {
  return apiGet('/api/deals/logistics/my');
}

export async function getRouteEstimate(logisticsId) {
  return apiGet(`/api/deals/logistics/${logisticsId}/route`);
}

export async function optimizeRoute(body) {
  return apiPost('/api/deals/logistics/optimize-route', body);
}

export async function setDealLocations(dealId, body) {
  return apiPost(`/api/deals/${dealId}/locations`, body);
}

export async function getDealRouteInfo(dealId) {
  return apiGet(`/api/deals/${dealId}/route-info`);
}

// ──────── Platform Vehicles ────────

export async function getAvailableVehicles(dealId) {
  return apiGet(`/api/deals/${dealId}/logistics/vehicles`);
}

export async function assignVehicle(dealId, vehicleId) {
  return apiPost(`/api/deals/${dealId}/logistics/assign`, { vehicleId });
}

export async function getAllVehicles() {
  return apiGet('/api/vehicles');
}

export async function createVehicle(body) {
  return apiPost('/api/vehicles', body);
}

export async function updateVehicle(vehicleId, body) {
  return apiPut(`/api/vehicles/${vehicleId}`, body);
}

// ──────── Admin Logistics ────────

export async function getAdminLogistics() {
  return apiGet('/api/admin/logistics');
}

export async function getAdminLogisticsStats() {
  return apiGet('/api/admin/logistics/stats');
}

// ──────── Deal Timeline + Disputes ────────

export async function getDealTimeline(dealId) {
  return apiGet(`/api/deals/${dealId}/timeline`);
}

export async function openDispute(dealId, details) {
  return apiPost(`/api/deals/${dealId}/disputes`, details);
}

export async function getDisputes(dealId) {
  return apiGet(`/api/deals/${dealId}/disputes`);
}

// ──────── Delivery ────────

export async function confirmDelivery(dealId, details) {
  return apiPost(`/api/deals/${dealId}/confirm-delivery`, details);
}
