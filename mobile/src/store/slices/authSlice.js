import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import api from '../../services/api';
// SQLite is still used by other screens (transaction cache, balance).
// Auth thunks must NOT depend on it — expo-sqlite's async API fails on
// Expo Go / New Architecture with NullPointerException on prepareAsync.
import { clearCachedTransactions } from '../../services/offlineDb';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const KEY_TOKEN         = 'ewallet_token';
const KEY_REFRESH_TOKEN = 'ewallet_refresh';
const KEY_DEV_EMAIL     = 'ewallet_device_email';
const KEY_DEV_FIRSTNAME = 'ewallet_device_firstname';
const KEY_DEV_LASTNAME  = 'ewallet_device_lastname';

// ─── Helpers (all use SecureStore — already installed, works in Expo Go) ──────
async function saveDeviceRegistration(user) {
  const email     = user?.email ?? '';
  const firstName = user?.first_name ?? user?.firstName ?? '';
  const lastName  = user?.last_name  ?? user?.lastName  ?? '';
  await SecureStore.setItemAsync(KEY_DEV_EMAIL,     email);
  await SecureStore.setItemAsync(KEY_DEV_FIRSTNAME, firstName);
  await SecureStore.setItemAsync(KEY_DEV_LASTNAME,  lastName);
}

async function loadDeviceRegistration() {
  const email     = await SecureStore.getItemAsync(KEY_DEV_EMAIL);
  const firstName = await SecureStore.getItemAsync(KEY_DEV_FIRSTNAME);
  const lastName  = await SecureStore.getItemAsync(KEY_DEV_LASTNAME);
  return email ? { email, firstName, lastName } : null;
}

async function clearDeviceRegistration() {
  await SecureStore.deleteItemAsync(KEY_DEV_EMAIL);
  await SecureStore.deleteItemAsync(KEY_DEV_FIRSTNAME);
  await SecureStore.deleteItemAsync(KEY_DEV_LASTNAME);
}

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data.data;

      // JWT → SecureStore
      await SecureStore.setItemAsync(KEY_TOKEN, accessToken);
      await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, refreshToken);

      // Device registration → AsyncStorage (works everywhere including Expo Go)
      await saveDeviceRegistration(user);

      return { token: accessToken, user };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Login failed. Check your credentials.'
      );
    }
  }
);

// ─── PIN Login ────────────────────────────────────────────────────────────────
// Reads the saved email from AsyncStorage and calls /auth/login with the PIN.
// Works for both Scenario A (soft lock) and Scenario B (hard logout).
export const pinLogin = createAsyncThunk(
  'auth/pinLogin',
  async ({ pin }, { rejectWithValue }) => {
    try {
      const device = await loadDeviceRegistration();
      if (!device?.email) {
        return rejectWithValue('No device account found. Please log in again.');
      }

      const response = await api.post('/auth/login', {
        email: device.email,
        password: pin,
      });
      const { accessToken, refreshToken, user } = response.data.data;

      await SecureStore.setItemAsync(KEY_TOKEN, accessToken);
      await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, refreshToken);
      // Refresh device registration with latest server data
      await saveDeviceRegistration(user);

      return { token: accessToken, user };
    } catch (error) {
      const isNetworkError = !error.response;
      const message = isNetworkError
        ? 'Please check your internet connection.'
        : error.response?.data?.message || 'Incorrect PIN. Please try again.';
      return rejectWithValue(message);
    }
  }
);

// ─── Register ─────────────────────────────────────────────────────────────────
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Registration failed.'
      );
    }
  }
);

// ─── Load User (cold-start) ───────────────────────────────────────────────────
export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    // Always load device registration from AsyncStorage first.
    // This populates the "Welcome back" greeting even before the network call.
    const device = await loadDeviceRegistration();

    try {
      const token = await SecureStore.getItemAsync(KEY_TOKEN);
      if (!token) {
        // No JWT — user is hard-logged-out. Show PinLockScreen if device is registered.
        return { user: null, device };
      }
      const response = await api.get('/auth/me');
      const user = response.data.data;
      // Refresh device registration with latest server data
      await saveDeviceRegistration(user);
      return { user, device };
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        await SecureStore.deleteItemAsync(KEY_TOKEN);
        await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
        return { user: null, device };
      }
      // Network / 5xx — keep tokens, show offline mode
      return rejectWithValue({ isNetworkError: true, device });
    }
  }
);

// ─── Update Profile ───────────────────────────────────────────────────────────
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

// ─── Logout ───────────────────────────────────────────────────────────────────
// Clears JWT but intentionally KEEPS device registration so PinLockScreen
// is shown on next cold-start (the whole point of this feature).
export const logout = createAsyncThunk('auth/logout', async () => {
  try { await api.post('/auth/logout'); } catch { /* ignore */ }
  await SecureStore.deleteItemAsync(KEY_TOKEN);
  await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
  try { await clearCachedTransactions(); } catch { /* SQLite may fail in Expo Go */ }
  return null;
});

// ─── Wipe Device (switch account / 3 wrong PINs) ─────────────────────────────
// Full wipe — clears everything including device registration.
export const wipeDevice = createAsyncThunk('auth/wipeDevice', async () => {
  try { await api.post('/auth/logout'); } catch { /* ignore */ }
  await SecureStore.deleteItemAsync(KEY_TOKEN);
  await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
  await clearDeviceRegistration();
  try { await clearCachedTransactions(); } catch { /* SQLite may fail in Expo Go */ }
  return null;
});

// ─── Slice ────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    registrationSuccess: false,
    isSessionLocked: false,
    failCount: 0,
    isOffline: false,
    // Device registration (from AsyncStorage — reliable on Expo Go)
    cachedEmail: null,
    cachedFirstName: null,
    cachedLastName: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    clearRegistrationSuccess: (state) => { state.registrationSuccess = false; },
    lockSession: (state) => {
      if (state.isAuthenticated) state.isSessionLocked = true;
    },
    unlockSession: (state) => {
      state.isSessionLocked = false;
      state.failCount = 0;
      state.error = null;
    },
    incrementFailCount: (state) => { state.failCount += 1; },
  },
  extraReducers: (builder) => {
    builder
      // ── Login ──────────────────────────────────────────────────────────
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.isSessionLocked = false;
        state.failCount = 0;
        state.user = action.payload.user;
        state.token = action.payload.token;
        const u = action.payload.user;
        state.cachedEmail     = u?.email ?? null;
        state.cachedFirstName = u?.first_name ?? u?.firstName ?? null;
        state.cachedLastName  = u?.last_name  ?? u?.lastName  ?? null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // ── PIN Login ──────────────────────────────────────────────────────
      .addCase(pinLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(pinLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.isSessionLocked = false;
        state.failCount = 0;
        state.user = action.payload.user;
        state.token = action.payload.token;
        const u = action.payload.user;
        state.cachedEmail     = u?.email ?? null;
        state.cachedFirstName = u?.first_name ?? u?.firstName ?? null;
        state.cachedLastName  = u?.last_name  ?? u?.lastName  ?? null;
      })
      .addCase(pinLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.failCount += 1;
        state.error = action.payload;
      })

      // ── Register ───────────────────────────────────────────────────────
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

      // ── Load User ──────────────────────────────────────────────────────
      .addCase(loadUser.pending, (state) => { state.isLoading = true; })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const { user, device } = action.payload;

        if (device) {
          state.cachedEmail     = device.email     ?? null;
          state.cachedFirstName = device.firstName ?? null;
          state.cachedLastName  = device.lastName  ?? null;
        }

        if (user) {
          state.isAuthenticated = true;
          state.user = user;
          state.isSessionLocked = true;
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
        }
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.isLoading = false;
        if (action.payload?.isNetworkError) {
          state.isOffline = true;
          const d = action.payload?.device;
          if (d) {
            state.cachedEmail     = d.email     ?? null;
            state.cachedFirstName = d.firstName ?? null;
            state.cachedLastName  = d.lastName  ?? null;
          }
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
        }
      })

      // ── Update Profile ─────────────────────────────────────────────────
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
        state.cachedFirstName = action.payload.first_name ?? state.cachedFirstName;
        state.cachedLastName  = action.payload.last_name  ?? state.cachedLastName;
        state.cachedEmail     = action.payload.email      ?? state.cachedEmail;
      })

      // ── Logout (keeps device registration) ────────────────────────────
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isSessionLocked = false;
        state.failCount = 0;
        state.isOffline = false;
        // cachedEmail / cachedFirstName / cachedLastName intentionally kept
        // so the PinLockScreen shows on next cold-start
      })

      // ── Wipe Device ────────────────────────────────────────────────────
      .addCase(wipeDevice.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isSessionLocked = false;
        state.failCount = 0;
        state.isOffline = false;
        state.cachedEmail = null;
        state.cachedFirstName = null;
        state.cachedLastName = null;
      });
  },
});

export const {
  clearError,
  clearRegistrationSuccess,
  lockSession,
  unlockSession,
  incrementFailCount,
} = authSlice.actions;

export default authSlice.reducer;
