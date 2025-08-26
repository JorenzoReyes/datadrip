'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  role: string;
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dummy credentials (in real app, these would come from database)
const DUMMY_CREDENTIALS = {
  'user@example.com': { password: 'password123', role: 'user' },
  'admin@example.com': { password: 'admin123', role: 'admin' }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in on app load
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const userInfo = JSON.parse(userData);
        if (userInfo.isAuthenticated) {
          setUser(userInfo);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const userCreds = DUMMY_CREDENTIALS[email as keyof typeof DUMMY_CREDENTIALS];
    
    if (userCreds && userCreds.password === password) {
      const userInfo: User = {
        email,
        role: userCreds.role,
        isAuthenticated: true
      };

      // Store in localStorage (in real app, this would be a JWT token)
      localStorage.setItem('user', JSON.stringify(userInfo));
      setUser(userInfo);
      return true;
    }

    return false;
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
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
