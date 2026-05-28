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

// On 401: clear storage and redirect to login.
// On network errors (server offline): attach a human-readable message.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // On 401: only redirect to login if this was NOT the login request itself.
    // If we redirect on login failures, the page reloads before the error is shown.
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
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

    // When the server is completely offline (no response at all), axios sets
    // error.response to undefined. Convert this to a readable message so that
    // slices and pages can display it instead of getting undefined/null.
    if (!error.response) {
      error.readableMessage = 'Cannot reach the server. Check that the backend is running.';
    } else {
      // Extract the backend's error message if available
      error.readableMessage =
        error.response.data?.message ||
        `Request failed with status ${error.response.status}.`;
    }

    return Promise.reject(error);
  }
);

export default api;
