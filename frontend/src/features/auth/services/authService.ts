import apiClient from '../../../api/apiClient';
import type { LoginRequest, RegisterRequest, AuthUserResponse } from '../types/authTypes';

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthUserResponse> => {
    const response = await apiClient.post<AuthUserResponse>('/api/auth/login', credentials);
    return response.data;
  },

  register: async (payload: RegisterRequest) => {
    const response = await apiClient.post('/api/auth/register', payload);
    return response.data;
  },

  getCurrentUser: async (signal?: AbortSignal): Promise<AuthUserResponse> => {
    const response = await apiClient.get<AuthUserResponse>('/api/auth/me', { signal });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  },

  refreshToken: async () => {
    const response = await apiClient.post('/api/auth/refresh');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/api/auth/forgot-password', { email });
    return response.data;
  },

  verifyOtp: async (email: string, otp: string) => {
    const response = await apiClient.post('/api/auth/verify-otp', { email, otp });
    return response.data;
  },

  resetPassword: async (payload: { email: string; otp: string; newPassword: string }) => {
    const response = await apiClient.post('/api/auth/reset-password', payload);
    return response.data;
  },
};
