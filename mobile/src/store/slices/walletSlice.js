import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchBalance = createAsyncThunk(
  'wallet/fetchBalance',
  async (_, { getState, rejectWithValue }) => {
    try {
      const role = getState().auth.user?.role;
      const endpoint = role === 'MERCHANT' ? '/merchant/wallet' : '/customer/wallet';
      const response = await api.get(endpoint);
      // Backend response shape: { success, message, data: wallet }
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch balance');
    }
  }
);

export const topUp = createAsyncThunk(
  'wallet/topUp',
  async ({ amount, paymentIntentId }, { rejectWithValue }) => {
    try {
      // Correct endpoint: POST /api/v1/customer/wallet/topup
      const response = await api.post('/customer/wallet/topup', { amount, paymentIntentId });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Top-up failed');
    }
  }
);

export const fetchMerchantDashboard = createAsyncThunk(
  'wallet/fetchMerchantDashboard',
  async (_, { rejectWithValue }) => {
    try {
      // Fetch wallet balance and recent transactions in parallel
      const [walletRes, txRes] = await Promise.all([
        api.get('/merchant/wallet'),
        api.get('/merchant/transactions?limit=5'),
      ]);
      const wallet = walletRes.data.data;
      const transactions = txRes.data.data ?? [];
      return {
        balance: wallet.balance,
        currency: wallet.currency,
        merchantStats: {
          pendingWithdrawal: 0,
          todayRevenue: { total: 0, count: 0 },
          weekRevenue: { total: 0, count: 0 },
          recentTransactions: transactions.map((tx) => ({
            id: tx.id,
            amount: tx.amount,
            createdAt: tx.createdAt,
            customerName: tx.counterparty || 'Customer',
          })),
        },
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard');
    }
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    balance: 0,
    currency: 'USD',
    merchantStats: null,
    isLoading: false,
    error: null,
    topUpSuccess: false,
  },
  reducers: {
    updateBalance: (state, action) => {
      state.balance = action.payload;
    },
    clearTopUpSuccess: (state) => {
      state.topUpSuccess = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBalance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.balance = parseFloat(action.payload.balance) || 0;
        state.currency = action.payload.currency || 'USD';
      })
      .addCase(fetchBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(topUp.pending, (state) => {
        state.isLoading = true;
        state.topUpSuccess = false;
      })
      .addCase(topUp.fulfilled, (state, action) => {
        state.isLoading = false;
        // Backend returns the transaction record; re-fetch balance via fetchBalance after top-up
        state.topUpSuccess = true;
      })
      .addCase(topUp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchMerchantDashboard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMerchantDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.balance = parseFloat(action.payload.balance) || 0;
        state.currency = action.payload.currency || 'TRY';
        state.merchantStats = action.payload.merchantStats;
      })
      .addCase(fetchMerchantDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { updateBalance, clearTopUpSuccess, clearError } = walletSlice.actions;
export default walletSlice.reducer;
