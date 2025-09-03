'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    if (!isLoading && !user) {
      router.push('/');
      return;
    }

    // Redirect admin users to admin dashboard
    if (!isLoading && user && user.role === 'admin') {
      router.push('/admin/dashboard');
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

  if (!user || user.role === 'admin') {
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
              <span className="text-purple-300">User Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user.email}</span>
              <button
                onClick={() => router.push('/settings')}
                className="px-3 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition"
                title="Settings"
              >
                ⚙️
              </button>
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
                  <main className="mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Welcome Card */}
          <div className="col-span-full bg-black/40 rounded-xl p-4 border border-purple-500/30">
            <h2 className="text-xl font-bold text-white mb-2">Welcome to DataDrip!</h2>
            <p className="text-gray-300 text-sm">
              You are logged in as a <span className="text-purple-400 font-medium">{user.role}</span> user.
              This dashboard provides access to your data and analytics.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
            <h3 className="text-lg font-semibold text-white mb-3">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300 text-sm">Total Records</span>
                <span className="text-purple-400 font-medium">1,234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300 text-sm">This Month</span>
                <span className="text-purple-400 font-medium">567</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300 text-sm">Active Users</span>
                <span className="text-purple-400 font-medium">89</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-black/40 rounded-xl p-4 border border-purple-500/30">
            <h3 className="text-lg font-semibold text-white mb-3">Recent Activity</h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-300">
                <div className="text-purple-400">Data export completed</div>
                <div className="text-gray-500 text-xs">2 hours ago</div>
              </div>
              <div className="text-sm text-gray-300">
                <div className="text-purple-400">New record added</div>
                <div className="text-gray-500 text-xs">4 hours ago</div>
              </div>
              <div className="text-sm text-gray-300">
                <div className="text-purple-400">Report generated</div>
                <div className="text-gray-500 text-xs">1 day ago</div>
              </div>
            </div>
          </div>


        </div>
      </main>
    </div>
  );
}
