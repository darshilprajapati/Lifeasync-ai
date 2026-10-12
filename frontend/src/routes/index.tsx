import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { Dashboard } from '../features/dashboard';
import { Planner } from '../features/planner';
import { Finance } from '../features/finance';
import { Health } from '../features/health';
import { Career } from '../features/career';
import { Vault } from '../features/vault';
import { AIInsights } from '../features/insights';
import { AdminPanel } from '../features/admin';
import { Profile } from '../features/profile';
import { Login, Register, ForgotPassword } from '../features/auth';
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
