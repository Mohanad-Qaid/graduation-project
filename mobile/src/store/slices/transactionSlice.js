import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { syncWithdrawalNotifications, cacheTransactions, getCachedTransactions } from '../../services/offlineDb';

export const fetchTransactions = createAsyncThunk(
  'transactions/fetch',
  async ({ page = 1, type } = {}, { getState, rejectWithValue }) => {
    try {
      const role = getState().auth.user?.role;
      const endpoint = role === 'MERCHANT' ? '/merchant/transactions' : '/customer/transactions';
      const params = { page, limit: 20 };
      if (type) params.type = type;
      const response = await api.get(endpoint, { params });
      
      // Save offline
      if (page === 1) {
        cacheTransactions(response.data.data).catch(() => {});
      }
      
      // response.data shape: { success, message, data: [...], meta: { total, page, limit, totalPages } }
      return { data: response.data.data, meta: response.data.meta, page };
    } catch (error) {
      // If network fails, try SQLite offline cache
      try {
        const cached = await getCachedTransactions();
        if (cached && cached.length > 0) {
          console.log('[SQLite] Loaded transactions from offline cache!');
          return { data: cached, meta: { total: cached.length, page: 1, limit: 20, totalPages: 1 }, page: 1 };
        }
      } catch (dbErr) {
        console.warn('Failed to load cached transactions', dbErr);
      }
      
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

export const fetchExpenseStats = createAsyncThunk(
  'transactions/fetchStats',
  async (period = 'month', { rejectWithValue }) => {
    try {
      // Correct endpoint: GET /api/v1/customer/expenses/summary
      const response = await api.get('/customer/expenses/summary', { params: { period } });
      // Backend wraps response: { success, message, data: { totals, dailySpending, categoryBreakdown } }
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch stats');
    }
  }
);

export const makePayment = createAsyncThunk(
  'transactions/pay',
  async ({ merchantId, amount }, { rejectWithValue }) => {
    try {
      const response = await api.post('/customer/pay', { merchantId, amount });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Payment failed');
    }
  }
);

export const generateQR = createAsyncThunk(
  'transactions/generateQR',
  async (_, { rejectWithValue }) => {
    try {
      // No body needed — backend infers merchant from auth token
      const response = await api.post('/merchant/qr/generate');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate QR');
    }
  }
);

export const requestWithdrawal = createAsyncThunk(
  'transactions/requestWithdrawal',
  async ({ amount, bankAccount, bankName, bankAccountName }, { rejectWithValue }) => {
    try {
      const response = await api.post('/merchant/withdrawal', {
        amount,
        bankAccount,
        bankName,
        bankAccountName,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.response?.data?.error || 'Withdrawal request failed');
    }
  }
);

export const fetchWithdrawals = createAsyncThunk(
  'transactions/fetchWithdrawals',
  async ({ page = 1 } = {}, { rejectWithValue }) => {
    try {
      // Correct endpoint: GET /api/v1/merchant/withdrawal
      const response = await api.get('/merchant/withdrawal', { params: { page, limit: 20 } });
      return { ...response.data, page };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch withdrawals');
    }
  }
);

const transactionSlice = createSlice({
  name: 'transactions',
  initialState: {
    list: [],
    withdrawals: [],
    stats: null,
    qrData: null,
    paymentDetails: null,
    paymentResult: null,
    pagination: null,
    withdrawalPagination: null,
    isLoading: false,
    error: null,
    paymentSuccess: false,
    withdrawalSuccess: false,
  },
  reducers: {
    clearPaymentResult: (state) => {
      state.paymentResult = null;
      state.paymentSuccess = false;
    },
    clearQRData: (state) => {
      state.qrData = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearWithdrawalSuccess: (state) => {
      state.withdrawalSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        const incoming = action.payload.data || [];
        if (action.payload.page === 1) {
          state.list = incoming;
        } else {
          state.list = [...state.list, ...incoming];
        }
        state.pagination = action.payload.meta || null;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchExpenseStats.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchExpenseStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchExpenseStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(makePayment.pending, (state) => {
        state.isLoading = true;
        state.paymentSuccess = false;
      })
      .addCase(makePayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.paymentResult = action.payload;
        state.paymentSuccess = true;
      })
      .addCase(makePayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(generateQR.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(generateQR.fulfilled, (state, action) => {
        state.isLoading = false;
        state.qrData = action.payload;
      })
      .addCase(generateQR.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(requestWithdrawal.pending, (state) => {
        state.isLoading = true;
        state.withdrawalSuccess = false;
      })
      .addCase(requestWithdrawal.fulfilled, (state) => {
        state.isLoading = false;
        state.withdrawalSuccess = true;
      })
      .addCase(requestWithdrawal.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchWithdrawals.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchWithdrawals.fulfilled, (state, action) => {
        state.isLoading = false;
        const incoming = action.payload.data || [];
        if (action.payload.page === 1) {
          state.withdrawals = incoming;
        } else {
          state.withdrawals = [...state.withdrawals, ...incoming];
        }
        state.withdrawalPagination = action.payload.meta || null;
        // Sync comparison: generates SQLite notifications if any withdrawal
        // changed from PENDING → APPROVED / REJECTED since last fetch.
        syncWithdrawalNotifications(incoming).catch(() => {});
      })
      .addCase(fetchWithdrawals.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearPaymentResult,
  clearQRData,
  clearError,
  clearWithdrawalSuccess,
} = transactionSlice.actions;
export default transactionSlice.reducer;
