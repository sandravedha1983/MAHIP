import { apiRequest } from './client.js';

export function createAppointment(payload) {
  return apiRequest('/appointments', {
    method: 'POST',
    body: payload,
    requireAuth: true,
  });
}

export function getPatientAppointments(patientId) {
  return apiRequest(`/appointments/patient/${patientId}`, {
    method: 'GET',
    requireAuth: true,
  });
}
