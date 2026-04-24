import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// GET /admin/withdrawals?page&limit&status
export const fetchWithdrawals = createAsyncThunk(
  'withdrawals/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/withdrawals', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch withdrawals');
    }
  }
);

// GET /admin/withdrawals?status=PENDING
export const fetchPendingWithdrawals = createAsyncThunk(
  'withdrawals/fetchPending',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/withdrawals', {
        params: { status: 'PENDING', limit: 100 },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch withdrawals');
    }
  }
);

// PATCH /admin/withdrawals/:requestId/approve
export const approveWithdrawal = createAsyncThunk(
  'withdrawals/approve',
  async (withdrawalId, { rejectWithValue }) => {
    try {
      await api.patch(`/admin/withdrawals/${withdrawalId}/approve`);
      return withdrawalId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to approve withdrawal');
    }
  }
);

// PATCH /admin/withdrawals/:requestId/reject
export const rejectWithdrawal = createAsyncThunk(
  'withdrawals/reject',
  async ({ withdrawalId, reason }, { rejectWithValue }) => {
    try {
      await api.patch(`/admin/withdrawals/${withdrawalId}/reject`, { reason });
      return withdrawalId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject withdrawal');
    }
  }
);

const withdrawalsSlice = createSlice({
  name: 'withdrawals',
  initialState: {
    pending: [],
    list: [],
    pagination: null,
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
      .addCase(fetchWithdrawals.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchWithdrawals.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.data || [];
        state.pagination = action.payload.meta || null;
      })
      .addCase(fetchWithdrawals.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchPendingWithdrawals.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPendingWithdrawals.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pending = action.payload || [];
      })
      .addCase(fetchPendingWithdrawals.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(approveWithdrawal.fulfilled, (state, action) => {
        state.pending = state.pending.filter((w) => w.id !== action.payload);
        const item = state.list.find((w) => w.id === action.payload);
        if (item) item.status = 'APPROVED';
      })
      .addCase(rejectWithdrawal.fulfilled, (state, action) => {
        state.pending = state.pending.filter((w) => w.id !== action.payload);
        const item = state.list.find((w) => w.id === action.payload);
        if (item) item.status = 'REJECTED';
      });
  },
});

export const { clearError } = withdrawalsSlice.actions;
export default withdrawalsSlice.reducer;
