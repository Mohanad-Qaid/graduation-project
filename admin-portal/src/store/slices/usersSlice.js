import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// GET /admin/users?page&limit&role&status
export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/users', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.readableMessage || 'Failed to fetch users');
    }
  }
);

// GET /admin/users/pending
export const fetchPendingUsers = createAsyncThunk(
  'users/fetchPending',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/admin/users/pending');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.readableMessage || 'Failed to fetch pending users');
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
      return rejectWithValue(error.readableMessage || 'Failed to approve user');
    }
  }
);

export const rejectUser = createAsyncThunk(
  'users/reject',
  async ({ userId, reason }, { rejectWithValue }) => {
    try {
      await api.patch(`/admin/users/${userId}/reject`, { reason });
      return userId;
    } catch (error) {
      return rejectWithValue(error.readableMessage || 'Failed to reject user');
    }
  }
);

export const suspendUser = createAsyncThunk(
  'users/suspend',
  async ({ userId, reason }, { rejectWithValue }) => {
    try {
      await api.patch(`/admin/users/${userId}/suspend`, { reason });
      return userId;
    } catch (error) {
      return rejectWithValue(error.readableMessage || 'Failed to suspend user');
    }
  }
);

export const activateUser = createAsyncThunk(
  'users/activate',
  async ({ userId, reason }, { rejectWithValue }) => {
    try {
      await api.patch(`/admin/users/${userId}/reactivate`, { reason });
      return userId;
    } catch (error) {
      return rejectWithValue(error.readableMessage || 'Failed to reactivate user');
    }
  }
);

// Re-approve a previously REJECTED user — calls the dedicated /reapprove endpoint
// so the action is logged as USER_REAPPROVED, distinct from USER_REACTIVATED.
export const reapproveUser = createAsyncThunk(
  'users/reapprove',
  async ({ userId, reason }, { rejectWithValue }) => {
    try {
      await api.patch(`/admin/users/${userId}/reapprove`, { reason });
      return userId;
    } catch (error) {
      return rejectWithValue(error.readableMessage || 'Failed to re-approve user');
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
      return rejectWithValue(error.readableMessage || 'Failed to top up user wallet');
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
        state.list = action.payload.data || [];
        state.pagination = action.payload.meta || null;
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
        state.pending = action.payload || [];
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
      })
      .addCase(reapproveUser.fulfilled, (state, action) => {
        // Remove from pending list and update status in the main list
        state.pending = state.pending.filter((u) => u.id !== action.payload);
        const user = state.list.find((u) => u.id === action.payload);
        if (user) user.status = 'APPROVED';
      });
  },
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;
