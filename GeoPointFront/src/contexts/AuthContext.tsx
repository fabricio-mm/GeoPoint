import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import {
  authApi,
  User,
  JobTitle,
  setAuthToken,
  getAuthToken,
  getViewForJobTitle,
} from '@/services/api';

export type ViewMode = 'admin' | 'rh' | 'employee';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  jobTitle: JobTitle;
  department: number;
  role: number;
}

interface AuthContextType {
  user: AuthUser | null;
  apiUser: User | null;
  viewMode: ViewMode;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchViewMode: (mode: ViewMode) => void;
  canSwitchToEmployee: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapApiUser = (u: User): AuthUser => ({
  id: u.id,
  name: u.fullName,
  email: u.email,
  jobTitle: u.jobTitle,
  department: u.department,
  role: u.role,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [apiUser, setApiUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('employee');

  // Restore session from stored token on mount
  useEffect(() => {
    const stored = localStorage.getItem('geopoint_user');
    if (stored && getAuthToken()) {
      try {
        const parsed: User = JSON.parse(stored);
        setUser(mapApiUser(parsed));
        setApiUser(parsed);
        setViewMode(getViewForJobTitle(parsed.jobTitle));
      } catch {
        localStorage.removeItem('geopoint_user');
        setAuthToken(null);
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      setAuthToken(response.token);
      localStorage.setItem('geopoint_user', JSON.stringify(response.user));

      const authUser = mapApiUser(response.user);
      setUser(authUser);
      setApiUser(response.user);
      setViewMode(getViewForJobTitle(response.user.jobTitle));

      return { success: true };
    } catch (err: any) {
      console.error('Login error:', err);
      let message = 'Erro ao fazer login';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.message) message = parsed.message;
      } catch {
        if (err.message && !err.message.startsWith('HTTP')) message = err.message;
      }
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setApiUser(null);
    setViewMode('employee');
    setAuthToken(null);
    localStorage.removeItem('geopoint_user');
  }, []);

  const switchViewMode = useCallback((mode: ViewMode) => {
    if (!user) return;
    const baseView = getViewForJobTitle(user.jobTitle);
    // Admin/RH can switch down to employee view
    if (baseView === 'admin' || baseView === 'rh') {
      setViewMode(mode);
    }
  }, [user]);

  const canSwitchToEmployee = user ? getViewForJobTitle(user.jobTitle) !== 'employee' : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        apiUser,
        viewMode,
        isAuthenticated: !!user,
        login,
        logout,
        switchViewMode,
        canSwitchToEmployee,
      }}
    >
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
