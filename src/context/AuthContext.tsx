import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface AuthUser {
  id: number;
  organization_id: number;
  username: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_path?: string | null;
  profile_banner_path?: string | null;
  profile_status_code?: 'default' | 'busy' | 'sick' | 'leave';
  default_workspace_code: string;
  password_changed_at?: string | null;
  role?: {
    code: string;
    name: string;
  };
  permissions?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = (token: string, userData: AuthUser) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = async () => {
    const sessionKey = sessionStorage.getItem('uni-nexus.presence.session');
    try {
      if (localStorage.getItem('token')) await api.post('/auth/logout', sessionKey ? { session_key: sessionKey } : {});
    } catch {
      // A stateless JWT must still be cleared locally when the server is unavailable.
    } finally {
      localStorage.removeItem('token');
      sessionStorage.removeItem('uni-nexus.presence.session');
      setUser(null);
    }
  };

  const checkAuth = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await api.get<AuthUser>('/auth/me');
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      void logout();
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (code: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(code);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, checkAuth, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
