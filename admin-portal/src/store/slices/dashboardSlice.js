import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

/**
 * NOTE: The backend has no dedicated /dashboard/admin stats endpoint.
 * This slice composes stats from multiple admin endpoints as a temporary solution.
 * TODO: Add a dedicated stats endpoint to the backend in the future.
 *
 * The dashboard UI is currently showing STATIC/PLACEHOLDER data for charts.
 * The stat counts (users, transactions, withdrawals) come from real API calls.
 */
export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      // Single stats endpoint + recent transactions list (2 requests instead of 5)
      const [statsRes, recentRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/transactions', { params: { limit: 5 } }),
      ]);

      const stats = statsRes.data.data;
      const recentTransactions = recentRes.data.data || [];

      return {
        totalUsers: stats.totalUsers || 0,
        totalTransactions: stats.totalTransactions || 0,
        pendingWithdrawals: stats.pendingWithdrawals || 0,
        unreviewedFraudFlags: stats.unreviewedFraudFlags || 0,
        totalRevenue: parseFloat(stats.totalRevenue || 0),
        recentTransactions,
        dailyVolume: [], // placeholder — no time-series endpoint yet
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard stats');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    stats: null,
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export default dashboardSlice.reducer;
