'use client';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { seedDemoUsers, clearDemoData } from '../utils/seedDemoData';

export default function DevToolsPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');

  const handleSeedData = () => {
    try {
      seedDemoUsers();
      setMessage('Demo data seeded successfully! You can now test the user management system.');
    } catch (error) {
      setMessage('Error seeding demo data: ' + (error as Error).message);
    }
  };

  const handleClearData = () => {
    try {
      clearDemoData();
      setMessage('Demo data cleared successfully!');
    } catch (error) {
      setMessage('Error clearing demo data: ' + (error as Error).message);
    }
  };

  // Only show to admins
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 via-black to-purple-900">
        <div className="text-white text-xl">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-black to-purple-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-black/40 rounded-xl p-6 border border-purple-500/30">
          <h1 className="text-2xl font-bold text-white mb-6">Development Tools</h1>
          
          <div className="space-y-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-3">User Management Demo Data</h2>
              <p className="text-gray-300 mb-4">
                Use these tools to seed demo data for testing the user management system.
                This will create sample users with different roles and statuses.
              </p>
              
              <div className="flex space-x-4">
                <button
                  onClick={handleSeedData}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                >
                  Seed Demo Data
                </button>
                <button
                  onClick={handleClearData}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  Clear Demo Data
                </button>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Console Commands</h2>
              <p className="text-gray-300 mb-2">
                You can also use these commands in the browser console:
              </p>
              <div className="bg-gray-900 rounded p-3 font-mono text-sm">
                <div className="text-green-400">seedDemoUsers()</div>
                <div className="text-red-400">clearDemoData()</div>
              </div>
            </div>

            {message && (
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-200">{message}</p>
              </div>
            )}

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-3">What&apos;s Included</h2>
              <ul className="text-gray-300 space-y-2">
                <li>• 5 sample users with different roles and statuses</li>
                <li>• Sample audit logs showing user actions</li>
                <li>• Users from different companies</li>
                <li>• Various creation dates and last login times</li>
              </ul>
            </div>

            <div className="text-center">
              <a
                href="/admin/manage-users"
                className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                Go to User Management
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
