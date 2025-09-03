'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useUserManagement } from '../../contexts/UserManagementContext';
import { User, UserFilters } from '../../types/user';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import UserAuditModal from '../../components/UserAuditModal';

export default function ManageUsersPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const {
    users,
    filters,
    isLoading,
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

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
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

  const handleLogout = () => {
    logout();
    router.push('/');
  };

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

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020D0D]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#020D0D]">
      <header className="bg-black/40 backdrop-blur-md border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">DataDrip</h1>
              <span className="text-red-400 font-bold">USER MANAGEMENT</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition"
              >
                ← Back to Dashboard
              </button>
              <span className="text-gray-300">Admin: {user.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold text-white">Manage Users</h2>
            <div className="flex space-x-3">
              <button
                onClick={syncExistingUsers}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
              >
                Sync Existing Users
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition"
              >
                + Add New User
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 rounded-lg bg-red-900/30 border border-red-500/30 p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Search Users
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={handleSearchChange}
                placeholder="Search by name, email, or company..."
                className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Role
              </label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Sort By
              </label>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-') as [UserFilters['sortBy'], UserFilters['sortOrder']];
                  setFilters({ sortBy, sortOrder });
                }}
                className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
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

        {/* Users Table */}
        <div className="bg-black/40 rounded-xl border border-purple-500/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-purple-900/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      {filters.search || filters.role !== 'all' || filters.status !== 'all' 
                        ? 'No users match your search criteria'
                        : 'No users found. Add your first user to get started.'
                      }
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-red-900/30 text-red-300 border border-red-500/30' 
                            : 'bg-blue-900/30 text-blue-300 border border-blue-500/30'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'active' 
                            ? 'bg-green-900/30 text-green-300 border border-green-500/30'
                            : user.status === 'inactive'
                            ? 'bg-red-900/30 text-red-300 border border-red-500/30'
                            : 'bg-yellow-900/30 text-yellow-300 border border-yellow-500/30'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {user.companyName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
            <div className="text-2xl font-bold text-white">{users.length}</div>
            <div className="text-sm text-gray-400">Total Users</div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
            <div className="text-2xl font-bold text-green-400">
              {users.filter(u => u.status === 'active').length}
            </div>
            <div className="text-sm text-gray-400">Active Users</div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
            <div className="text-2xl font-bold text-yellow-400">
              {users.filter(u => u.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-400">Pending Users</div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
            <div className="text-2xl font-bold text-red-400">
              {users.filter(u => u.status === 'inactive').length}
            </div>
            <div className="text-sm text-gray-400">Inactive Users</div>
          </div>
        </div>
      </main>

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
