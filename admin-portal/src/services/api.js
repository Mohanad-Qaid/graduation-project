import axios from 'axios';

// Base URL matches the backend's /api/v1 prefix
const API_URL = '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// On 401: clear storage and redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt to inform the backend of the logout (best-effort)
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          await axios.post(`${API_URL}/auth/logout`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch (_) {
        // Ignore errors here — we're logging out regardless
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('admin');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
