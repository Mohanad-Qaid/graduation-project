import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import dashboardReducer from './slices/dashboardSlice';
import usersReducer from './slices/usersSlice';
import transactionsReducer from './slices/transactionsSlice';
import withdrawalsReducer from './slices/withdrawalsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    users: usersReducer,
    transactions: transactionsReducer,
    withdrawals: withdrawalsReducer,
  },
  // Explicitly enable Redux DevTools (it is enabled by default in dev mode by Redux Toolkit,
  // but this ensures it is explicitly configured).
  devTools: true,
});

export default store;
