import { apiRequest } from './client.js';

export function listDoctors(specialization) {
  const query = specialization ? `?specialization=${encodeURIComponent(specialization)}` : '';
  return apiRequest(`/doctors${query}`, {
    method: 'GET',
    requireAuth: true,
  });
}
