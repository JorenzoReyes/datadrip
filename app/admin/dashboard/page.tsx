'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated and is admin
    if (!isLoading && !user) {
      router.push('/');
      return;
    }

    if (!isLoading && user && user.role !== 'admin' && user.role !== 'system_admin') {
      router.push('/dashboard');
      return;
    }
  }, [user, isLoading, router]);

  const handleLogout = () => {
    // This will be handled by the AuthContext
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020D0D]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'system_admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#020D0D]">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md border-b border-purple-500/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">DataDrip</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">{user.email}</span>
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Admin Welcome Card */}
          <div className="col-span-full bg-gradient-to-r from-red-900/40 to-purple-900/40 rounded-xl p-4 border border-red-500/30">
            <h2 className="text-xl font-bold text-white mb-2">
              {user.role === 'system_admin' ? '🔧 System Administrator Control Panel' : '🚨 Admin Control Panel'}
            </h2>
            <p className="text-gray-300 text-sm">
              You have <span className="text-red-400 font-bold">
                {user.role === 'system_admin' ? 'system administrator privileges' : 'administrator privileges'}
              </span>.
              Manage users, system settings, and monitor all activities.
            </p>
          </div>

          {/* System Overview */}
          <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
            <h3 className="text-lg font-semibold text-white mb-3">System Overview</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300 text-sm">Total Users</span>
                <span className="text-green-400 font-medium">2,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300 text-sm">Active Sessions</span>
                <span className="text-blue-400 font-medium">156</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300 text-sm">System Load</span>
                <span className="text-yellow-400 font-medium">67%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300 text-sm">Database Size</span>
                <span className="text-purple-400 font-medium">2.3 GB</span>
              </div>
            </div>
          </div>

          {/* User Management */}
          <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
            <h3 className="text-lg font-semibold text-white mb-3">User Management</h3>
            <div className="space-y-2">
              <button 
                onClick={() => router.push('/admin/manage-users')}
                className="w-full text-left p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition text-sm"
              >
                👥 Manage Users
              </button>
              <button 
                onClick={() => router.push('/admin/manage-users?action=create')}
                className="w-full text-left p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition text-sm"
              >
                ➕ Create User
              </button>
            </div>
          </div>

          {/* System Monitoring */}
          <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
            <h3 className="text-lg font-semibold text-white mb-3">System Monitoring</h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-300">
                <div className="text-green-400">✅ All systems operational</div>
                <div className="text-gray-500 text-xs">Last checked: 2 min ago</div>
              </div>
              <div className="text-sm text-gray-300">
                <div className="text-blue-400">📊 Performance metrics normal</div>
                <div className="text-gray-500 text-xs">CPU: 23%, RAM: 45%</div>
              </div>
              <div className="text-sm text-gray-300">
                <div className="text-purple-400">🔐 Security scan passed</div>
                <div className="text-gray-500 text-xs">No threats detected</div>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
            <h3 className="text-lg font-semibold text-white mb-3">Admin Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition text-sm">
                ⚙️ System Settings
              </button>
              <button className="w-full text-left p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition text-sm">
                📈 Analytics Dashboard
              </button>
              <button className="w-full text-left p-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition text-sm">
                🔄 Backup System
              </button>
              <button className="w-full text-left p-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition text-sm">
                🚨 Emergency Mode
              </button>
            </div>
          </div>

          {/* Recent Admin Activities */}
          <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
            <h3 className="text-lg font-semibold text-white mb-3">Recent Admin Activities</h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-300">
                <div className="text-red-400">🔒 User permissions updated</div>
                <div className="text-gray-500 text-xs">5 minutes ago</div>
              </div>
              <div className="text-sm text-gray-300">
                <div className="text-blue-400">📊 System backup completed</div>
                <div className="text-gray-500 text-xs">1 hour ago</div>
              </div>
              <div className="text-sm text-gray-300">
                <div className="text-green-400">✅ New user account created</div>
                <div className="text-gray-500 text-xs">2 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
