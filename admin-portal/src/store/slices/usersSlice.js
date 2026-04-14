import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// GET /admin/users?page&limit&role&status
export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/users', { params });
      // Response: { success, data: { users, pagination } }
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch users');
    }
  }
);

// GET /admin/users/pending
export const fetchPendingUsers = createAsyncThunk(
  'users/fetchPending',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/users/pending');
      return response.data.data.users;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch pending users');
    }
  }
);

// PATCH /admin/users/:userId/approve
export const approveUser = createAsyncThunk(
  'users/approve',
  async (userId, { rejectWithValue }) => {
    try {
      await api.patch(`/admin/users/${userId}/approve`);
      return userId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to approve user');
    }
  }
);

// PATCH /admin/users/:userId/reject
export const rejectUser = createAsyncThunk(
  'users/reject',
  async ({ userId, reason }, { rejectWithValue }) => {
    try {
      await api.patch(`/admin/users/${userId}/reject`, { reason });
      return userId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject user');
    }
  }
);

// PATCH /admin/users/:userId/suspend
export const suspendUser = createAsyncThunk(
  'users/suspend',
  async ({ userId, reason }, { rejectWithValue }) => {
    try {
      await api.patch(`/admin/users/${userId}/suspend`, { reason });
      return userId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to suspend user');
    }
  }
);

// TODO (future): Backend does not have a dedicated /activate endpoint.
// For now, re-approve is used as a workaround — wire up when backend adds it.
export const activateUser = createAsyncThunk(
  'users/activate',
  async (userId, { rejectWithValue }) => {
    try {
      // Temporary workaround: re-approve to un-suspend
      await api.patch(`/admin/users/${userId}/approve`);
      return userId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to activate user');
    }
  }
);

// POST /admin/users/:userId/topup
export const topupUser = createAsyncThunk(
  'users/topup',
  async ({ userId, amount, description }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/admin/users/${userId}/topup`, { amount, description });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to top up user wallet');
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    list: [],
    pending: [],
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
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.users;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchPendingUsers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPendingUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pending = action.payload;
      })
      .addCase(fetchPendingUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(approveUser.fulfilled, (state, action) => {
        state.pending = state.pending.filter((u) => u.id !== action.payload);
        const user = state.list.find((u) => u.id === action.payload);
        if (user) user.status = 'APPROVED';
      })
      .addCase(rejectUser.fulfilled, (state, action) => {
        state.pending = state.pending.filter((u) => u.id !== action.payload);
      })
      .addCase(suspendUser.fulfilled, (state, action) => {
        const user = state.list.find((u) => u.id === action.payload);
        if (user) user.status = 'SUSPENDED';
      })
      .addCase(activateUser.fulfilled, (state, action) => {
        const user = state.list.find((u) => u.id === action.payload);
        if (user) user.status = 'APPROVED';
      });
  },
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;
