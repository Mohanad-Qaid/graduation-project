import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// GET /admin/transactions?page&limit&type&status
export const fetchTransactions = createAsyncThunk(
  'transactions/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/transactions', { params });
      return response.data;
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
      return response.data;
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
    loadingFlagId: null,  // tracks which flag's "Mark Reviewed" button is loading
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
        state.list = action.payload.data || [];
        state.pagination = action.payload.meta || null;
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
        state.fraudFlags = action.payload.data || [];
        state.fraudFlagsMeta = action.payload.meta || null;
      })
      .addCase(fetchFraudFlags.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(reviewFraudFlag.pending, (state, action) => {
        // action.meta.arg is the flagId passed to the thunk
        state.loadingFlagId = action.meta.arg;
      })
      .addCase(reviewFraudFlag.fulfilled, (state, action) => {
        state.loadingFlagId = null;
        // Filter the flag out immediately so the "Unreviewed Only" list updates
        // without needing a network round-trip refresh.
        state.fraudFlags = state.fraudFlags.filter((f) => f.id !== action.payload);
      })
      .addCase(reviewFraudFlag.rejected, (state) => {
        state.loadingFlagId = null;
      });
  },
});

export const { clearError } = transactionsSlice.actions;
export default transactionsSlice.reducer;
