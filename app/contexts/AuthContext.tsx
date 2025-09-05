'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  username?: string;
  role: string;
  isAuthenticated: boolean;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

interface RegisteredUser {
  email: string;
  password: string;
  role: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  companyName?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dummy credentials (in real app, these would come from database)
const DUMMY_CREDENTIALS = {
  'user@example.com': { password: 'password123', role: 'user', username: 'demo_user' },
  'admin@example.com': { password: 'admin123', role: 'admin', username: 'demo_admin' },
  'system.admin@example.com': { password: 'system123', role: 'system_admin', username: 'demo_system_admin' }
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

  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // First check dummy credentials by email
    const dummyUser = DUMMY_CREDENTIALS[emailOrUsername as keyof typeof DUMMY_CREDENTIALS];
    if (dummyUser && dummyUser.password === password) {
      const userInfo: User = {
        email: emailOrUsername,
        username: dummyUser.username,
        role: dummyUser.role,
        isAuthenticated: true,
        firstName: dummyUser.role === 'admin' ? 'Admin' : dummyUser.role === 'system_admin' ? 'System' : 'User',
        lastName: dummyUser.role === 'system_admin' ? 'Administrator' : 'Demo',
        companyName: 'DataDrip'
      };

      localStorage.setItem('user', JSON.stringify(userInfo));
      setUser(userInfo);
      return true;
    }

    // Check dummy credentials by username
    const dummyUserByUsername = Object.values(DUMMY_CREDENTIALS).find(user => user.username === emailOrUsername);
    if (dummyUserByUsername && dummyUserByUsername.password === password) {
      const email = Object.keys(DUMMY_CREDENTIALS).find(key => DUMMY_CREDENTIALS[key as keyof typeof DUMMY_CREDENTIALS] === dummyUserByUsername);
      const userInfo: User = {
        email: email || emailOrUsername,
        username: dummyUserByUsername.username,
        role: dummyUserByUsername.role,
        isAuthenticated: true,
        firstName: dummyUserByUsername.role === 'admin' ? 'Admin' : dummyUserByUsername.role === 'system_admin' ? 'System' : 'User',
        lastName: dummyUserByUsername.role === 'system_admin' ? 'Administrator' : 'Demo',
        companyName: 'DataDrip'
      };

      localStorage.setItem('user', JSON.stringify(userInfo));
      setUser(userInfo);
      return true;
    }

    // Then check registered users by email
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    let registeredUser = registeredUsers.find((u: RegisteredUser) => u.email === emailOrUsername && u.password === password);

    // If not found by email, check by username
    if (!registeredUser) {
      registeredUser = registeredUsers.find((u: RegisteredUser) => u.username === emailOrUsername && u.password === password);
    }

    if (registeredUser) {
      const userInfo: User = {
        email: registeredUser.email,
        username: registeredUser.username,
        role: registeredUser.role,
        isAuthenticated: true,
        firstName: registeredUser.firstName,
        lastName: registeredUser.lastName,
        companyName: ''
      };

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

  const updateUser = async (userData: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update user data
      const updatedUser = { ...user, ...userData };
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update state
      setUser(updatedUser);
      
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    updateUser,
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
