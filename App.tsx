
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext';
import Login from './components/Login';
import Layout from './components/Layout';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Exchange from './pages/Exchange';
import Treasury from './pages/Treasury';
import Merchants from './pages/Merchants';
import Reports from './pages/Reports';
import EWallets from './pages/EWallets';
import WalletTransfer from './pages/WalletTransfer';

const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { currentUser } = useStore();
  
  if (!currentUser) return <Navigate to="/login" replace />;
  
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // Redirect based on role
    if (currentUser.role === 'super_admin') return <Navigate to="/super-admin" replace />;
    if (currentUser.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/employee" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Super Admin Routes */}
      <Route path="/super-admin" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <Layout title="لوحة المدير العام">
            <SuperAdminDashboard />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout title="لوحة التحكم">
            <AdminDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/treasury" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout title="إدارة الخزينة">
            <Treasury />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/admin/merchants" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout title="إدارة التجار">
            <Merchants />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/admin/ewallets" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout title="إدارة المحافظ">
            <EWallets />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Employee Routes */}
      <Route path="/employee" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <Layout title="لوحة الموظف">
            <EmployeeDashboard />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Exchange - Restricted to Employee Only */}
      <Route path="/exchange" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <Layout title="نظام الصرف">
            <Exchange />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Wallet Transfer - Restricted to Employee Only */}
      <Route path="/wallet-transfer" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <Layout title="تحويل محفظة">
            <WalletTransfer />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Shared Routes */}
      <Route path="/reports" element={
        <ProtectedRoute>
          <Layout title="التقارير">
            <Reports />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </StoreProvider>
  );
};

export default App;
