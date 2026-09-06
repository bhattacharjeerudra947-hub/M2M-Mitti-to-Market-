import { apiGet } from '../api';

/** All farmers + businesses with map coordinates and live-tracking status. */
export async function getUserLocations() {
  return apiGet('/api/users/locations');
}