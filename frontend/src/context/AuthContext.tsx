'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (identity: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  api: typeof axios;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create a configured Axios instance
const apiInstance = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (storedUser && storedAccessToken && storedRefreshToken) {
        setUser(JSON.parse(storedUser));
        setAccessToken(storedAccessToken);
        
        // Setup initial auth header
        apiInstance.defaults.headers.common['Authorization'] = `Bearer ${storedAccessToken}`;
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  // Axios Response Interceptor for Token Rotation
  useEffect(() => {
    const interceptor = apiInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const refreshToken = localStorage.getItem('refreshToken');

        if (error.response?.status === 401 && refreshToken && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Call refresh token API
            const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = res.data;

            // Save new tokens
            localStorage.setItem('accessToken', newAccessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            setAccessToken(newAccessToken);

            // Update headers and retry
            apiInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return apiInstance(originalRequest);
          } catch (refreshError) {
            console.error('Refresh token expired or invalid. Logging out.');
            // Clear credentials on failure
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
            setAccessToken(null);
            delete apiInstance.defaults.headers.common['Authorization'];
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      apiInstance.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (identity: string, password: string) => {
    const res = await apiInstance.post('/auth/login', { identity, password });
    const { accessToken, refreshToken, user: userData } = res.data;

    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    setUser(userData);
    setAccessToken(accessToken);
    apiInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await apiInstance.post('/auth/register', { username, email, password });
    const { accessToken, refreshToken, user: userData } = res.data;

    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    setUser(userData);
    setAccessToken(accessToken);
    apiInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await apiInstance.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Logout error on server:', err);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setAccessToken(null);
      delete apiInstance.defaults.headers.common['Authorization'];
    }
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout, api: apiInstance }}>
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
export default AuthContext;
