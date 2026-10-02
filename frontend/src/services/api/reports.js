import { apiRequest } from './client.js';

export function uploadReport({ patientId, file }) {
  const formData = new FormData();
  formData.append('patient_id', patientId);
  formData.append('file', file);

  return apiRequest('/reports/upload', {
    method: 'POST',
    body: formData,
    isMultipart: true,
    requireAuth: true,
  });
}

export function analyzeReport(reportId) {
  return apiRequest(`/reports/${reportId}/analyze`, {
    method: 'POST',
    requireAuth: true,
  });
}
