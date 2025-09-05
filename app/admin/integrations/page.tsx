'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function IntegrationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
      return;
    }

    if (!isLoading && user && user.role !== 'admin' && user.role !== 'system_admin') {
      router.push('/dashboard');
      return;
    }
  }, [user, isLoading, router]);

  if (isLoading) {
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
              onClick={() => router.push('/')}
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
        <div className="text-center">
          <h2 className="text-3xl font-bold font-title text-header mb-4">Integrations</h2>
          <p className="text-subheader text-lg">This page is coming soon...</p>
        </div>
      </main>
    </div>
  );
}
