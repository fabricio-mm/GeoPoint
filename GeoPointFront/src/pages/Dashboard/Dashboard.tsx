import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import EmployeeDashboard from '@/pages/EmployeeDashboard/EmployeeDashboard';
import AdminDashboard from '@/pages/AdminDashboard/AdminDashboard';
import RHDashboard from '@/pages/RHDashboard/RHDashboard';
import { Navigate } from 'react-router-dom';

export default function Dashboard() {
  const { isAuthenticated, viewMode } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  switch (viewMode) {
    case 'admin':
      return <AdminDashboard />;
    case 'rh':
      return <RHDashboard />;
    case 'employee':
    default:
      return <EmployeeDashboard />;
  }
}
