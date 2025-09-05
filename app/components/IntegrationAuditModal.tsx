'use client';

import React, { useState, useEffect } from 'react';
import { PlatformIntegration, IntegrationAuditLog } from '../types/integration';
import { useIntegrationManagement } from '../contexts/IntegrationManagementContext';

interface IntegrationAuditModalProps {
  integration: PlatformIntegration;
  onClose: () => void;
}

export default function IntegrationAuditModal({ integration, onClose }: IntegrationAuditModalProps) {
  const { getAuditLogs } = useIntegrationManagement();
  const [auditLogs, setAuditLogs] = useState<IntegrationAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuditLogs = () => {
      try {
        const logs = getAuditLogs(integration.id);
        setAuditLogs(logs);
      } catch (err) {
        console.error('Error loading audit logs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuditLogs();
  }, [integration.id, getAuditLogs]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'updated':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'deleted':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'connected':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'disconnected':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'sync_started':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'sync_completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'sync_failed':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return '➕';
      case 'updated':
        return '✏️';
      case 'deleted':
        return '🗑️';
      case 'connected':
        return '🔗';
      case 'disconnected':
        return '🔌';
      case 'sync_started':
        return '🔄';
      case 'sync_completed':
        return '✅';
      case 'sync_failed':
        return '❌';
      default:
        return '📝';
    }
  };

  const formatActionText = (action: string) => {
    switch (action) {
      case 'created':
        return 'Integration Created';
      case 'updated':
        return 'Integration Updated';
      case 'deleted':
        return 'Integration Deleted';
      case 'connected':
        return 'Connected to Platform';
      case 'disconnected':
        return 'Disconnected from Platform';
      case 'sync_started':
        return 'Sync Started';
      case 'sync_completed':
        return 'Sync Completed';
      case 'sync_failed':
        return 'Sync Failed';
      default:
        return action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getPlatformIcon(integration.platform)}</span>
            <div>
              <h2 className="text-2xl font-bold text-header">Integration Audit Log</h2>
              <p className="text-subheader">{integration.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Integration Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-subheader">Status</div>
              <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                integration.status === 'active' 
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : integration.status === 'inactive'
                  ? 'bg-gray-100 text-gray-700 border-gray-200'
                  : integration.status === 'error'
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : 'bg-yellow-100 text-yellow-700 border-yellow-200'
              }`}>
                {integration.status}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-subheader">Last Sync</div>
              <div className="text-sm text-header">
                {integration.lastSyncAt 
                  ? new Date(integration.lastSyncAt).toLocaleString()
                  : 'Never'
                }
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-subheader">Created</div>
              <div className="text-sm text-header">
                {new Date(integration.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div>
          <h3 className="text-lg font-medium text-header mb-4">Activity History</h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-subheader">Loading audit logs...</div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-subheader">No audit logs found for this integration.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs
                .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
                .map((log) => (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="text-lg">{getActionIcon(log.action)}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getActionColor(log.action)}`}>
                              {formatActionText(log.action)}
                            </span>
                            <span className="text-sm text-subheader">
                              by {log.performedBy}
                            </span>
                          </div>
                          
                          <div className="text-sm text-subheader mb-2">
                            {new Date(log.performedAt).toLocaleString()}
                          </div>

                          {/* Action Details */}
                          {log.details && (
                            <div className="text-sm text-header">
                              {log.details.field && (
                                <div className="mb-1">
                                  <span className="font-medium">Field:</span> {log.details.field}
                                </div>
                              )}
                              {log.details.oldValue && (
                                <div className="mb-1">
                                  <span className="font-medium">From:</span> 
                                  <span className="bg-red-100 text-red-700 px-1 rounded text-xs ml-1">
                                    {log.details.oldValue}
                                  </span>
                                </div>
                              )}
                              {log.details.newValue && (
                                <div className="mb-1">
                                  <span className="font-medium">To:</span> 
                                  <span className="bg-green-100 text-green-700 px-1 rounded text-xs ml-1">
                                    {log.details.newValue}
                                  </span>
                                </div>
                              )}
                              {log.details.syncRecords && (
                                <div className="mb-1">
                                  <span className="font-medium">Records Synced:</span> {log.details.syncRecords}
                                </div>
                              )}
                              {log.details.errorMessage && (
                                <div className="mb-1">
                                  <span className="font-medium">Error:</span> 
                                  <span className="text-red-600 ml-1">
                                    {log.details.errorMessage}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Additional Info */}
                          {(log.ipAddress || log.userAgent) && (
                            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                              {log.ipAddress && (
                                <div>IP: {log.ipAddress}</div>
                              )}
                              {log.userAgent && (
                                <div className="truncate">User Agent: {log.userAgent}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-header hover:bg-gray-100 rounded-lg transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
