import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Store injection ─────────────────────────────────────────────────────────
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
    const token = await AsyncStorage.getItem('token');
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
      const refreshToken = await AsyncStorage.getItem('refreshToken');

      if (!refreshToken) {
        // No refresh token stored — force logout immediately.
        throw new Error('No refresh token available.');
      }

      // Exchange the refresh token for a new access token.
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      const { accessToken } = response.data.data;

      // Persist the new access token.
      await AsyncStorage.setItem('token', accessToken);

      // Unblock all queued requests with the new token.
      processQueue(null, accessToken);

      // Retry the original failed request.
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed — the session is truly over. Clear everything and
      // dispatch logout so Redux and navigation can react.
      processQueue(refreshError, null);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('user');

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
