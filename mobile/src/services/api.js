import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './config';

const KEY_TOKEN = 'ewallet_token';
const KEY_REFRESH_TOKEN = 'ewallet_refresh';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Store injection ──────────────────────────────────────────────────────────
// Injected at app startup (App.js) to avoid circular imports.
let _store = null;
export function injectStore(store) {
  _store = store;
}

// ─── Token refresh state ──────────────────────────────────────────────────────
// Ensures only one refresh call is in-flight at a time.
// All 401'd requests while refreshing are queued and retried after.
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

// ─── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(KEY_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 errors, and not for the refresh call itself
    // to avoid an infinite loop.
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If a refresh is already in-flight, queue this request until it resolves.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await SecureStore.getItemAsync(KEY_REFRESH_TOKEN);

      if (!refreshToken) {
        // No refresh token stored — force logout immediately.
        throw new Error('No refresh token available.');
      }

      // Exchange the refresh token for a new access token.
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      const { accessToken } = response.data.data;

      // Persist the new access token securely.
      await SecureStore.setItemAsync(KEY_TOKEN, accessToken);

      // Unblock all queued requests with the new token.
      processQueue(null, accessToken);

      // Retry the original failed request.
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed — the session is truly over. Clear secrets and
      // dispatch logout so Redux and navigation can react.
      processQueue(refreshError, null);
      await SecureStore.deleteItemAsync(KEY_TOKEN);
      await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);

      if (_store) {
        // Lazy-import to avoid circular dependency at module load time.
        const { logout } = await import('../store/slices/authSlice');
        _store.dispatch(logout.fulfilled(null, '', undefined));
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
