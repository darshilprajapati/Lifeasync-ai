import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { AuthContext, type UserDto } from './AuthContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('lifesync_token') === 'true';
  });

  // Silent check: check if the user is already authenticated on app launch
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 2500);

    const checkAuthStatus = async () => {
      const hasToken = localStorage.getItem('lifesync_token') === 'true';
      if (!hasToken) {
        if (isMounted) {
          clearTimeout(timeoutId);
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await apiClient.get('/api/auth/me', { signal: controller.signal });
        if (!isMounted) return;

        if (response.data.isSuccess) {
          setUser(response.data.data);
          localStorage.setItem('lifesync_token', 'true');
        } else {
          setUser(null);
          localStorage.removeItem('lifesync_token');
        }
      } catch {
        if (!isMounted) return;
        // Either 401 unauthenticated, aborted due to 2.5s timeout, or network error
        setUser(null);
        localStorage.removeItem('lifesync_token');
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Global listener: If refresh fails or session is unrecoverably 401, clear user state
    const handleUnauthorized = () => {
      if (isMounted) {
        setUser(null);
        localStorage.removeItem('lifesync_token');
      }
    };
    window.addEventListener('lifesync:unauthorized', handleUnauthorized);

    checkAuthStatus();

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
      window.removeEventListener('lifesync:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string): Promise<UserDto> => {
    try {
      const response = await apiClient.post('/api/auth/login', { email, password });
      if (response.data.isSuccess) {
        setUser(response.data.data);
        localStorage.setItem('lifesync_token', 'true');
        return response.data.data;
      }
      throw new Error(response.data.message || 'Login failed.');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Login failed.';
      throw new Error(errMsg);
    }
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    location?: { country?: string; state?: string; city?: string }
  ): Promise<UserDto> => {
    try {
      const payload: any = { fullName, email, password };
      if (location) {
        if (location.country) payload.country = location.country.trim();
        if (location.state) payload.state = location.state.trim();
        if (location.city) payload.city = location.city.trim().toUpperCase();
      }
      const response = await apiClient.post('/api/auth/register', payload);
      if (response.data.isSuccess) {
        if (response.data.data) {
          setUser(response.data.data);
          localStorage.setItem('lifesync_token', 'true');
        }
        return response.data.data;
      }
      throw new Error(response.data.message || 'Registration failed.');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Registration failed.';
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error on server:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('lifesync_token');
    }
  };

  const updateUser = (updatedUser: UserDto) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
