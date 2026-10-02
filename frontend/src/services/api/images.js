import { apiRequest } from './client.js';

export function uploadImage({ patientId, file }) {
  const formData = new FormData();
  formData.append('patient_id', patientId);
  formData.append('file', file);

  return apiRequest('/images/upload', {
    method: 'POST',
    body: formData,
    isMultipart: true,
    requireAuth: true,
  });
}

export function analyzeImage(imageId) {
  return apiRequest(`/images/${imageId}/analyze`, {
    method: 'POST',
    requireAuth: true,
  });
}
