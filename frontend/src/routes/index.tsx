import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import Dashboard from '../pages/Dashboard';
import Planner from '../pages/Planner';
import Finance from '../pages/Finance';
import Health from '../pages/Health';
import Career from '../pages/Career';
import Vault from '../pages/Vault';
import AIInsights from '../pages/AIInsights';
import AdminPanel from '../pages/AdminPanel';
import Profile from '../pages/Profile';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import { ProtectedRoute, GuestRoute, AdminRoute } from './RouteGuards';

/**
 * Main Application Routing definition.
 * - Enforces GuestRoute (login/signup)
 * - Enforces ProtectedRoute (AppLayout + dashboard views)
 * - Enforces AdminRoute (Admin Panel)
 */
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Guest Only Routes (Login/Register/ForgotPassword) */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Main Authenticated Layout Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="planner" element={<Planner />} />
          <Route path="finance" element={<Finance />} />
          <Route path="health" element={<Health />} />
          <Route path="career" element={<Career />} />
          <Route path="vault" element={<Vault />} />
          <Route path="insights" element={<AIInsights />} />
          <Route path="profile" element={<Profile />} />
          
          {/* Admin Only Route */}
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminPanel />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback to Dashboard / Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
