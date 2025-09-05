'use client';

import React, { useState } from 'react';
import { PlatformIntegration, UpdateIntegrationData } from '../types/integration';
import { useIntegrationManagement } from '../contexts/IntegrationManagementContext';
import { useAuth } from '../contexts/AuthContext';

interface EditIntegrationModalProps {
  integration: PlatformIntegration;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditIntegrationModal({ integration, onClose, onSuccess }: EditIntegrationModalProps) {
  const { user } = useAuth();
  const { updateIntegration } = useIntegrationManagement();
  const [formData, setFormData] = useState<UpdateIntegrationData>({
    name: integration.name,
    apiKey: integration.apiKey || '',
    apiSecret: integration.apiSecret || '',
    webhookUrl: integration.webhookUrl || '',
    syncFrequency: integration.syncFrequency,
    status: integration.status,
    configuration: {
      baseUrl: integration.configuration.baseUrl,
      version: integration.configuration.version,
      endpoints: { ...integration.configuration.endpoints }
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('configuration.')) {
      const configPath = name.split('.');
      setFormData(prev => {
        const newConfig = { ...prev.configuration };
        
        if (configPath.length === 3) {
          // Handle nested properties like configuration.endpoints.auth
          const parentKey = configPath[1];
          const childKey = configPath[2];
          
          if (parentKey === 'endpoints') {
            newConfig.endpoints = {
              ...newConfig.endpoints,
              [childKey]: value
            };
          } else if (parentKey === 'baseUrl') {
            newConfig.baseUrl = value;
          } else if (parentKey === 'version') {
            newConfig.version = value;
          }
        } else {
          // Handle direct properties like configuration.baseUrl
          const key = configPath[1];
          if (key === 'baseUrl') {
            newConfig.baseUrl = value;
          } else if (key === 'version') {
            newConfig.version = value;
          }
        }
        
        return {
          ...prev,
          configuration: newConfig
        };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Integration name is required';
    }

    if (!formData.configuration?.baseUrl?.trim()) {
      newErrors['configuration.baseUrl'] = 'Base URL is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateIntegration(integration.id, formData, user.email);
      
      if (result.success) {
        onSuccess();
      } else {
        alert(result.error || 'Failed to update integration');
      }
    } catch (err) {
      console.error('Error updating integration:', err);
      alert('Failed to update integration');
    } finally {
      setIsLoading(false);
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
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getPlatformIcon(integration.platform)}</span>
            <h2 className="text-2xl font-bold text-header">Edit Integration</h2>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-subheader mb-1">
                Integration Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                placeholder="Enter integration name"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="syncFrequency" className="block text-sm font-medium text-subheader mb-1">
                Sync Frequency *
              </label>
              <select
                id="syncFrequency"
                name="syncFrequency"
                value={formData.syncFrequency || 'daily'}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              >
                <option value="realtime">Real-time</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-subheader mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status || 'active'}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="error">Error</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* API Credentials */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-header">API Credentials</h3>
            
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-subheader mb-1">
                API Key
              </label>
              <input
                type="password"
                id="apiKey"
                name="apiKey"
                value={formData.apiKey || ''}
                onChange={handleInputChange}
                placeholder="Enter API key"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
            </div>

            <div>
              <label htmlFor="apiSecret" className="block text-sm font-medium text-subheader mb-1">
                API Secret
              </label>
              <input
                type="password"
                id="apiSecret"
                name="apiSecret"
                value={formData.apiSecret || ''}
                onChange={handleInputChange}
                placeholder="Enter API secret"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
            </div>

            <div>
              <label htmlFor="webhookUrl" className="block text-sm font-medium text-subheader mb-1">
                Webhook URL
              </label>
              <input
                type="url"
                id="webhookUrl"
                name="webhookUrl"
                value={formData.webhookUrl || ''}
                onChange={handleInputChange}
                placeholder="Enter webhook URL (optional)"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-header">Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="configuration.baseUrl" className="block text-sm font-medium text-subheader mb-1">
                  Base URL *
                </label>
                <input
                  type="url"
                  id="configuration.baseUrl"
                  name="configuration.baseUrl"
                  value={formData.configuration?.baseUrl || ''}
                  onChange={handleInputChange}
                  placeholder="https://api.example.com"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                />
                {errors['configuration.baseUrl'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['configuration.baseUrl']}</p>
                )}
              </div>

              <div>
                <label htmlFor="configuration.version" className="block text-sm font-medium text-subheader mb-1">
                  API Version
                </label>
                <input
                  type="text"
                  id="configuration.version"
                  name="configuration.version"
                  value={formData.configuration?.version || ''}
                  onChange={handleInputChange}
                  placeholder="1.0"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                />
              </div>
            </div>

            {/* Endpoints */}
            <div className="space-y-3">
              <h4 className="text-md font-medium text-header">API Endpoints</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="configuration.endpoints.auth" className="block text-sm font-medium text-subheader mb-1">
                    Auth Endpoint
                  </label>
                  <input
                    type="text"
                    id="configuration.endpoints.auth"
                    name="configuration.endpoints.auth"
                    value={formData.configuration?.endpoints?.auth || ''}
                    onChange={handleInputChange}
                    placeholder="/auth"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div>
                  <label htmlFor="configuration.endpoints.products" className="block text-sm font-medium text-subheader mb-1">
                    Products Endpoint
                  </label>
                  <input
                    type="text"
                    id="configuration.endpoints.products"
                    name="configuration.endpoints.products"
                    value={formData.configuration?.endpoints?.products || ''}
                    onChange={handleInputChange}
                    placeholder="/products"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div>
                  <label htmlFor="configuration.endpoints.orders" className="block text-sm font-medium text-subheader mb-1">
                    Orders Endpoint
                  </label>
                  <input
                    type="text"
                    id="configuration.endpoints.orders"
                    name="configuration.endpoints.orders"
                    value={formData.configuration?.endpoints?.orders || ''}
                    onChange={handleInputChange}
                    placeholder="/orders"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div>
                  <label htmlFor="configuration.endpoints.inventory" className="block text-sm font-medium text-subheader mb-1">
                    Inventory Endpoint
                  </label>
                  <input
                    type="text"
                    id="configuration.endpoints.inventory"
                    name="configuration.endpoints.inventory"
                    value={formData.configuration?.endpoints?.inventory || ''}
                    onChange={handleInputChange}
                    placeholder="/inventory"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-header hover:bg-gray-100 rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update Integration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
