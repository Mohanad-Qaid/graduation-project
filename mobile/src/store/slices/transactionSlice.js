import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchTransactions = createAsyncThunk(
  'transactions/fetch',
  async ({ page = 1, type } = {}, { rejectWithValue }) => {
    try {
      const params = { page, limit: 20 };
      if (type) params.type = type;
      const response = await api.get('/transactions', { params });
      return { ...response.data, page };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch transactions');
    }
  }
);

export const fetchExpenseStats = createAsyncThunk(
  'transactions/fetchStats',
  async (period = 'month', { rejectWithValue }) => {
    try {
      const response = await api.get('/transactions/stats', { params: { period } });
      return response.data;
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
  async ({ amount, bankAccount, bankName }, { rejectWithValue }) => {
    try {
      const response = await api.post('/withdrawals/request', {
        amount,
        bankAccount,
        bankName,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Withdrawal request failed');
    }
  }
);

export const fetchWithdrawals = createAsyncThunk(
  'transactions/fetchWithdrawals',
  async ({ page = 1 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/withdrawals/history', { params: { page, limit: 20 } });
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
        if (action.payload.page === 1) {
          state.list = action.payload.transactions;
        } else {
          state.list = [...state.list, ...action.payload.transactions];
        }
        state.pagination = action.payload.pagination;
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
        if (action.payload.page === 1) {
          state.withdrawals = action.payload.withdrawals;
        } else {
          state.withdrawals = [...state.withdrawals, ...action.payload.withdrawals];
        }
        state.withdrawalPagination = action.payload.pagination;
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
