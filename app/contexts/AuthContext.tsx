'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  user_id: number;
  email: string;
  username: string;
  fname: string;
  lname: string;
  role?: string; // legacy
  roles?: string[];
  permissions?: string[];
  isAuthenticated: boolean;
  companyName?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<boolean>;
  isLoading: boolean;
}

interface RegisterData {
  username: string;
  fname: string;
  lname: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dummy credentials (in real app, these would come from database)
interface DummyCredential {
  password: string;
  role: string;
  username: string;
  permissions?: string[];
}

const DUMMY_CREDENTIALS: Record<string, DummyCredential> = {
  'user@example.com': { password: 'password123', role: 'user', username: 'demo_user' },
  'admin@example.com': { password: 'admin123', role: 'admin', username: 'demo_admin' },
  'system.admin@example.com': { password: 'system123', role: 'system_admin', username: 'demo_system_admin' }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in on app load
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const userInfo = JSON.parse(userData);
        if (userInfo.isAuthenticated) {
          // Ensure baseline permissions for business owners when hydrating
          const rolesList = userInfo.roles || (userInfo.role ? [userInfo.role] : []);
          if (rolesList.includes('business_owner')) {
            const basePerms = new Set<string>(userInfo.permissions || []);
            ['view_dashboard','view_products','view_insights','view_settings','read','update'].forEach(p => basePerms.add(p));
            userInfo.permissions = Array.from(basePerms);
          }
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
    try {
      // 1) Try database login first so we get roles/permissions from DB
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, password })
      });

      if (response.ok) {
        const data = await response.json();
        const userFromApi = data.user as User;
        const primaryRole = (userFromApi.roles && userFromApi.roles[0]) || userFromApi.role || 'user';
        // Ensure baseline permissions for business owners
        const rolesList = userFromApi.roles || (userFromApi.role ? [userFromApi.role] : []);
        const basePerms = new Set<string>(userFromApi.permissions || []);
        if (rolesList.includes('business_owner')) {
          ['view_dashboard','view_products','view_insights','view_settings','read','update'].forEach(p => basePerms.add(p));
        }
        const userInfo: User = { ...userFromApi, permissions: Array.from(basePerms), role: primaryRole, isAuthenticated: true };

        localStorage.setItem('user', JSON.stringify(userInfo));
        setUser(userInfo);
        // Route based on permissions/role
        const roles = userInfo.roles || (userInfo.role ? [userInfo.role] : []);
        const isAdmin = roles.includes('admin') || roles.includes('system_admin') ||
          (userInfo.permissions || []).includes('view_admin_manage_users');
        router.push(isAdmin ? '/admin/manage-users' : '/dashboard');
        return true;
      }

      // First check dummy credentials by email
      const dummyUser = DUMMY_CREDENTIALS[emailOrUsername as keyof typeof DUMMY_CREDENTIALS];
      if (dummyUser && dummyUser.password === password) {
        const userInfo: User = {
          user_id: 0, // Dummy user ID
          email: emailOrUsername,
          username: dummyUser.username,
          fname: dummyUser.role === 'admin' ? 'Admin' : dummyUser.role === 'system_admin' ? 'System' : 'User',
          lname: dummyUser.role === 'system_admin' ? 'Administrator' : 'Demo',
          role: dummyUser.role,
          roles: [dummyUser.role],
          permissions: dummyUser.permissions ?? [],
          isAuthenticated: true,
          companyName: 'DataDrip',
          created_at: new Date().toISOString()
        };

        localStorage.setItem('user', JSON.stringify(userInfo));
        setUser(userInfo);
        const roles = userInfo.roles || (userInfo.role ? [userInfo.role] : []);
        const isAdmin = roles.includes('admin') || roles.includes('system_admin');
        router.push(isAdmin ? '/admin/manage-users' : '/dashboard');
        return true;
      }

      // Check dummy credentials by username
      const dummyUserByUsername = Object.values(DUMMY_CREDENTIALS).find(user => user.username === emailOrUsername);
      if (dummyUserByUsername && dummyUserByUsername.password === password) {
        const email = Object.keys(DUMMY_CREDENTIALS).find(key => DUMMY_CREDENTIALS[key as keyof typeof DUMMY_CREDENTIALS] === dummyUserByUsername);
        const userInfo: User = {
          user_id: 0, // Dummy user ID
          email: email || emailOrUsername,
          username: dummyUserByUsername.username,
          fname: dummyUserByUsername.role === 'admin' ? 'Admin' : dummyUserByUsername.role === 'system_admin' ? 'System' : 'User',
          lname: dummyUserByUsername.role === 'system_admin' ? 'Administrator' : 'Demo',
          role: dummyUserByUsername.role,
          roles: [dummyUserByUsername.role],
          permissions: dummyUserByUsername.permissions ?? [],
          isAuthenticated: true,
          companyName: 'DataDrip',
          created_at: new Date().toISOString()
        };

        localStorage.setItem('user', JSON.stringify(userInfo));
        setUser(userInfo);
        const roles = userInfo.roles || (userInfo.role ? [userInfo.role] : []);
        const isAdmin = roles.includes('admin') || roles.includes('system_admin');
        router.push(isAdmin ? '/admin/manage-users' : '/dashboard');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error' };
    }
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
    register,
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
