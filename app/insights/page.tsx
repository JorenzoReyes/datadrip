'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function InsightsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold font-title text-header">DataDrip</h1>
              <nav className="hidden md:flex space-x-6">
                <a href="/dashboard" className="text-subheader hover:text-header transition">Dashboard</a>
                <a href="/sales-inventory" className="text-subheader hover:text-header transition">Sales and Inventory</a>
                <a href="/insights" className="text-header font-medium">Insights</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">U</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold font-title text-header mb-4">Insights</h2>
          <p className="text-subheader text-lg">This page is coming soon...</p>
        </div>
      </main>
    </div>
  );
}
