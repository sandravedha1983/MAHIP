import { apiRequest } from './client.js';

export function getAgentLogs(caseId) {
  return apiRequest(`/agents/logs/${caseId}`, {
    method: 'GET',
    requireAuth: true,
  });
}
