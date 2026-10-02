const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function getAuthToken() {
  return localStorage.getItem('mahip_access_token');
}

export function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers = {}, isMultipart = false, requireAuth = false } = options;

  const requestHeaders = { ...headers };

  if (!isMultipart) {
    requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
  }

  if (requireAuth || getAuthToken()) {
    const token = getAuthToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const finalBody = body instanceof FormData ? body : body ? JSON.stringify(body) : undefined;

  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: finalBody,
    credentials: 'include',
  }).then(async (response) => {
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { detail: text };
      }
    }

    if (!response.ok) {
      const detail = payload?.detail || payload?.message || 'Request failed.';
      const message = Array.isArray(detail) ? detail.map((item) => item.msg || item).join(', ') : detail;
      throw new Error(message);
    }

    return payload;
  }).catch((error) => {
    if (error instanceof TypeError) {
      throw new Error(`Could not reach the MAHIP API at ${API_BASE_URL}. Check that the backend is running and allows this frontend origin.`);
    }
    throw error;
  });
}

export { API_BASE_URL };
