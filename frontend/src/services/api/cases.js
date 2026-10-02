import { apiRequest } from './client.js';

export function createCase(payload) {
  return apiRequest('/cases', {
    method: 'POST',
    body: payload,
    requireAuth: true,
  });
}

export function getCase(caseId) {
  return apiRequest(`/cases/${caseId}`, {
    method: 'GET',
    requireAuth: true,
  });
}
