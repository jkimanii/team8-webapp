export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

const WEBSITE_KEY = import.meta.env.VITE_API_KEY;

export function apiFetch(path, options = {}) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(WEBSITE_KEY ? { 'X-API-Key': WEBSITE_KEY } : {}),
      ...options.headers,
    },
  });
}
