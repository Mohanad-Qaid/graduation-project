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
        return rejectWithValue('Access denied. Admin accounts only.');
      }
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('admin', JSON.stringify(user));
      return { accessToken, user };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Login failed'
      );
    }
  }
);

// Restore session from localStorage — backend has no /auth/me endpoint
export const loadAdmin = createAsyncThunk(
  'auth/loadAdmin',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('accessToken');
      const adminRaw = localStorage.getItem('admin');
      if (!token || !adminRaw) return null;
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
