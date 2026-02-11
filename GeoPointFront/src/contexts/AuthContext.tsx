import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { User, ViewMode } from '@/types';
import { mockUsers, loginCredentials } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  viewMode: ViewMode;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchViewMode: (mode: ViewMode) => void;
  canSwitchToEmployee: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('employee');

  const login = useCallback(async (email: string, password: string) => {
    const credentials = loginCredentials[email as keyof typeof loginCredentials];
    
    if (!credentials) {
      return { success: false, error: 'Usuário não encontrado' };
    }
    
    if (credentials.password !== password) {
      return { success: false, error: 'Senha incorreta' };
    }

    const foundUser = mockUsers.find(u => u.id === credentials.userId);
    if (foundUser) {
      setUser(foundUser);
      // Set initial view mode based on role
      if (foundUser.role === 'admin') {
        setViewMode('admin');
      } else if (foundUser.role === 'rh_analyst') {
        setViewMode('rh');
      } else {
        setViewMode('employee');
      }
      return { success: true };
    }
    
    return { success: false, error: 'Erro ao fazer login' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setViewMode('employee');
  }, []);

  const switchViewMode = useCallback((mode: ViewMode) => {
    if (user?.role === 'admin' || user?.role === 'rh_analyst') {
      setViewMode(mode);
    }
  }, [user]);

  const canSwitchToEmployee = user?.role === 'admin' || user?.role === 'rh_analyst';

  return (
    <AuthContext.Provider
      value={{
        user,
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
