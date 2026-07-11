import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLoader from '../components/PageLoader';

/**
 * ProtectedRoute blocks guest users.
 * If user is not authenticated, redirects to /login.
 */
export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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

  if (loading) {
    return <PageLoader />;
  }

  if (user) {
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
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
