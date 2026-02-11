import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';

import Dashboard from './pages/admin/Dashboard';
import TpSummary from './pages/admin/TpSummary';

import Settings from './pages/admin/Settings';

import AdminLayout from './layouts/AdminLayout';

function App() {
  const { user } = useAuth();

  return (
    <Routes>

      {/* LOGIN */}
      <Route
        path="/login"
        element={user ? <Navigate to={user.role?.toLowerCase() === "admin" ? "/admin/dashboard" : "/user/dashboard"} /> : <Login />}
      />

      {/* ADMIN ROUTES */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tp-summary" element={<TpSummary />} />


        <Route path="settings" element={<Settings />} />
      </Route>

      {/* USER ROUTES */}
      <Route path="/user" element={<AdminLayout />}>
        <Route index element={<Navigate to="/user/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
      </Route>

      {/* ROOT */}
      <Route
        path="/"
        element={
          user
            ? <Navigate to={user.role?.toLowerCase() === "admin" ? "/admin/dashboard" : "/user/dashboard"} />
            : <Navigate to="/login" />
        }
      />
    </Routes>
  );
}

export default App;
