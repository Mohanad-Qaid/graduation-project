import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import api from '../../services/api';
// SQLite is still used by other screens (transaction cache, balance).
// Auth thunks must NOT depend on it — expo-sqlite's async API fails on
// Expo Go / New Architecture with NullPointerException on prepareAsync.
import { clearCachedTransactions } from '../../services/offlineDb';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const KEY_TOKEN = 'ewallet_token';
const KEY_REFRESH_TOKEN = 'ewallet_refresh';
const KEY_DEV_EMAIL = 'ewallet_device_email';
const KEY_DEV_FIRSTNAME = 'ewallet_device_firstname';
const KEY_DEV_LASTNAME = 'ewallet_device_lastname';
const KEY_LOCKOUT = 'ewallet_lockout';

// ─── Helpers (all use SecureStore — already installed, works in Expo Go) ──────
async function saveDeviceRegistration(user) {
  const email = user?.email ?? '';
  const firstName = user?.first_name ?? user?.firstName ?? '';
  const lastName = user?.last_name ?? user?.lastName ?? '';
  await SecureStore.setItemAsync(KEY_DEV_EMAIL, email);
  await SecureStore.setItemAsync(KEY_DEV_FIRSTNAME, firstName);
  await SecureStore.setItemAsync(KEY_DEV_LASTNAME, lastName);
}

async function loadDeviceRegistration() {
  const email = await SecureStore.getItemAsync(KEY_DEV_EMAIL);
  const firstName = await SecureStore.getItemAsync(KEY_DEV_FIRSTNAME);
  const lastName = await SecureStore.getItemAsync(KEY_DEV_LASTNAME);
  return email ? { email, firstName, lastName } : null;
}

async function clearDeviceRegistration() {
  await SecureStore.deleteItemAsync(KEY_DEV_EMAIL);
  await SecureStore.deleteItemAsync(KEY_DEV_FIRSTNAME);
  await SecureStore.deleteItemAsync(KEY_DEV_LASTNAME);
}

async function saveLockoutState(stateObj) {
  await SecureStore.setItemAsync(KEY_LOCKOUT, JSON.stringify(stateObj));
}

async function loadLockoutState() {
  const data = await SecureStore.getItemAsync(KEY_LOCKOUT);
  return data ? JSON.parse(data) : { failCount: 0, lockoutUntil: null, isPermanentlyLocked: false };
}

async function clearLockoutState() {
  await SecureStore.deleteItemAsync(KEY_LOCKOUT);
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
      if (!error.response) return rejectWithValue('No Internet Connection. Please check your connection and try again.');
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
  async ({ pin }, { rejectWithValue, getState }) => {
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

      // Reset lockout state on success
      await clearLockoutState();

      return { token: accessToken, user };
    } catch (error) {
      let { failCount, lockoutUntil, isPermanentlyLocked } = getState().auth;
      const isOffline = !error.response;

      if (!isOffline) {
        failCount += 1;
        if (failCount === 3) lockoutUntil = Date.now() + 60 * 60 * 1000; // 1 hour lockout
        if (failCount >= 6) isPermanentlyLocked = true; // Permanent block

        await saveLockoutState({ failCount, lockoutUntil, isPermanentlyLocked });
      }

      return rejectWithValue({
        message: isOffline ? 'No Internet Connection. Please check your connection and try again.' : (error.response?.data?.message || 'Incorrect PIN. Please try again.'),
        isOffline,
        failCount,
        lockoutUntil,
        isPermanentlyLocked
      });
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
    const lockoutState = await loadLockoutState();

    try {
      const token = await SecureStore.getItemAsync(KEY_TOKEN);
      if (!token) {
        // No JWT — user is hard-logged-out. Show PinLockScreen if device is registered.
        return { user: null, device, lockoutState };
      }
      const response = await api.get('/auth/me');
      const user = response.data.data;
      // Refresh device registration with latest server data
      await saveDeviceRegistration(user);
      return { user, device, lockoutState };
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        await SecureStore.deleteItemAsync(KEY_TOKEN);
        await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
        return { user: null, device, lockoutState };
      }
      // Network / 5xx — keep tokens, show offline mode
      return rejectWithValue({ isNetworkError: true, device, lockoutState });
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
  await clearLockoutState();
  try { await clearCachedTransactions(); } catch { /* SQLite may fail in Expo Go */ }
  return null;
});

// ─── OTP — Send / Resend ─────────────────────────────────────────────────────
// purpose: 'verify' (after registration) | 'reset' (forgot password)
export const sendOTP = createAsyncThunk(
  'auth/sendOTP',
  async ({ email, purpose, isResend = false }, { rejectWithValue }) => {
    try {
      const endpoint = isResend ? '/auth/resend-otp' : '/auth/send-otp';
      await api.post(endpoint, { email, purpose });
      return { email, purpose };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send code. Please try again.';
      return rejectWithValue(message);
    }
  }
);

// ─── OTP — Verify Email (post-registration) ──────────────────────────────────
export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async ({ email, code }, { rejectWithValue }) => {
    try {
      await api.post('/auth/verify-email', { email, code });
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed.';
      return rejectWithValue(message);
    }
  }
);

// ─── OTP — Reset PIN (forgot-password final step) ────────────────────────────
export const resetPin = createAsyncThunk(
  'auth/resetPin',
  async ({ email, code, newPin }, { rejectWithValue }) => {
    try {
      await api.post('/auth/reset-password', { email, code, newPin });
      await clearLockoutState(); // Ensure they are unlocked once they reset PIN
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'PIN reset failed.';
      return rejectWithValue(message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    isBootstrapping: true,   // true only while loadUser runs on cold-start
    isSubmitting: false,     // true during login / register / updateProfile
    error: null,
    registrationSuccess: false,
    isSessionLocked: false,
    failCount: 0,
    lockoutUntil: null,
    isPermanentlyLocked: false,
    isOffline: false,
    // Device registration (from AsyncStorage — reliable on Expo Go)
    cachedEmail: null,
    cachedFirstName: null,
    cachedLastName: null,
    // OTP flow state
    otpLoading: false,
    otpError: null,
    otpSuccess: false,   // true = code was accepted / PIN was reset
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    clearRegistrationSuccess: (state) => { state.registrationSuccess = false; },
    clearOtpState: (state) => {
      state.otpLoading = false;
      state.otpError = null;
      state.otpSuccess = false;
    },
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
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.isAuthenticated = true;
        state.isSessionLocked = false;
        state.failCount = 0;
        state.user = action.payload.user;
        state.token = action.payload.token;
        const u = action.payload.user;
        state.cachedEmail = u?.email ?? null;
        state.cachedFirstName = u?.first_name ?? u?.firstName ?? null;
        state.cachedLastName = u?.last_name ?? u?.lastName ?? null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload;
      })

      // ── PIN Login ──────────────────────────────────────────────────────
      .addCase(pinLogin.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(pinLogin.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.isAuthenticated = true;
        state.isSessionLocked = false;
        state.failCount = 0;
        state.user = action.payload.user;
        state.token = action.payload.token;
        const u = action.payload.user;
        state.cachedEmail = u?.email ?? null;
        state.cachedFirstName = u?.first_name ?? u?.firstName ?? null;
        state.cachedLastName = u?.last_name ?? u?.lastName ?? null;
      })
      .addCase(pinLogin.rejected, (state, action) => {
        state.isSubmitting = false;

        if (typeof action.payload === 'object' && action.payload !== null) {
          state.error = action.payload.message;
          if (!action.payload.isOffline) {
            state.failCount = action.payload.failCount;
            state.lockoutUntil = action.payload.lockoutUntil;
            state.isPermanentlyLocked = action.payload.isPermanentlyLocked;
          }
        } else {
          state.error = action.payload || 'Incorrect PIN. Please try again.';
        }
      })

      // ── Register ───────────────────────────────────────────────────────
      .addCase(register.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
        state.registrationSuccess = false;
      })
      .addCase(register.fulfilled, (state) => {
        state.isSubmitting = false;
        state.registrationSuccess = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload;
      })

      // ── Load User ──────────────────────────────────────────────────────
      .addCase(loadUser.pending, (state) => { state.isBootstrapping = true; })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.isBootstrapping = false;
        const { user, device, lockoutState } = action.payload;

        if (device) {
          state.cachedEmail = device.email;
          state.cachedFirstName = device.firstName;
          state.cachedLastName = device.lastName;
        }

        if (lockoutState) {
          state.failCount = lockoutState.failCount;
          state.lockoutUntil = lockoutState.lockoutUntil;
          state.isPermanentlyLocked = lockoutState.isPermanentlyLocked;
        }

        if (user) {
          state.isAuthenticated = true;
          state.user = user;
          state.isSessionLocked = true; // E-wallets ALWAYS require PIN on cold start
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
          if (device) {
            state.isSessionLocked = true;
          }
        }
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.isBootstrapping = false;
        if (action.payload?.isNetworkError) {
          state.isOffline = true;
          if (action.payload.device) {
            state.cachedEmail = action.payload.device.email;
            state.cachedFirstName = action.payload.device.firstName;
            state.cachedLastName = action.payload.device.lastName;
            state.isSessionLocked = true;
          }
          if (action.payload.lockoutState) {
            state.failCount = action.payload.lockoutState.failCount;
            state.lockoutUntil = action.payload.lockoutState.lockoutUntil;
            state.isPermanentlyLocked = action.payload.lockoutState.isPermanentlyLocked;
          }
        }
      })

      // ── Update Profile ─────────────────────────────────────────────────
      .addCase(updateProfile.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.user = { ...state.user, ...action.payload };
        state.cachedFirstName = action.payload.first_name ?? state.cachedFirstName;
        state.cachedLastName = action.payload.last_name ?? state.cachedLastName;
        state.cachedEmail = action.payload.email ?? state.cachedEmail;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload;
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
        state.cachedEmail = null;
        state.cachedFirstName = null;
        state.cachedLastName = null;
        state.failCount = 0;
        state.lockoutUntil = null;
        state.isPermanentlyLocked = false;
        state.error = null;
      })

      // ── Send OTP ───────────────────────────────────────────────────────
      .addCase(sendOTP.pending, (state) => {
        state.otpLoading = true;
        state.otpError = null;
        state.otpSuccess = false;
      })
      .addCase(sendOTP.fulfilled, (state) => {
        state.otpLoading = false;
      })
      .addCase(sendOTP.rejected, (state, action) => {
        state.otpLoading = false;
        state.otpError = action.payload;
      })

      // ── Verify Email ───────────────────────────────────────────────────
      .addCase(verifyEmail.pending, (state) => {
        state.otpLoading = true;
        state.otpError = null;
        state.otpSuccess = false;
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        state.otpLoading = false;
        state.otpSuccess = true;
        // Update the in-memory user object to reflect the new verified status
        if (state.user) state.user = { ...state.user, email_verified: true };
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.otpLoading = false;
        state.otpError = action.payload;
      })

      // ── Reset PIN ──────────────────────────────────────────────────────
      .addCase(resetPin.pending, (state) => {
        state.otpLoading = true;
        state.otpError = null;
        state.otpSuccess = false;
      })
      .addCase(resetPin.fulfilled, (state) => {
        state.otpLoading = false;
        state.otpSuccess = true;
        // Also clear the in-memory lockout state so the UI unblocks immediately
        state.failCount = 0;
        state.lockoutUntil = null;
        state.isPermanentlyLocked = false;
      })
      .addCase(resetPin.rejected, (state, action) => {
        state.otpLoading = false;
        state.otpError = action.payload;
      });
  },
});

export const {
  clearError,
  clearRegistrationSuccess,
  clearOtpState,
  lockSession,
  unlockSession,
  incrementFailCount,
} = authSlice.actions;

// Convenience selector — screens that drive their own button spinner
// use isSubmitting; RootNavigator uses isBootstrapping.
export const selectIsSubmitting = (state) => state.auth.isSubmitting;
export const selectIsBootstrapping = (state) => state.auth.isBootstrapping;

export default authSlice.reducer;
