'use client';

import React, { useState } from 'react';
import { PlatformIntegration } from '../types/integration';
import { useIntegrationManagement } from '../contexts/integrations';
import { useAuth } from '../contexts/auth';
import EditIntegrationModal from './EditIntegrationModal';
import IntegrationAuditModal from './IntegrationAuditModal';

interface IntegrationListProps {
  onRefresh: () => void;
}

export default function IntegrationList({ onRefresh }: IntegrationListProps) {
  const { user } = useAuth();
  const { 
    filters, 
    setFilters, 
    getFilteredIntegrations
  } = useIntegrationManagement();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<PlatformIntegration | null>(null);

  const filteredIntegrations = getFilteredIntegrations();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ [key]: value });
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'shopee':
        return '🛒';
      case 'lazada':
        return '🛍️';
      case 'tiktok':
        return '🎵';
      case 'custom':
        return '⚙️';
      default:
        return '🔗';
    }
  };

  const canEdit = user?.role === 'system_admin'; // Only system admin can edit
  const canView = user?.role === 'admin' || user?.role === 'system_admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-header">Platform Integrations</h3>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-subheader mb-2">Search Integrations</label>
            <input
              type="text"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Search by name or platform..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-subheader mb-2">Platform</label>
            <select
              value={filters.platform}
              onChange={(e) => handleFilterChange('platform', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            >
              <option value="all">All Platforms</option>
              <option value="shopee">Shopee</option>
              <option value="lazada">Lazada</option>
              <option value="tiktok">TikTok Shop</option>
              <option value="custom">Custom API</option>
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
              <option value="error">Error</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-subheader mb-2">Sort By</label>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-') as [string, string];
                setFilters({ 
                  sortBy: sortBy as 'createdAt' | 'updatedAt' | 'name' | 'lastSyncAt', 
                  sortOrder: sortOrder as 'asc' | 'desc' 
                });
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="lastSyncAt-desc">Last Sync</option>
            </select>
          </div>
        </div>
      </div>

      {/* Integrations Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-subheader uppercase tracking-wider">
                  Integration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-subheader uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-subheader uppercase tracking-wider">
                  Last Sync
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-subheader uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-subheader uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredIntegrations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-subheader">
                    {filters.search || filters.platform !== 'all' || filters.status !== 'all' 
                      ? 'No integrations match your search criteria'
                      : 'No integrations found. Users can connect platforms through their settings page.'
                    }
                  </td>
                </tr>
              ) : (
                filteredIntegrations.map((integration) => (
                  <tr key={integration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">{getPlatformIcon(integration.platform)}</div>
                        <div>
                          <div className="text-sm font-medium text-header">
                            {integration.name}
                          </div>
                          <div className="text-sm text-subheader capitalize">
                            {integration.platform} • {integration.syncFrequency}
                            {integration.name.includes('Integration -') && (
                              <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                User Created
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(integration.status)}`}>
                        {integration.status}
                      </span>
                      {integration.lastErrorMessage && (
                        <div className="text-xs text-red-600 mt-1">
                          {integration.lastErrorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-subheader">
                      {integration.lastSyncAt 
                        ? new Date(integration.lastSyncAt).toLocaleString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-subheader">
                      {new Date(integration.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {canView && (
                          <button
                            onClick={() => {
                              setSelectedIntegration(integration);
                              setShowAuditModal(true);
                            }}
                            className="text-purple-400 hover:text-purple-300 transition"
                          >
                            View Details
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => {
                              setSelectedIntegration(integration);
                              setShowEditModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 transition"
                          >
                            Edit
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

      {/* Modals */}
      {showEditModal && selectedIntegration && (
        <EditIntegrationModal
          integration={selectedIntegration}
          onClose={() => {
            setShowEditModal(false);
            setSelectedIntegration(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedIntegration(null);
            onRefresh();
          }}
        />
      )}

      {showAuditModal && selectedIntegration && (
        <IntegrationAuditModal
          integration={selectedIntegration}
          onClose={() => {
            setShowAuditModal(false);
            setSelectedIntegration(null);
          }}
        />
      )}
    </div>
  );
}
