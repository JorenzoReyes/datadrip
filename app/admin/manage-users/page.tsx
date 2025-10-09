'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/auth';
import { useUserManagement } from '../../contexts/users';
import { User, UserFilters } from '../../types/user';
import { AddUserModal, EditUserModal, UserAuditModal } from '../../components/users';

export default function ManageUsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    users,
    filters,
    
    error,
    setFilters,
    getFilteredUsers,
    deactivateUser,
    activateUser,
    refreshUsers,
    syncExistingUsers
  } = useUserManagement();
  
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Redirect if not admin or system_admin
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'system_admin'))) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Check for action query parameter to auto-open create modal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'create') {
      setShowAddModal(true);
      // Clean up the URL
      window.history.replaceState({}, '', '/admin/manage-users');
    }
  }, []);

  // removed unused handleLogout

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value });
  };

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters({ [key]: value });
  };

  // Removed unused handleSortChange function

  const handleUserAction = async (action: 'activate' | 'deactivate', userId: string) => {
    if (!user) return;
    
    setActionLoading(userId);
    try {
      const result = action === 'activate' 
        ? await activateUser(userId, user.email)
        : await deactivateUser(userId, user.email);
      
      if (!result.success) {
        alert(result.error || `Failed to ${action} user`);
      }
    } catch {
      alert(`Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = getFilteredUsers();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-header text-xl">Loading...</div>
      </div>
    );
  }
  if (!user) return null;
  const canView = (user.permissions || []).includes('view_admin_manage_users');
  if (!canView) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-header text-xl">Access denied (Manage Users)</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="flex-1 p-8">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold font-title text-header">Manage Users</h2>
            <div className="flex space-x-3">
              <button
                onClick={syncExistingUsers}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition"
              >
                Sync Existing Users
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition"
              >
                + Add New User
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-subheader mb-2">
                Search Users
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={handleSearchChange}
                placeholder="Search by name, email, username, or company..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-subheader mb-2">
                Role
              </label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="system_admin">System Admin</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-subheader mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-subheader mb-2">
                Sort By
              </label>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-') as [UserFilters['sortBy'], UserFilters['sortOrder']];
                  setFilters({ sortBy, sortOrder });
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="email-asc">Email A-Z</option>
                <option value="email-desc">Email Z-A</option>
                <option value="lastLoginAt-desc">Last Login</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <colgroup>
              <col className="w-1/3" />
              <col className="w-1/6" />
              <col className="w-1/6" />
              <col className="w-1/6" />
              <col className="w-1/6" />
              <col className="w-1/6" />
            </colgroup>
              <thead className="bg-primary-500">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-white">Users</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-white">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-white">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-white">Created</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-white">Last Login</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-white bg-primary-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-subheader">
                      {filters.search || filters.role !== 'all' || filters.status !== 'all' 
                        ? 'No users match your search criteria'
                        : 'No users found. Add your first user to get started.'
                      }
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <div>
                          <div className="text-sm font-medium text-header">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-subheader">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (user.role === 'admin' || user.role === 'system_admin')
                            ? 'bg-red-100 text-red-700 border border-red-200' 
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : user.status === 'inactive'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-subheader align-middle">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-subheader align-middle">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium align-middle bg-primary-50">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowAuditModal(true);
                            }}
                            className="text-purple-400 hover:text-purple-300 transition"
                          >
                            Audit
                          </button>
                          {user.status === 'active' ? (
                            <button
                              onClick={() => handleUserAction('deactivate', user.id)}
                              disabled={actionLoading === user.id}
                              className="text-red-400 hover:text-red-300 transition disabled:opacity-50"
                            >
                              {actionLoading === user.id ? 'Deactivating...' : 'Deactivate'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction('activate', user.id)}
                              disabled={actionLoading === user.id}
                              className="text-green-400 hover:text-green-300 transition disabled:opacity-50"
                            >
                              {actionLoading === user.id ? 'Activating...' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-header mb-2">{users.length}</div>
            <div className="text-subheader">Total Users</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-header mb-2">
              {users.filter(u => u.status === 'active').length}
            </div>
            <div className="text-subheader">Active Users</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-header mb-2">
              {users.filter(u => u.status === 'pending').length}
              </div>
            <div className="text-subheader">Pending Users</div>
              </div>
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-header mb-2">
              {users.filter(u => u.status === 'inactive').length}
            </div>
            <div className="text-subheader">Inactive Users</div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            refreshUsers();
          }}
        />
      )}

      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            refreshUsers();
          }}
        />
      )}

      {showAuditModal && selectedUser && (
        <UserAuditModal
          user={selectedUser}
          onClose={() => {
            setShowAuditModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}
