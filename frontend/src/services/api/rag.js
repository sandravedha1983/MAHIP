import { apiRequest } from './client.js';

export function searchKnowledge(query, topK = 5) {
  return apiRequest('/rag/search', {
    method: 'POST',
    body: { query, top_k: topK },
    requireAuth: true,
  });
}
