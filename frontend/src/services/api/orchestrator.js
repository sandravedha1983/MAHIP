import { apiRequest } from './client.js';

export function analyzeOrchestrator(payload) {
  return apiRequest('/orchestrator/analyze', {
    method: 'POST',
    body: payload,
    requireAuth: true,
  });
}
