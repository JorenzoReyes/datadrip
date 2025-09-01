'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, CreateUserData, UpdateUserData, UserFilters, AuditLog } from '../types/user';

interface UserManagementContextType {
  users: User[];
  auditLogs: AuditLog[];
  filters: UserFilters;
  isLoading: boolean;
  error: string | null;
  
  // CRUD Operations
  createUser: (userData: CreateUserData, createdBy: string) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userId: string, userData: UpdateUserData, updatedBy: string) => Promise<{ success: boolean; error?: string }>;
  deactivateUser: (userId: string, deactivatedBy: string) => Promise<{ success: boolean; error?: string }>;
  activateUser: (userId: string, activatedBy: string) => Promise<{ success: boolean; error?: string }>;
  
  // Filtering and Search
  setFilters: (filters: Partial<UserFilters>) => void;
  getFilteredUsers: () => User[];
  
  // Audit Logs
  getAuditLogs: (userId?: string) => AuditLog[];
  
  // Utility
  getUserById: (userId: string) => User | undefined;
  refreshUsers: () => void;
  syncExistingUsers: () => void;
}

const UserManagementContext = createContext<UserManagementContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'managedUsers',
  AUDIT_LOGS: 'userAuditLogs',
  FILTERS: 'userFilters'
};

const DEFAULT_FILTERS: UserFilters = {
  search: '',
  role: 'all',
  status: 'all',
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

export function UserManagementProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filters, setFiltersState] = useState<UserFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      // Load managed users
      const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      let managedUsers: User[] = [];
      if (storedUsers) {
        managedUsers = JSON.parse(storedUsers);
      }

      // Load existing registered users and convert them to managed users
      const registeredUsers = localStorage.getItem('registeredUsers');
      if (registeredUsers) {
        try {
          const existingUsers = JSON.parse(registeredUsers);
          const convertedUsers: User[] = existingUsers.map((user: any) => ({
            id: `converted_${user.email}_${Date.now()}`,
            firstName: user.firstName || 'Unknown',
            lastName: user.lastName || 'User',
            email: user.email,
            companyName: '',
            role: user.role || 'user',
            status: 'active',
            createdAt: user.createdAt || new Date().toISOString(),
            updatedAt: user.createdAt || new Date().toISOString(),
            lastLoginAt: undefined,
            createdBy: 'system'
          }));

          // Merge with existing managed users, avoiding duplicates
          const existingEmails = new Set(managedUsers.map(u => u.email));
          const newUsers = convertedUsers.filter(u => !existingEmails.has(u.email));
          
          if (newUsers.length > 0) {
            const allUsers = [...managedUsers, ...newUsers];
            setUsers(allUsers);
            saveUsers(allUsers);
          } else {
            setUsers(managedUsers);
          }
        } catch (err) {
          console.error('Error converting registered users:', err);
          setUsers(managedUsers);
        }
      } else {
        setUsers(managedUsers);
      }

      // Load audit logs
      const storedLogs = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (storedLogs) {
        setAuditLogs(JSON.parse(storedLogs));
      }

      // Load filters
      const storedFilters = localStorage.getItem(STORAGE_KEYS.FILTERS);
      if (storedFilters) {
        setFiltersState(JSON.parse(storedFilters));
      }

      setIsLoading(false);
    } catch (err) {
      setError('Failed to load user data');
      setIsLoading(false);
    }
  };

  const saveUsers = (newUsers: User[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(newUsers));
    setUsers(newUsers);
  };

  const saveAuditLogs = (newLogs: AuditLog[]) => {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(newLogs));
    setAuditLogs(newLogs);
  };

  const addAuditLog = (log: Omit<AuditLog, 'id'>) => {
    const newLog: AuditLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    const updatedLogs = [newLog, ...auditLogs];
    saveAuditLogs(updatedLogs);
  };

  const generateUserId = () => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const createUser = async (userData: CreateUserData, createdBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validation
      if (!userData.firstName || !userData.lastName || !userData.email) {
        return { success: false, error: 'Required fields are missing' };
      }

      if (!userData.email.includes('@')) {
        return { success: false, error: 'Invalid email address' };
      }

      // Check for duplicate email
      const existingUser = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Create new user
      const newUser: User = {
        id: generateUserId(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        companyName: userData.companyName,
        role: userData.role,
        status: 'pending', // New users start as pending
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy
      };

      const updatedUsers = [...users, newUser];
      saveUsers(updatedUsers);

      // Add audit log
      addAuditLog({
        action: 'create',
        targetUserId: newUser.id,
        targetUserEmail: newUser.email,
        performedBy: createdBy,
        performedByEmail: createdBy, // Assuming createdBy is email
        timestamp: new Date().toISOString(),
        details: `User account created with role: ${newUser.role}`
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to create user' };
    }
  };

  const updateUser = async (userId: string, userData: UpdateUserData, updatedBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return { success: false, error: 'User not found' };
      }

      const currentUser = users[userIndex];
      const changes: { field: string; oldValue: string; newValue: string }[] = [];

      // Track changes
      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined && currentUser[key as keyof User] !== value) {
          changes.push({
            field: key,
            oldValue: String(currentUser[key as keyof User] || ''),
            newValue: String(value)
          });
        }
      });

      if (changes.length === 0) {
        return { success: false, error: 'No changes detected' };
      }

      // Update user
      const updatedUser: User = {
        ...currentUser,
        ...userData,
        updatedAt: new Date().toISOString()
      };

      const updatedUsers = [...users];
      updatedUsers[userIndex] = updatedUser;
      saveUsers(updatedUsers);

      // Add audit log
      addAuditLog({
        action: 'update',
        targetUserId: userId,
        targetUserEmail: currentUser.email,
        performedBy: updatedBy,
        performedByEmail: updatedBy,
        timestamp: new Date().toISOString(),
        details: `User details updated`,
        changes
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to update user' };
    }
  };

  const deactivateUser = async (userId: string, deactivatedBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return { success: false, error: 'User not found' };
      }

      const currentUser = users[userIndex];

      // Prevent admin from deactivating themselves
      if (currentUser.email === deactivatedBy) {
        return { success: false, error: 'Cannot deactivate your own account' };
      }

      // Update user status
      const updatedUser: User = {
        ...currentUser,
        status: 'inactive',
        updatedAt: new Date().toISOString()
      };

      const updatedUsers = [...users];
      updatedUsers[userIndex] = updatedUser;
      saveUsers(updatedUsers);

      // Add audit log
      addAuditLog({
        action: 'deactivate',
        targetUserId: userId,
        targetUserEmail: currentUser.email,
        performedBy: deactivatedBy,
        performedByEmail: deactivatedBy,
        timestamp: new Date().toISOString(),
        details: 'User account deactivated'
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to deactivate user' };
    }
  };

  const activateUser = async (userId: string, activatedBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return { success: false, error: 'User not found' };
      }

      const currentUser = users[userIndex];

      // Update user status
      const updatedUser: User = {
        ...currentUser,
        status: 'active',
        updatedAt: new Date().toISOString()
      };

      const updatedUsers = [...users];
      updatedUsers[userIndex] = updatedUser;
      saveUsers(updatedUsers);

      // Add audit log
      addAuditLog({
        action: 'activate',
        targetUserId: userId,
        targetUserEmail: currentUser.email,
        performedBy: activatedBy,
        performedByEmail: activatedBy,
        timestamp: new Date().toISOString(),
        details: 'User account activated'
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to activate user' };
    }
  };

  const setFilters = (newFilters: Partial<UserFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFiltersState(updatedFilters);
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(updatedFilters));
  };

  const getFilteredUsers = (): User[] => {
    let filtered = [...users];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user =>
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.companyName && user.companyName.toLowerCase().includes(searchLower))
      );
    }

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(user => user.status === filters.status);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (filters.sortBy) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`;
          bValue = `${b.firstName} ${b.lastName}`;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'lastLoginAt':
          aValue = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          bValue = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          break;
        default:
          aValue = a.email;
          bValue = b.email;
      }

      if (filters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  };

  const getAuditLogs = (userId?: string): AuditLog[] => {
    if (userId) {
      return auditLogs.filter(log => log.targetUserId === userId);
    }
    return auditLogs;
  };

  const getUserById = (userId: string): User | undefined => {
    return users.find(user => user.id === userId);
  };

  const refreshUsers = () => {
    loadData();
  };

  const syncExistingUsers = () => {
    loadData();
  };

  const value: UserManagementContextType = {
    users,
    auditLogs,
    filters,
    isLoading,
    error,
    createUser,
    updateUser,
    deactivateUser,
    activateUser,
    setFilters,
    getFilteredUsers,
    getAuditLogs,
    getUserById,
    refreshUsers,
    syncExistingUsers
  };

  return (
    <UserManagementContext.Provider value={value}>
      {children}
    </UserManagementContext.Provider>
  );
}

export function useUserManagement() {
  const context = useContext(UserManagementContext);
  if (context === undefined) {
    throw new Error('useUserManagement must be used within a UserManagementProvider');
  }
  return context;
}
