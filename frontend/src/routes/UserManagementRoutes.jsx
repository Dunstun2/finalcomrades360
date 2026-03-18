import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// User Management Components
import UserManagement from './pages/UserManagement';
import Dashboard from './pages/Dashboard';
import UserManagementOverview from './pages/dashboard/UserManagementOverview';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && !user.role.includes(requiredRole) && user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<Home />} />
      
      {/* Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected Dashboard Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* User Management Module Routes */}
      <Route
        path="/dashboard/user-management"
        element={
          <ProtectedRoute requiredRole="admin">
            <UserManagement />
          </ProtectedRoute>
        }
      />
      
      {/* Other dashboard routes... */}
      <Route 
        path="/dashboard/overview" 
        element={
          <ProtectedRoute requiredRole="admin">
            <UserManagementOverview />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}