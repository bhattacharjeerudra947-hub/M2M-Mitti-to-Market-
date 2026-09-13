import { apiGet, apiPost, apiPut, apiUpload } from '../api';

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

// ──────── Deal Timeline ────────

export async function getDealTimeline(dealId) {
  return apiGet(`/api/deals/${dealId}/timeline`);
}

// ──────── Evidence & Verification ────────

export async function uploadEvidenceFile(dealId, file, fields = {}) {
  return apiUpload(`/api/deals/${dealId}/evidence/upload`, file, fields);
}

export async function recordEvidenceJson(dealId, body) {
  return apiPost(`/api/deals/${dealId}/evidence`, body);
}

export async function getDealEvidence(dealId) {
  return apiGet(`/api/deals/${dealId}/evidence`);
}

export async function verifyEvidence(evidenceId, body) {
  return apiPut(`/api/evidence/${evidenceId}/verify`, body);
}

// ──────── Delivery Acceptance ────────

export async function acceptDelivery(dealId) {
  return apiPost(`/api/deals/${dealId}/accept-delivery`);
}

export async function confirmDelivery(dealId, details) {
  return apiPost(`/api/deals/${dealId}/confirm-delivery`, details);
}

// ──────── Disputes & Resolution ────────

export async function openDispute(dealId, details) {
  return apiPost(`/api/deals/${dealId}/disputes`, details);
}

export async function getDisputes(dealId) {
  return apiGet(`/api/deals/${dealId}/disputes`);
}

export async function getDisputeDetails(disputeId) {
  return apiGet(`/api/disputes/${disputeId}`);
}

export async function respondToDispute(disputeId, body) {
  return apiPost(`/api/disputes/${disputeId}/respond`, body);
}

export async function assignObserver(disputeId, body) {
  return apiPost(`/api/disputes/${disputeId}/assign-observer`, body);
}

export async function requestDisputeEvidence(disputeId, body) {
  return apiPost(`/api/disputes/${disputeId}/request-evidence`, body);
}

export async function resolveDispute(disputeId, body) {
  return apiPost(`/api/disputes/${disputeId}/resolve`, body);
}

export async function getObserverCases() {
  return apiGet('/api/observer/cases');
}

export async function getAvailableObservers() {
  return apiGet('/api/admin/observers');
}

// ──────── Own Logistics & Payments ────────

export async function configureOwnLogistics(dealId, details) {
  return apiPost(`/api/deals/${dealId}/logistics/own`, details);
}

export async function createDemoPayment(dealId, body = {}) {
  return apiPost('/api/payments/create-demo', { dealId, ...body });
}

export async function confirmDemoPayment(body) {
  return apiPost('/api/payments/confirm', body);
}

export async function getDealPayment(dealId) {
  return apiGet(`/api/payments/deal/${dealId}`);
}

// ──────── Logistics Incidents & Liability ────────

export async function reportIncident(body) {
  return apiPost('/api/logistics/incidents', body);
}

export async function getIncidentsByDeal(dealId) {
  return apiGet(`/api/logistics/incidents/deal/${dealId}`);
}

export async function getAllIncidents() {
  return apiGet('/api/logistics/incidents');
}

export async function adjudicateLiability(incidentId, body) {
  return apiPut(`/api/logistics/incidents/${incidentId}/liability`, body);
}
