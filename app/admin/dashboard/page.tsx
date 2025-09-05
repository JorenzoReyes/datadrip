'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useUserManagement } from '../../contexts/UserManagementContext';
import { User, UserFilters } from '../../types/user';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import UserAuditModal from '../../components/UserAuditModal';

export default function AdminDashboardPage() {
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
      window.history.replaceState({}, '', '/admin/dashboard');
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-header text-xl font-medium">Loading...</div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'system_admin')) {
    return null;
  }


  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6">
          {/* Brand */}
          <h1 className="text-2xl font-bold font-title text-header mb-8">DataDrip</h1>
          
          {/* Greeting */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-header">Hi Admin!</h2>
          </div>
          
          {/* Navigation */}
          <nav className="space-y-2">
            <a 
              href="/admin/manage-users" 
              className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary-500 text-white font-medium"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span>Manage Users</span>
            </a>
            
            <a 
              href="/admin/integrations" 
              className="flex items-center space-x-3 px-4 py-3 rounded-lg text-subheader hover:bg-gray-100 hover:text-header transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
              </svg>
              <span>Integrations</span>
            </a>
            
            <a 
              href="/admin/system-health" 
              className="flex items-center space-x-3 px-4 py-3 rounded-lg text-subheader hover:bg-gray-100 hover:text-header transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <span>System Health</span>
            </a>
            
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-3 rounded-lg text-subheader hover:bg-gray-100 hover:text-header transition w-full text-left"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              <span>Log Out</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold font-title text-header">Manage Users</h2>
          <div className="flex space-x-3">
            <button 
              onClick={syncExistingUsers}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition"
            >
              Sync Existing Users
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition flex items-center space-x-2"
            >
              <span>Add User</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-subheader mb-2">Search Users</label>
              <input
                type="text"
                value={filters.search}
                onChange={handleSearchChange}
                placeholder="Search by name, email, or company..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-subheader mb-2">Role</label>
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
            <div>
              <label className="block text-sm font-medium text-subheader mb-2">Status</label>
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
            <div>
              <label className="block text-sm font-medium text-subheader mb-2">Sort By</label>
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
          {/* Table Header */}
          <div className="bg-primary-500 px-6 py-4">
            <div className="grid grid-cols-6 gap-4 text-white font-medium">
              <div>User</div>
              <div>Role</div>
              <div>Status</div>
              <div>Created</div>
              <div>Last Login</div>
              <div>Actions</div>
            </div>
          </div>
          
          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-header">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-subheader">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (user.role === 'admin' || user.role === 'system_admin')
                            ? 'bg-red-100 text-red-700 border border-red-200' 
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-subheader">
                        {user.companyName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-subheader">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-subheader">
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
