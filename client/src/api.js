const TOKEN_KEY = 'album_show_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(path, { ...options, headers });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || '请求失败');
  return data;
}

export const api = {
  register: (username, password) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/api/auth/me'),
  updateMe: (store_name) =>
    request('/api/me', { method: 'PUT', body: JSON.stringify({ store_name }) }),
  getUser: (username) => request(`/api/users/${encodeURIComponent(username)}`),
  myAlbums: () => request('/api/albums'),
  addAlbum: (payload) => request('/api/albums', { method: 'POST', body: JSON.stringify(payload) }),
  updateAlbum: (id, payload) =>
    request(`/api/albums/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAlbum: (id) => request(`/api/albums/${id}`, { method: 'DELETE' }),
  itunesSearch: (term) => request(`/api/itunes/search?term=${encodeURIComponent(term)}`),
};