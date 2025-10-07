'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

  const loadData = useCallback(async () => {
    try {
      // Fetch live users from API (DB-backed)
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      const liveUsers: User[] = data.users || [];
      setUsers(liveUsers);

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
    } catch {
      setError('Failed to load user data');
      setIsLoading(false);
    }
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    loadData();
  }, [loadData]);


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


  const createUser = async (userData: CreateUserData, createdBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to create user' };
      }

      // Refresh users list from database
      await loadData();

      // Add audit log
      addAuditLog({
        action: 'create',
        targetUserId: result.user.id,
        targetUserEmail: result.user.email,
        performedBy: createdBy,
        performedByEmail: createdBy,
        timestamp: new Date().toISOString(),
        details: `User account created with role: ${result.user.role}`
      });

      return { success: true };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: 'Failed to create user' };
    }
  };

  // Update
  const updateUser = async (userId: string, userData: UpdateUserData, updatedBy: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Failed to update user' };

      await loadData();
      addAuditLog({
        action: 'update',
        targetUserId: userId,
        targetUserEmail: data.user.email,
        performedBy: updatedBy,
        performedByEmail: updatedBy,
        timestamp: new Date().toISOString(),
        details: 'User updated'
      });
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to update user' };
    }
  };


  // Activate / Deactivate
  const activateUser = async (userId: string, by: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Failed to activate user' };
      await loadData();
      addAuditLog({
        action: 'activate',
        targetUserId: userId,
        targetUserEmail: '',
        performedBy: by,
        performedByEmail: by,
        timestamp: new Date().toISOString(),
        details: 'User activated'
      });
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to activate user' };
    }
  };

  const deactivateUser = async (userId: string, by: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inactive' })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Failed to deactivate user' };
      await loadData();
      addAuditLog({
        action: 'deactivate',
        targetUserId: userId,
        targetUserEmail: '',
        performedBy: by,
        performedByEmail: by,
        timestamp: new Date().toISOString(),
        details: 'User deactivated'
      });
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to deactivate user' };
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
