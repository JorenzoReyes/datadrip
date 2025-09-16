'use client';

import { useAuth } from '../../contexts/auth';
import { IntegrationList } from '../../components/integrations';

export default function AdminIntegrationsPage() {
  const { user, isLoading } = useAuth();
  // basic gating
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-header text-xl">Loading...</div>
      </div>
    );
  }
  if (!user) return null;
  const canView = (user.permissions || []).includes('view_admin_integrations');
  if (!canView) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-header text-xl">Access denied (Admin Integrations)</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <IntegrationList onRefresh={() => {}} />
      </div>
    </div>
  );
}