import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ReportsPage from './pages/ReportsPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import SeedPage from './pages/SeedPage';

function RootRedirect() {
  const { user, userProfile } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={userProfile?.role === 'admin' ? '/admin' : '/employee'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/seed" element={<SeedPage />} />
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/admin/reports" element={
        <ProtectedRoute requiredRole="admin"><ReportsPage /></ProtectedRoute>
      } />
      <Route path="/employee" element={
        <ProtectedRoute requiredRole="employee"><EmployeeDashboard /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
