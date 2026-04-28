import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import api from '../../services/api';
import {
  saveUserProfile,
  getUserProfile,
  clearUserProfile,
  clearCachedTransactions,
} from '../../services/offlineDb';

// ─── SecureStore keys (secrets only) ─────────────────────────────────────────
// PIN is never stored locally — verification is strictly online via POST /auth/login.
const KEY_TOKEN = 'ewallet_token';
const KEY_REFRESH_TOKEN = 'ewallet_refresh';

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data.data;

      // Store JWT secrets in SecureStore
      await SecureStore.setItemAsync(KEY_TOKEN, accessToken);
      await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, refreshToken);

      // Persist non-sensitive profile to SQLite for offline access
      await saveUserProfile(user, 0);

      return { token: accessToken, user };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Login failed. Check your credentials.'
      );
    }
  }
);

// ─── PIN Login (Online PIN verification — both Scenario A and B) ──────────────
// Scenario A (Soft Lock): isAuthenticated is true but session is locked.
// Scenario B (Hard Logout): no valid JWT at all.
// In both cases the email is read from SQLite and the PIN is verified online.
export const pinLogin = createAsyncThunk(
  'auth/pinLogin',
  async ({ pin }, { rejectWithValue }) => {
    try {
      // Read email from SQLite (single source of truth for device account)
      const profile = await getUserProfile();
      if (!profile?.email) return rejectWithValue('No device account found.');

      const response = await api.post('/auth/login', {
        email: profile.email,
        password: pin,
      });
      const { accessToken, refreshToken, user } = response.data.data;

      await SecureStore.setItemAsync(KEY_TOKEN, accessToken);
      await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, refreshToken);

      // Refresh the SQLite profile snapshot with fresh server data
      await saveUserProfile(user, 0);

      return { token: accessToken, user };
    } catch (error) {
      // Distinguish network failures from wrong credentials
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

// ─── Load User (cold-start session restore) ───────────────────────────────────
export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    // Always attempt to read the offline profile snapshot first.
    // This lets the UI show the name / letter avatar even before any network call.
    const cachedProfile = await getUserProfile();

    try {
      const token = await SecureStore.getItemAsync(KEY_TOKEN);
      if (!token) {
        // No JWT — return cached profile only; RootNavigator shows PinLockScreen
        return { user: null, cachedProfile };
      }
      // Valid token found — fetch fresh user data from the server
      const response = await api.get('/auth/me');
      const user = response.data.data;

      // Refresh the SQLite snapshot with fresh data (keep balance as-is)
      await saveUserProfile(user, cachedProfile?.last_known_balance ?? 0);

      return { user, cachedProfile };
    } catch (error) {
      const status = error?.response?.status;

      if (status === 401 || status === 403) {
        // Token is genuinely invalid or revoked — evict it and force re-auth
        await SecureStore.deleteItemAsync(KEY_TOKEN);
        await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
        return { user: null, cachedProfile };
      }

      // Network error or unexpected server error (5xx) — tokens are still valid.
      // Do NOT wipe credentials; surface the offline state to the UI instead.
      return rejectWithValue({ isNetworkError: true, cachedProfile });
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

// ─── Logout (standard — full device wipe for multi-user safety) ───────────────
export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore — clear local storage regardless
  }
  await SecureStore.deleteItemAsync(KEY_TOKEN);
  await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
  // Wipe SQLite so a different user logging in on the same device
  // cannot see any trace of the previous session.
  await clearUserProfile();
  await clearCachedTransactions();
  return null;
});

// ─── Wipe Device (switch account / 3 wrong PINs) ─────────────────────────────
export const wipeDevice = createAsyncThunk('auth/wipeDevice', async () => {
  try { await api.post('/auth/logout'); } catch { /* ignore */ }
  await SecureStore.deleteItemAsync(KEY_TOKEN);
  await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
  // Clear SQLite profile so no trace of previous user remains
  await clearUserProfile();
  await clearCachedTransactions();
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
    // ── Offline / PIN lock state ───────────────────────────────────────
    isSessionLocked: false,   // true when app is backgrounded; shows PinLockScreen
    failCount: 0,             // consecutive wrong PIN attempts
    isOffline: false,         // true when cold-start /auth/me fails due to network
    // Cached profile fields populated from SQLite on cold-start
    cachedFirstName: null,
    cachedLastName: null,
    cachedEmail: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearRegistrationSuccess: (state) => {
      state.registrationSuccess = false;
    },
    lockSession: (state) => {
      if (state.isAuthenticated) {
        state.isSessionLocked = true;
      }
    },
    unlockSession: (state) => {
      state.isSessionLocked = false;
      state.failCount = 0;
      state.error = null;
    },
    incrementFailCount: (state) => {
      state.failCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Login ────────────────────────────────────────────────────────
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
        state.cachedFirstName = u?.first_name ?? u?.firstName ?? null;
        state.cachedLastName = u?.last_name ?? u?.lastName ?? null;
        state.cachedEmail = u?.email ?? null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // ── PIN Login (Hard Logout re-auth) ──────────────────────────────
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
        state.cachedFirstName = u?.first_name ?? u?.firstName ?? null;
        state.cachedLastName = u?.last_name ?? u?.lastName ?? null;
        state.cachedEmail = u?.email ?? null;
      })
      .addCase(pinLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.failCount += 1;
        state.error = action.payload;
      })

      // ── Register ─────────────────────────────────────────────────────
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

      // ── Load User ────────────────────────────────────────────────────
      .addCase(loadUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const { user, cachedProfile } = action.payload;

        // Populate cached fields from SQLite for offline UI
        if (cachedProfile) {
          state.cachedFirstName = cachedProfile.first_name ?? null;
          state.cachedLastName = cachedProfile.last_name ?? null;
          state.cachedEmail = cachedProfile.email ?? null;
        }

        if (user) {
          state.isAuthenticated = true;
          state.user = user;
          // App cold-started with a valid session → lock it immediately
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
          // Network failure — keep auth state intact, just signal offline mode.
          // The existing session (and PinLockScreen) remain shown.
          state.isOffline = true;
          if (action.payload.cachedProfile) {
            state.cachedFirstName = action.payload.cachedProfile.first_name ?? null;
            state.cachedLastName = action.payload.cachedProfile.last_name ?? null;
            state.cachedEmail = action.payload.cachedProfile.email ?? null;
          }
        } else {
          // Unexpected hard failure — reset auth state
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
        }
      })

      // ── Update Profile ───────────────────────────────────────────────
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
        // Keep cached fields in sync
        state.cachedFirstName = action.payload.first_name ?? state.cachedFirstName;
        state.cachedLastName = action.payload.last_name ?? state.cachedLastName;
        state.cachedEmail = action.payload.email ?? state.cachedEmail;
      })

      // ── Logout (full wipe — device clean for next user) ──────────────
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isSessionLocked = false;
        state.failCount = 0;
        state.isOffline = false;
        // Clear cached profile — device must be clean for a different user
        state.cachedFirstName = null;
        state.cachedLastName = null;
        state.cachedEmail = null;
      })

      // ── Wipe Device ──────────────────────────────────────────────────
      .addCase(wipeDevice.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isSessionLocked = false;
        state.failCount = 0;
        state.isOffline = false;
        state.cachedFirstName = null;
        state.cachedLastName = null;
        state.cachedEmail = null;
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
