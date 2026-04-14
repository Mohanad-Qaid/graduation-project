import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';

// ─── Login ─────────────────────────────────────────────────────────────────────
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      // Backend response shape: { success, data: { accessToken, refreshToken, user } }
      const { accessToken, refreshToken, user } = response.data.data;
      await AsyncStorage.setItem('token', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      return { token: accessToken, user };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Login failed. Check your credentials.'
      );
    }
  }
);

// ─── Register ──────────────────────────────────────────────────────────────────
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      // userData must have: first_name, last_name, email, phone, password, role
      // and business_name if role === 'MERCHANT'
      const response = await api.post('/auth/register', userData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Registration failed.'
      );
    }
  }
);

// ─── Load User (session restore) ───────────────────────────────────────────────
export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return null;
      const response = await api.get('/auth/me');
      // Backend shape: { success, data: user }
      return response.data.data;
    } catch (error) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('user');
      return rejectWithValue(
        error.response?.data?.message || 'Session expired.'
      );
    }
  }
);

// ─── Update Profile ────────────────────────────────────────────────────────────
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.patch('/auth/profile', profileData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Update failed');
    }
  }
);

// ─── Logout ────────────────────────────────────────────────────────────────────
export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore errors — clear local storage regardless
  }
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('refreshToken');
  await AsyncStorage.removeItem('user');
  return null;
});

// ─── Slice ─────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    registrationSuccess: false,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearRegistrationSuccess: (state) => {
      state.registrationSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.registrationSuccess = false;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false;
        state.registrationSuccess = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Load user
      .addCase(loadUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload;
        }
      })
      .addCase(loadUser.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, clearRegistrationSuccess } = authSlice.actions;
export default authSlice.reducer;
