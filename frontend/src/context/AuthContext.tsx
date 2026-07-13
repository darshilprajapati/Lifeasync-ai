import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export interface UserDto {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  profilePhoto?: string;
}

interface AuthContextType {
  user: UserDto | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserDto>;
  register: (fullName: string, email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: UserDto) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Silent check: check if the user is already authenticated on app launch
  useEffect(() => {
    const checkAuthStatus = async () => {
      const hasToken = localStorage.getItem('lifesync_token') === 'true';
      if (!hasToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      const startTime = Date.now();
      try {
        const response = await apiClient.get('/api/auth/me');
        if (response.data.isSuccess) {
          setUser(response.data.data);
          localStorage.setItem('lifesync_token', 'true');
        } else {
          setUser(null);
          localStorage.removeItem('lifesync_token');
        }
      } catch (err) {
        // Ignored: User is just a guest or cookies are missing/expired
        setUser(null);
        localStorage.removeItem('lifesync_token');
      } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingDelay = Math.max(0, 2000 - elapsedTime);
        setTimeout(() => {
          setLoading(false);
        }, remainingDelay);
      }
    };

    // Global listener: If any request fails with 401 (e.g. after refresh token expired), clear user state
    const interceptor = apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setUser(null);
          localStorage.removeItem('lifesync_token');
        }
        return Promise.reject(error);
      }
    );

    checkAuthStatus();

    return () => {
      apiClient.interceptors.response.eject(interceptor);
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

  const register = async (fullName: string, email: string, password: string): Promise<string> => {
    try {
      const response = await apiClient.post('/api/auth/register', { fullName, email, password });
      if (response.data.isSuccess) {
        return response.data.message || 'Registration request submitted.';
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
