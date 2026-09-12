import { apiGet, apiPost, apiPut } from '../api';

// ================= Warehouse / Partner Hubs =================

export async function getHubs(params = {}) {
  const query = new URLSearchParams();
  if (params.state) query.append('state', params.state);
  if (params.district) query.append('district', params.district);
  if (params.activeOnly !== undefined) query.append('activeOnly', params.activeOnly);
  const qStr = query.toString();
  return apiGet(`/api/hubs${qStr ? `?${qStr}` : ''}`);
}

export async function getHubById(hubId) {
  return apiGet(`/api/hubs/${hubId}`);
}

export async function findSuitableHubs(buyerLat, buyerLng, cropName, quantityKg) {
  const query = new URLSearchParams({
    lat: buyerLat,
    lng: buyerLng,
    crop: cropName || '',
    quantity: quantityKg || 0,
  });
  return apiGet(`/api/hubs/suitable?${query.toString()}`);
}

// ================= Inventory Lots =================

export async function getHubInventory(hubId, params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.crop) query.append('crop', params.crop);
  if (params.search) query.append('search', params.search);
  const qStr = query.toString();
  return apiGet(`/api/hubs/${hubId}/inventory${qStr ? `?${qStr}` : ''}`);
}

export async function recordInboundLot(hubId, inboundData) {
  return apiPost(`/api/hubs/${hubId}/inventory/inbound`, inboundData);
}

export async function dispatchOutboundLot(hubId, outboundData) {
  return apiPost(`/api/hubs/${hubId}/inventory/outbound`, outboundData);
}

// ================= Reverse Logistics =================

export async function getReverseLogisticsByDeal(dealId) {
  return apiGet(`/api/deals/${dealId}/reverse-logistics`);
}

export async function optimizeReverseDestination(dealId, returnQuantityKg, returnReason) {
  const query = new URLSearchParams({
    quantity: returnQuantityKg || 0,
    reason: returnReason || '',
  });
  return apiGet(`/api/deals/${dealId}/reverse-logistics/optimize?${query.toString()}`);
}

export async function requestReverseLogistics(dealId, data) {
  return apiPost(`/api/deals/${dealId}/reverse-logistics/request`, data);
}

export async function approveReverseLogistics(reverseLogisticsId, data = {}) {
  return apiPost(`/api/reverse-logistics/${reverseLogisticsId}/approve`, data);
}

export async function updateReverseStatus(reverseLogisticsId, status, notes = '') {
  return apiPut(`/api/reverse-logistics/${reverseLogisticsId}/status`, { status, notes });
}

export async function submitReturnInspection(reverseLogisticsId, inspectionData) {
  return apiPost(`/api/reverse-logistics/${reverseLogisticsId}/inspection`, inspectionData);
}

// ================= Admin Oversight =================

export async function getAdminHubs() {
  return apiGet('/api/admin/hubs');
}

export async function getAdminReverseLogistics() {
  return apiGet('/api/admin/reverse-logistics');
}
