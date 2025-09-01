export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  createdBy?: string; // Admin who created this user
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  role: 'user' | 'admin';
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'inactive' | 'pending';
}

export interface UserFilters {
  search: string;
  role: 'all' | 'user' | 'admin';
  status: 'all' | 'active' | 'inactive' | 'pending';
  sortBy: 'name' | 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder: 'asc' | 'desc';
}

export interface AuditLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'activate' | 'deactivate';
  targetUserId: string;
  targetUserEmail: string;
  performedBy: string;
  performedByEmail: string;
  timestamp: string;
  details: string;
  changes?: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}
