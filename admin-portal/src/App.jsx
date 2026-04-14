import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Spin } from 'antd';
import { loadAdmin } from './store/slices/authSlice';

import Login from './pages/Login';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import PendingRegistrations from './pages/PendingRegistrations';
import WithdrawalRequests from './pages/WithdrawalRequests';
import Transactions from './pages/Transactions';
import SuspiciousTransactions from './pages/SuspiciousTransactions';
import UserManagement from './pages/UserManagement';
import AdminLogs from './pages/AdminLogs';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useSelector((state) => state.auth);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadAdmin());
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pending-registrations" element={<PendingRegistrations />} />
                <Route path="/withdrawal-requests" element={<WithdrawalRequests />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/suspicious" element={<SuspiciousTransactions />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/logs" element={<AdminLogs />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
