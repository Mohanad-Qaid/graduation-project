import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password, isAdmin: true });
      // Backend response shape: { success, message, data: { accessToken, refreshToken, user } }
      const { accessToken, user } = response.data.data;
      if (user.role !== 'ADMIN') {
        return rejectWithValue({ code: 'FORBIDDEN', message: 'Access denied. Admin accounts only.' });
      }
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('admin', JSON.stringify(user));
      return { accessToken, user };
    } catch (error) {
      const status = error.response?.status;
      const backendMsg = error.response?.data?.message;

      // Server offline / network failure — no HTTP response at all
      if (!error.response) {
        return rejectWithValue({
          code: 'OFFLINE',
          message: 'Cannot reach the server. Check your network or ensure the backend is running.',
        });
      }

      // 429 — IP rate-limiter OR per-account 3-attempt soft lockout
      if (status === 429) {
        return rejectWithValue({
          code: 'RATE_LIMITED',
          message: backendMsg || 'Too many login attempts. Please wait before trying again.',
        });
      }

      // 403 — wrong role, or account status (suspended / pending)
      if (status === 403) {
        return rejectWithValue({
          code: 'FORBIDDEN',
          message: backendMsg || 'Access denied.',
        });
      }

      // 401 — wrong email or password
      if (status === 401) {
        return rejectWithValue({
          code: 'INVALID_CREDENTIALS',
          message: 'Incorrect email or password. Please check your credentials and try again.',
        });
      }

      // 400 — express-validator field error
      if (status === 400) {
        return rejectWithValue({
          code: 'VALIDATION',
          message: backendMsg || 'Please check your inputs and try again.',
        });
      }

      // 5xx — backend crash / DB down
      if (status >= 500) {
        return rejectWithValue({
          code: 'SERVER_ERROR',
          message: 'The server encountered an error. Please try again shortly.',
        });
      }

      return rejectWithValue({
        code: 'UNKNOWN',
        message: backendMsg || 'An unexpected error occurred. Please try again.',
      });
    }
  }
);

// Decode the JWT payload without a library — JWTs are just base64 JSON.
// This reads the `exp` field (expiry timestamp in seconds) from the token itself,
// so we can reject stale sessions without any network request.
function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ?? null; // seconds since epoch
  } catch {
    return null;
  }
}

// Restore session from localStorage.
// Validates the JWT expiry client-side before allowing access.
// If the token is expired, clear storage immediately — no server call needed.
export const loadAdmin = createAsyncThunk(
  'auth/loadAdmin',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('accessToken');
      const adminRaw = localStorage.getItem('admin');

      if (!token || !adminRaw) return null;

      // Check expiry directly from the JWT payload (no backend needed)
      const exp = getTokenExpiry(token);
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (!exp || nowInSeconds >= exp) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('admin');
        return rejectWithValue('Session expired');
      }

      const admin = JSON.parse(adminRaw);
      if (admin.role !== 'ADMIN') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('admin');
        return rejectWithValue('Access denied');
      }

      return admin;
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('admin');
      return rejectWithValue('Session invalid');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    // Tell the backend to invalidate the token (blocklist it in Redis)
    await api.post('/auth/logout');
  } catch (_) {
    // Proceed with local cleanup regardless
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('admin');
  return null;
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    admin: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.admin = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(loadAdmin.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.admin = action.payload;
        }
      })
      .addCase(loadAdmin.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.admin = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.admin = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
