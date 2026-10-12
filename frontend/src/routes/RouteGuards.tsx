import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

/**
 * ProtectedRoute blocks guest users.
 * If user is not authenticated, redirects to /login with return state.
 */
export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'var(--bg-primary)' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * GuestRoute blocks authenticated users.
 * If user is authenticated, redirects to / (Dashboard).
 * Used for Login / Register pages.
 */
export const GuestRoute: React.FC = () => {
  const { user, loading } = useAuth();
  
  const hasToken = !!localStorage.getItem('lifesync_token');
  if (loading && hasToken) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'var(--bg-primary)' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (user && hasToken) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

/**
 * AdminRoute blocks guest users and non-Admin users.
 * If user is not authenticated, redirects to /login.
 * If user is not an Admin, redirects to / (Dashboard).
 */
export const AdminRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'var(--bg-primary)' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
