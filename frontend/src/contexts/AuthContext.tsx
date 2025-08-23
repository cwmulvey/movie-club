import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  role: string;
  profile?: {
    firstName?: string;
    lastName?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Set up axios interceptor for automatic token refresh
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshSuccess = await refreshToken();
          if (refreshSuccess) {
            originalRequest.headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
            return axios(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [refreshTokenValue]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      setToken(null);
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      
      const { token: newToken, refreshToken: newRefreshToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      setToken(newToken);
      setRefreshTokenValue(newRefreshToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Login failed');
    }
  };

  const signup = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/signup`, {
        email,
        password,
        firstName,
        lastName
      });
      
      const { token: newToken, refreshToken: newRefreshToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      setToken(newToken);
      setRefreshTokenValue(newRefreshToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Signup failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setRefreshTokenValue(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const response = await axios.get(`${API_URL}/auth/me`);
        setUser(response.data.user);
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    if (!refreshTokenValue) {
      return false;
    }

    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken: refreshTokenValue
      });

      const { token: newToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      setToken(newToken);
      setRefreshTokenValue(newRefreshToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout();
      return false;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    refreshUser,
    refreshToken,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};