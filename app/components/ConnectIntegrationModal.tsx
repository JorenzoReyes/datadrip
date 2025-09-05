'use client';

import React, { useState } from 'react';
import { useIntegrationManagement } from '../contexts/IntegrationManagementContext';
import { useAuth } from '../contexts/AuthContext';
import { CreateIntegrationData } from '../types/integration';

interface ConnectIntegrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConnectIntegrationModal({ onClose, onSuccess }: ConnectIntegrationModalProps) {
  const { user } = useAuth();
  const { platformTemplates, createIntegration } = useIntegrationManagement();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [formData, setFormData] = useState<CreateIntegrationData>({
    platform: 'shopee',
    name: '',
    apiKey: '',
    apiSecret: '',
    webhookUrl: '',
    syncFrequency: 'daily',
    configuration: {
      baseUrl: '',
      version: '1.0',
      endpoints: {
        auth: '/auth',
        products: '/products',
        orders: '/orders',
        inventory: '/inventory'
      }
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedPlatformTemplate = platformTemplates.find(t => t.platform === selectedTemplate);

  const handleTemplateSelect = (platform: string) => {
    const template = platformTemplates.find(t => t.platform === platform);
    if (template) {
      setSelectedTemplate(platform);
      setFormData({
        platform: template.platform as 'shopee' | 'lazada' | 'tiktok' | 'custom',
        name: `${template.name} Integration`,
        apiKey: '',
        apiSecret: '',
        webhookUrl: '',
        syncFrequency: 'daily',
        configuration: { ...template.defaultConfiguration }
      });
    }
  };

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

    if (!formData.name.trim()) {
      newErrors.name = 'Integration name is required';
    }

    if (!selectedPlatformTemplate) {
      newErrors.platform = 'Please select a platform';
    }

    if (selectedPlatformTemplate) {
      selectedPlatformTemplate.requiredFields.forEach(field => {
        if (!formData[field as keyof CreateIntegrationData]) {
          newErrors[field] = `${field} is required`;
        }
      });
    }

    if (!formData.configuration.baseUrl.trim()) {
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
      const result = await createIntegration(formData, user.email);
      
      if (result.success) {
        onSuccess();
      } else {
        alert(result.error || 'Failed to create integration');
      }
    } catch (err) {
      console.error('Error creating integration:', err);
      alert('Failed to create integration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-header">Connect New Integration</h2>
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
          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-subheader mb-3">Select Platform</label>
            <div className="grid grid-cols-2 gap-4">
              {platformTemplates.map((template) => (
                <button
                  key={template.platform}
                  type="button"
                  onClick={() => handleTemplateSelect(template.platform)}
                  className={`p-4 rounded-lg border-2 transition ${
                    selectedTemplate === template.platform
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{template.icon}</div>
                  <div className="font-medium text-header">{template.name}</div>
                  <div className="text-sm text-subheader">{template.description}</div>
                </button>
              ))}
            </div>
            {errors.platform && (
              <p className="mt-1 text-sm text-red-600">{errors.platform}</p>
            )}
          </div>

          {selectedPlatformTemplate && (
            <>
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
                    value={formData.name}
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
                    value={formData.syncFrequency}
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

              {/* API Credentials */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-header">API Credentials</h3>
                
                {selectedPlatformTemplate.requiredFields.includes('apiKey') && (
                  <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-subheader mb-1">
                      API Key *
                    </label>
                    <input
                      type="password"
                      id="apiKey"
                      name="apiKey"
                      value={formData.apiKey}
                      onChange={handleInputChange}
                      placeholder="Enter API key"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                    />
                    {errors.apiKey && (
                      <p className="mt-1 text-sm text-red-600">{errors.apiKey}</p>
                    )}
                  </div>
                )}

                {selectedPlatformTemplate.requiredFields.includes('apiSecret') && (
                  <div>
                    <label htmlFor="apiSecret" className="block text-sm font-medium text-subheader mb-1">
                      API Secret *
                    </label>
                    <input
                      type="password"
                      id="apiSecret"
                      name="apiSecret"
                      value={formData.apiSecret}
                      onChange={handleInputChange}
                      placeholder="Enter API secret"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                    />
                    {errors.apiSecret && (
                      <p className="mt-1 text-sm text-red-600">{errors.apiSecret}</p>
                    )}
                  </div>
                )}

                {selectedPlatformTemplate.optionalFields.includes('webhookUrl') && (
                  <div>
                    <label htmlFor="webhookUrl" className="block text-sm font-medium text-subheader mb-1">
                      Webhook URL
                    </label>
                    <input
                      type="url"
                      id="webhookUrl"
                      name="webhookUrl"
                      value={formData.webhookUrl}
                      onChange={handleInputChange}
                      placeholder="Enter webhook URL (optional)"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                    />
                  </div>
                )}
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
                      value={formData.configuration.baseUrl}
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
                      value={formData.configuration.version}
                      onChange={handleInputChange}
                      placeholder="1.0"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-header placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

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
              disabled={isLoading || !selectedPlatformTemplate}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connecting...' : 'Connect Integration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
