'use client';
import { useState, useEffect } from 'react';
import { useUserManagement } from '../contexts/users';
import { User, AuditLog } from '../types/user';

interface UserAuditModalProps {
  user: User;
  onClose: () => void;
}

export default function UserAuditModal({ user, onClose }: UserAuditModalProps) {
  const { getAuditLogs } = useUserManagement();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuditLogs = () => {
      try {
        const logs = getAuditLogs(user.id);
        setAuditLogs(logs);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuditLogs();
  }, [user.id, getAuditLogs]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'delete':
        return '🗑️';
      case 'activate':
        return '✅';
      case 'deactivate':
        return '❌';
      default:
        return '📝';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-400';
      case 'update':
        return 'text-blue-400';
      case 'delete':
        return 'text-red-400';
      case 'activate':
        return 'text-green-400';
      case 'deactivate':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-header">Audit Log</h3>
              <p className="text-sm text-subheader">
                Activity history for {user.firstName} {user.lastName} ({user.email})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-subheader hover:text-header transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-subheader">Current Status</div>
                <div className={`font-medium ${
                  user.status === 'active' ? 'text-green-600' :
                  user.status === 'inactive' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </div>
              </div>
              <div>
                <div className="text-sm text-subheader">Role</div>
                <div className={`font-medium ${
                  (user.role === 'admin' || user.role === 'system_admin') ? 'text-red-600' : 'text-blue-600'
                }`}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </div>
              </div>
              <div>
                <div className="text-sm text-subheader">Account Created</div>
                <div className="text-header font-medium">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-subheader">Loading audit logs...</div>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-subheader">No audit logs found for this user</div>
              </div>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log) => {
                  const { date, time } = formatTimestamp(log.timestamp);
                  return (
                    <div key={log.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getActionIcon(log.action)}</span>
                          <div>
                            <div className={`font-medium ${getActionColor(log.action)}`}>
                              {log.action.charAt(0).toUpperCase() + log.action.slice(1)} Action
                            </div>
                            <div className="text-sm text-subheader">
                              by {log.performedByEmail}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-header">{date}</div>
                          <div className="text-xs text-subheader">{time}</div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-header mb-2">
                        {log.details}
                      </div>

                      {/* Changes Details */}
                      {log.changes && log.changes.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <div className="text-xs text-subheader mb-2">Changes made:</div>
                          <div className="space-y-1">
                            {log.changes.map((change, index) => (
                              <div key={index} className="text-xs bg-white rounded p-2 border border-gray-200">
                                <div className="flex justify-between">
                                  <span className="text-subheader capitalize">{change.field}:</span>
                                  <div className="flex space-x-2">
                                    <span className="text-red-600 line-through">{change.oldValue}</span>
                                    <span className="text-subheader">→</span>
                                    <span className="text-green-600">{change.newValue}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Stats */}
          {auditLogs.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-300">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {auditLogs.filter(log => log.action === 'create').length}
                  </div>
                  <div className="text-xs text-subheader">Created</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {auditLogs.filter(log => log.action === 'update').length}
                  </div>
                  <div className="text-xs text-subheader">Updated</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-yellow-600">
                    {auditLogs.filter(log => log.action === 'activate').length}
                  </div>
                  <div className="text-xs text-subheader">Activated</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">
                    {auditLogs.filter(log => log.action === 'deactivate').length}
                  </div>
                  <div className="text-xs text-subheader">Deactivated</div>
                </div>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="mt-6 pt-4 border-t border-gray-300">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
