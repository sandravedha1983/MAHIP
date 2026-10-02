import { apiRequest } from './client.js';

export function createPatient(payload) {
  return apiRequest('/patients', {
    method: 'POST',
    body: payload,
    requireAuth: true,
  });
}

export function getPatient(patientId) {
  return apiRequest(`/patients/${patientId}`, {
    method: 'GET',
    requireAuth: true,
  });
}

export function getMyPatient() {
  return apiRequest('/patients/me', {
    method: 'GET',
    requireAuth: true,
  });
}
