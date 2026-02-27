import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  
  // If not logged in, redirect to Login
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}