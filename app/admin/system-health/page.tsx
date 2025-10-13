'use client';

import { useAuth } from '../../contexts/auth';

export default function SystemHealthPage() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-header text-xl">Loading...</div>
      </div>
    );
  }
  if (!user) return null;
  const canView = (user.permissions || []).includes('view_admin_system_health');
  if (!canView) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-header text-xl">Access denied (System Health)</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-header mb-4">System Health</h2>
        <p className="text-subheader">All systems operational.</p>
      </div>
    </div>
  );
}
