
import React from 'react';
import { HashRouter, Switch, Route, Redirect } from 'react-router-dom';
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
  
  if (!currentUser) return <Redirect to="/login" />;
  
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // Redirect based on role
    if (currentUser.role === 'super_admin') return <Redirect to="/super-admin" />;
    if (currentUser.role === 'admin') return <Redirect to="/admin" />;
    return <Redirect to="/employee" />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Switch>
      <Route path="/login">
        <Login />
      </Route>
      
      {/* Super Admin Routes */}
      <Route path="/super-admin">
        <ProtectedRoute allowedRoles={['super_admin']}>
          <Layout title="لوحة المدير العام">
            <SuperAdminDashboard />
          </Layout>
        </ProtectedRoute>
      </Route>

      {/* Admin Routes */}
      {/* Use exact for /admin to avoid matching sub-routes like /admin/treasury */}
      <Route exact path="/admin">
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout title="لوحة التحكم">
            <AdminDashboard />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/treasury">
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout title="إدارة الخزينة">
            <Treasury />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/merchants">
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout title="إدارة التجار">
            <Merchants />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/ewallets">
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout title="إدارة المحافظ">
            <EWallets />
          </Layout>
        </ProtectedRoute>
      </Route>

      {/* Employee Routes */}
      <Route path="/employee">
        <ProtectedRoute allowedRoles={['employee']}>
          <Layout title="لوحة الموظف">
            <EmployeeDashboard />
          </Layout>
        </ProtectedRoute>
      </Route>

      {/* Exchange - Restricted to Employee Only */}
      <Route path="/exchange">
        <ProtectedRoute allowedRoles={['employee']}>
          <Layout title="نظام الصرف">
            <Exchange />
          </Layout>
        </ProtectedRoute>
      </Route>

      {/* Wallet Transfer - Restricted to Employee Only */}
      <Route path="/wallet-transfer">
        <ProtectedRoute allowedRoles={['employee']}>
          <Layout title="تحويل محفظة">
            <WalletTransfer />
          </Layout>
        </ProtectedRoute>
      </Route>

      {/* Shared Routes */}
      <Route path="/reports">
        <ProtectedRoute>
          <Layout title="التقارير">
            <Reports />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="*">
        <Redirect to="/login" />
      </Route>
    </Switch>
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
