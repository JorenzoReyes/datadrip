'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PlatformIntegration, CreateIntegrationData, UpdateIntegrationData, IntegrationAuditLog, IntegrationFilters, PlatformTemplate } from '../types/integration';

interface IntegrationManagementContextType {
  integrations: PlatformIntegration[];
  auditLogs: IntegrationAuditLog[];
  platformTemplates: PlatformTemplate[];
  filters: IntegrationFilters;
  isLoading: boolean;
  error: string | null;
  setFilters: (filters: Partial<IntegrationFilters>) => void;
  getFilteredIntegrations: () => PlatformIntegration[];
  createIntegration: (integrationData: CreateIntegrationData, createdBy: string) => Promise<{ success: boolean; error?: string }>;
  updateIntegration: (id: string, integrationData: UpdateIntegrationData, updatedBy: string) => Promise<{ success: boolean; error?: string }>;
  deleteIntegration: (id: string, deletedBy: string) => Promise<{ success: boolean; error?: string }>;
  deleteIntegrationByUser: (platform: string, userEmail: string, deletedBy: string) => Promise<{ success: boolean; error?: string }>;
  testConnection: (id: string) => Promise<{ success: boolean; error?: string }>;
  syncIntegration: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshIntegrations: () => void;
  getAuditLogs: (integrationId: string) => IntegrationAuditLog[];
}

const IntegrationManagementContext = createContext<IntegrationManagementContextType | undefined>(undefined);

// Platform templates
const PLATFORM_TEMPLATES: PlatformTemplate[] = [
  {
    platform: 'shopee',
    name: 'Shopee',
    description: 'Connect to Shopee marketplace for product and order management',
    icon: '🛒',
    color: '#ee4d2d',
    authType: 'oauth2',
    requiredFields: ['accessToken'],
    optionalFields: ['refreshToken', 'webhookUrl'],
    defaultConfiguration: {
      baseUrl: 'https://partner.shopeemobile.com/api/v2',
      version: '2.0',
      endpoints: {
        auth: '/auth/token',
        products: '/product/get_item_list',
        orders: '/order/get_order_list',
        inventory: '/product/get_item_base_info'
      }
    }
  },
  {
    platform: 'lazada',
    name: 'Lazada',
    description: 'Connect to Lazada marketplace for product and order management',
    icon: '🛍️',
    color: '#0f146d',
    authType: 'oauth2',
    requiredFields: ['accessToken'],
    optionalFields: ['refreshToken', 'webhookUrl'],
    defaultConfiguration: {
      baseUrl: 'https://api.lazada.com.ph/rest',
      version: '1.0',
      endpoints: {
        auth: '/auth/token',
        products: '/product/get',
        orders: '/order/get',
        inventory: '/product/stock/update'
      }
    }
  },
  {
    platform: 'tiktok',
    name: 'TikTok Shop',
    description: 'Connect to TikTok Shop for product and order management',
    icon: '🎵',
    color: '#000000',
    authType: 'oauth2',
    requiredFields: ['accessToken'],
    optionalFields: ['refreshToken', 'webhookUrl'],
    defaultConfiguration: {
      baseUrl: 'https://open-api.tiktokglobalshop.com',
      version: '1.0',
      endpoints: {
        auth: '/oauth/access_token',
        products: '/product/202309/products',
        orders: '/order/202309/orders',
        inventory: '/product/202309/inventory'
      }
    }
  },
  {
    platform: 'custom',
    name: 'Custom API',
    description: 'Connect to a custom API endpoint',
    icon: '⚙️',
    color: '#6b7280',
    authType: 'api_key',
    requiredFields: ['apiKey'],
    optionalFields: ['apiSecret', 'webhookUrl'],
    defaultConfiguration: {
      baseUrl: '',
      version: '1.0',
      endpoints: {
        auth: '/auth',
        products: '/products',
        orders: '/orders',
        inventory: '/inventory'
      }
    }
  }
];

export function IntegrationManagementProvider({ children }: { children: ReactNode }) {
  const [integrations, setIntegrations] = useState<PlatformIntegration[]>([]);
  const [auditLogs, setAuditLogs] = useState<IntegrationAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<IntegrationFilters>({
    search: '',
    platform: 'all',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const platformTemplates = PLATFORM_TEMPLATES;

  // Load integrations from localStorage
  useEffect(() => {
    const loadIntegrations = () => {
      try {
        const storedIntegrations = localStorage.getItem('platform_integrations');
        const storedAuditLogs = localStorage.getItem('integration_audit_logs');
        
        if (storedIntegrations) {
          setIntegrations(JSON.parse(storedIntegrations));
        }
        
        if (storedAuditLogs) {
          setAuditLogs(JSON.parse(storedAuditLogs));
        }
      } catch (err) {
        console.error('Error loading integrations:', err);
        setError('Failed to load integrations');
      } finally {
        setIsLoading(false);
      }
    };

    loadIntegrations();
  }, []);

  // Save integrations to localStorage
  useEffect(() => {
    if (integrations.length > 0) {
      localStorage.setItem('platform_integrations', JSON.stringify(integrations));
    }
  }, [integrations]);

  // Save audit logs to localStorage
  useEffect(() => {
    if (auditLogs.length > 0) {
      localStorage.setItem('integration_audit_logs', JSON.stringify(auditLogs));
    }
  }, [auditLogs]);

  const setFilters = (newFilters: Partial<IntegrationFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  };

  const getFilteredIntegrations = (): PlatformIntegration[] => {
    let filtered = [...integrations];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(integration =>
        integration.name.toLowerCase().includes(searchLower) ||
        integration.platform.toLowerCase().includes(searchLower) ||
        integration.status.toLowerCase().includes(searchLower)
      );
    }

    // Platform filter
    if (filters.platform !== 'all') {
      filtered = filtered.filter(integration => integration.platform === filters.platform);
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(integration => integration.status === filters.status);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number | undefined = a[filters.sortBy];
      let bValue: string | number | undefined = b[filters.sortBy];

      if (filters.sortBy === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      }

      // Handle undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return filters.sortOrder === 'asc' ? -1 : 1;
      if (bValue === undefined) return filters.sortOrder === 'asc' ? 1 : -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return filters.sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const createIntegration = async (integrationData: CreateIntegrationData, createdBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const newIntegration: PlatformIntegration = {
        id: `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...integrationData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy,
        isActive: true,
        lastSyncAt: undefined,
        lastErrorAt: undefined,
        lastErrorMessage: undefined
      };

      setIntegrations(prev => [...prev, newIntegration]);

      // Create audit log
      const auditLog: IntegrationAuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        integrationId: newIntegration.id,
        action: 'created',
        performedBy: createdBy,
        performedAt: new Date().toISOString(),
        details: {
          newValue: newIntegration.name
        }
      };

      setAuditLogs(prev => [...prev, auditLog]);

      return { success: true };
    } catch (err) {
      console.error('Error creating integration:', err);
      return { success: false, error: 'Failed to create integration' };
    }
  };

  const updateIntegration = async (id: string, integrationData: UpdateIntegrationData, updatedBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIntegrations(prev => prev.map(integration => {
        if (integration.id === id) {
          const updatedIntegration: PlatformIntegration = {
            ...integration,
            ...integrationData,
            updatedAt: new Date().toISOString(),
            configuration: {
              ...integration.configuration,
              ...(integrationData.configuration || {}),
              endpoints: {
                ...integration.configuration.endpoints,
                ...(integrationData.configuration?.endpoints || {})
              }
            }
          };

          // Create audit log
          const auditLog: IntegrationAuditLog = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            integrationId: id,
            action: 'updated',
            performedBy: updatedBy,
            performedAt: new Date().toISOString(),
            details: {
              field: Object.keys(integrationData)[0],
              oldValue: integration[Object.keys(integrationData)[0] as keyof PlatformIntegration] as string,
              newValue: Object.values(integrationData)[0] as string
            }
          };

          setAuditLogs(prev => [...prev, auditLog]);

          return updatedIntegration;
        }
        return integration;
      }));

      return { success: true };
    } catch (err) {
      console.error('Error updating integration:', err);
      return { success: false, error: 'Failed to update integration' };
    }
  };

  const deleteIntegration = async (id: string, deletedBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const integration = integrations.find(i => i.id === id);
      if (!integration) {
        return { success: false, error: 'Integration not found' };
      }

      setIntegrations(prev => prev.filter(integration => integration.id !== id));

      // Create audit log
      const auditLog: IntegrationAuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        integrationId: id,
        action: 'deleted',
        performedBy: deletedBy,
        performedAt: new Date().toISOString(),
        details: {
          oldValue: integration.name
        }
      };

      setAuditLogs(prev => [...prev, auditLog]);

      return { success: true };
    } catch (err) {
      console.error('Error deleting integration:', err);
      return { success: false, error: 'Failed to delete integration' };
    }
  };

  const deleteIntegrationByUser = async (platform: string, userEmail: string, deletedBy: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const integration = integrations.find(i => 
        i.platform === platform && i.createdBy === userEmail
      );
      
      if (!integration) {
        return { success: false, error: 'Integration not found' };
      }

      setIntegrations(prev => prev.filter(i => i.id !== integration.id));

      // Create audit log
      const auditLog: IntegrationAuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        integrationId: integration.id,
        action: 'deleted',
        performedBy: deletedBy,
        performedAt: new Date().toISOString(),
        details: {
          oldValue: integration.name
        }
      };

      setAuditLogs(prev => [...prev, auditLog]);

      return { success: true };
    } catch (err) {
      console.error('Error deleting integration by user:', err);
      return { success: false, error: 'Failed to delete integration' };
    }
  };

  const testConnection = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const integration = integrations.find(i => i.id === id);
      if (!integration) {
        return { success: false, error: 'Integration not found' };
      }

      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Randomly succeed or fail for demo
      const success = Math.random() > 0.3;

      if (success) {
        setIntegrations(prev => prev.map(i => 
          i.id === id 
            ? { ...i, status: 'active', lastSyncAt: new Date().toISOString() }
            : i
        ));
      } else {
        setIntegrations(prev => prev.map(i => 
          i.id === id 
            ? { 
                ...i, 
                status: 'error', 
                lastErrorAt: new Date().toISOString(),
                lastErrorMessage: 'Connection test failed: Invalid credentials'
              }
            : i
        ));
      }

      return { success, error: success ? undefined : 'Connection test failed' };
    } catch (err) {
      console.error('Error testing connection:', err);
      return { success: false, error: 'Failed to test connection' };
    }
  };

  const syncIntegration = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const integration = integrations.find(i => i.id === id);
      if (!integration) {
        return { success: false, error: 'Integration not found' };
      }

      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Randomly succeed or fail for demo
      const success = Math.random() > 0.2;

      if (success) {
        setIntegrations(prev => prev.map(i => 
          i.id === id 
            ? { ...i, status: 'active', lastSyncAt: new Date().toISOString() }
            : i
        ));

        // Create audit log
        const auditLog: IntegrationAuditLog = {
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          integrationId: id,
          action: 'sync_completed',
          performedBy: 'system',
          performedAt: new Date().toISOString(),
          details: {
            syncRecords: Math.floor(Math.random() * 100) + 1
          }
        };

        setAuditLogs(prev => [...prev, auditLog]);
      } else {
        setIntegrations(prev => prev.map(i => 
          i.id === id 
            ? { 
                ...i, 
                status: 'error', 
                lastErrorAt: new Date().toISOString(),
                lastErrorMessage: 'Sync failed: API rate limit exceeded'
              }
            : i
        ));

        // Create audit log
        const auditLog: IntegrationAuditLog = {
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          integrationId: id,
          action: 'sync_failed',
          performedBy: 'system',
          performedAt: new Date().toISOString(),
          details: {
            errorMessage: 'Sync failed: API rate limit exceeded'
          }
        };

        setAuditLogs(prev => [...prev, auditLog]);
      }

      return { success, error: success ? undefined : 'Sync failed' };
    } catch (err) {
      console.error('Error syncing integration:', err);
      return { success: false, error: 'Failed to sync integration' };
    }
  };

  const refreshIntegrations = () => {
    setIsLoading(true);
    try {
      const storedIntegrations = localStorage.getItem('platform_integrations');
      if (storedIntegrations) {
        setIntegrations(JSON.parse(storedIntegrations));
      }
    } catch (err) {
      console.error('Error refreshing integrations:', err);
      setError('Failed to refresh integrations');
    } finally {
      setIsLoading(false);
    }
  };

  const getAuditLogs = (integrationId: string): IntegrationAuditLog[] => {
    return auditLogs.filter(log => log.integrationId === integrationId);
  };

  const value: IntegrationManagementContextType = {
    integrations,
    auditLogs,
    platformTemplates,
    filters,
    isLoading,
    error,
    setFilters,
    getFilteredIntegrations,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    deleteIntegrationByUser,
    testConnection,
    syncIntegration,
    refreshIntegrations,
    getAuditLogs
  };

  return (
    <IntegrationManagementContext.Provider value={value}>
      {children}
    </IntegrationManagementContext.Provider>
  );
}

export function useIntegrationManagement() {
  const context = useContext(IntegrationManagementContext);
  if (context === undefined) {
    throw new Error('useIntegrationManagement must be used within an IntegrationManagementProvider');
  }
  return context;
}
