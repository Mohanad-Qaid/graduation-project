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
      // Fetch all four data sources in parallel
      const [usersRes, txRes, withdrawalsRes, fraudRes] = await Promise.all([
        api.get('/admin/users', { params: { limit: 1 } }),
        api.get('/admin/transactions', { params: { limit: 1 } }),
        api.get('/admin/withdrawals', { params: { status: 'PENDING', limit: 1 } }),
        api.get('/admin/fraud-flags', { params: { reviewed: false, limit: 1 } }),
      ]);

      const usersPagination = usersRes.data.data?.pagination || {};
      const txPagination = txRes.data.data?.pagination || {};
      const pendingWithdrawals = withdrawalsRes.data.data?.pagination?.total || 0;
      const unreviewed = fraudRes.data.data?.pagination?.total || 0;

      // Fetch a small recent transactions list for the table
      const recentRes = await api.get('/admin/transactions', { params: { limit: 5 } });
      const recentTransactions = recentRes.data.data?.transactions || [];

      return {
        totalUsers: usersPagination.total || 0,
        totalTransactions: txPagination.total || 0,
        pendingWithdrawals,
        unreviewedFraudFlags: unreviewed,
        recentTransactions,
        // NOTE: Daily volume chart data is static/placeholder — no backend endpoint yet
        // TODO: Add GET /admin/stats/daily-volume to backend
        dailyVolume: [],
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
