import { apiGet, apiPost, apiPut } from '../api';

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

// ──────── Delivery ────────

export async function confirmDelivery(dealId, details) {
  return apiPost(`/api/deals/${dealId}/confirm-delivery`, details);
}
