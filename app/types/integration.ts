export interface PlatformIntegration {
  id: string;
  platform: 'shopee' | 'lazada' | 'tiktok' | 'custom';
  name: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  webhookUrl?: string;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  lastSyncAt?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive: boolean;
  configuration: {
    baseUrl: string;
    version: string;
    endpoints: {
      auth: string;
      products: string;
      orders: string;
      inventory: string;
    };
  };
}

export interface CreateIntegrationData {
  platform: 'shopee' | 'lazada' | 'tiktok' | 'custom';
  name: string;
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  configuration: {
    baseUrl: string;
    version: string;
    endpoints: {
      auth: string;
      products: string;
      orders: string;
      inventory: string;
    };
  };
}

export interface UpdateIntegrationData {
  name?: string;
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
  syncFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  status?: 'active' | 'inactive' | 'error' | 'pending';
  configuration?: {
    baseUrl?: string;
    version?: string;
    endpoints?: {
      auth?: string;
      products?: string;
      orders?: string;
      inventory?: string;
    };
  };
}

export interface IntegrationAuditLog {
  id: string;
  integrationId: string;
  action: 'created' | 'updated' | 'deleted' | 'connected' | 'disconnected' | 'sync_started' | 'sync_completed' | 'sync_failed';
  performedBy: string;
  performedAt: string;
  details: {
    field?: string;
    oldValue?: string;
    newValue?: string;
    errorMessage?: string;
    syncRecords?: number;
  };
  ipAddress?: string;
  userAgent?: string;
}

export interface PlatformTemplate {
  platform: 'shopee' | 'lazada' | 'tiktok' | 'custom';
  name: string;
  description: string;
  icon: string;
  color: string;
  authType: 'oauth2' | 'api_key' | 'custom';
  requiredFields: string[];
  optionalFields: string[];
  defaultConfiguration: {
    baseUrl: string;
    version: string;
    endpoints: {
      auth: string;
      products: string;
      orders: string;
      inventory: string;
    };
  };
}

export interface IntegrationFilters {
  search: string;
  platform: string;
  status: string;
  sortBy: 'createdAt' | 'updatedAt' | 'name' | 'lastSyncAt';
  sortOrder: 'asc' | 'desc';
}
