import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// GET /admin/transactions?page&limit&type&status
export const fetchTransactions = createAsyncThunk(
  'transactions/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/transactions', { params });
      // Response: { success, data: { transactions, pagination } }
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

// GET /admin/fraud-flags?page&limit&reviewed=false
export const fetchFraudFlags = createAsyncThunk(
  'transactions/fetchFraudFlags',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/fraud-flags', {
        params: { ...params, reviewed: params.reviewed ?? false },
      });
      // Response: { success, data: { fraudFlags, pagination } }
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch fraud flags');
    }
  }
);

// PATCH /admin/fraud-flags/:flagId/review
export const reviewFraudFlag = createAsyncThunk(
  'transactions/reviewFraudFlag',
  async (flagId, { rejectWithValue }) => {
    try {
      await api.patch(`/admin/fraud-flags/${flagId}/review`);
      return flagId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark flag as reviewed');
    }
  }
);

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState: {
    list: [],
    pagination: null,
    fraudFlags: [],
    fraudFlagsMeta: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.transactions;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchFraudFlags.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchFraudFlags.fulfilled, (state, action) => {
        state.isLoading = false;
        state.fraudFlags = action.payload.fraudFlags;
        state.fraudFlagsMeta = action.payload.pagination;
      })
      .addCase(fetchFraudFlags.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(reviewFraudFlag.fulfilled, (state, action) => {
        const flag = state.fraudFlags.find((f) => f.id === action.payload);
        if (flag) flag.reviewed = true;
      });
  },
});

export const { clearError } = transactionsSlice.actions;
export default transactionsSlice.reducer;
