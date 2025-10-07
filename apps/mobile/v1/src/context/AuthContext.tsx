import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthState } from '../hooks/useAuthState';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (masterPassword: string) => Promise<boolean>;
  logout: () => void;
  lastActivity: number;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};