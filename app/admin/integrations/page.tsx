'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useIntegrationManagement } from '../../contexts/IntegrationManagementContext';
import IntegrationList from '../../components/IntegrationList';

export default function AdminIntegrationsPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { integrations, refreshIntegrations, isLoading } = useIntegrationManagement();
  const router = useRouter();

  // Redirect if not admin or system_admin
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'system_admin'))) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

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

  // All admin roles are read-only for integrations

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
              className="flex items-center space-x-3 px-4 py-3 rounded-lg text-subheader hover:bg-gray-100 hover:text-header transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span>Manage Users</span>
            </a>
            
            <a 
              href="/admin/integrations" 
              className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary-500 text-white font-medium"
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold font-title text-header">Platform Integrations</h2>
          <p className="text-subheader mt-2">
            {user.role === 'system_admin' 
              ? 'View, monitor, and manage user-created platform integrations'
              : 'View and monitor user-created platform integrations'
            }
          </p>
        </div>

        {/* Role-based Access Message */}
        <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                {user.role === 'system_admin' ? 'Management Access' : 'Read-Only Access'}
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  {user.role === 'system_admin' 
                    ? 'As a System Administrator, you can view and update integration configurations. You can edit integration settings, view connection statuses, sync timestamps, and error logs, but cannot create, delete, test, or sync integrations. Only users can create integrations through their settings page.'
                    : 'As an Administrator, you have read-only access to integration configurations. You can view connection statuses, sync timestamps, and error logs, but cannot create, edit, delete, test, or sync integrations. Only users can create integrations through their settings page.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Management */}
        <IntegrationList onRefresh={refreshIntegrations} />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-8">
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-header mb-2">{integrations.length}</div>
            <div className="text-subheader">Total Integrations</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-header mb-2">
              {integrations.filter(i => i.status === 'active').length}
            </div>
            <div className="text-subheader">Active Integrations</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-header mb-2">
              {integrations.filter(i => i.status === 'error').length}
            </div>
            <div className="text-subheader">Error Integrations</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-header mb-2">
              {integrations.filter(i => i.status === 'pending').length}
            </div>
            <div className="text-subheader">Pending Integrations</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <div className="text-3xl font-bold text-header mb-2">
              {integrations.filter(i => i.name.includes('Integration -')).length}
            </div>
            <div className="text-subheader">User Created</div>
          </div>
        </div>
      </main>
    </div>
  );
}