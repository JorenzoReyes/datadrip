'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/auth';
import { useIntegrationManagement } from '../contexts/integrations';

// Connect Platforms Component
function ConnectPlatformsSection() {
  const { user } = useAuth();
  const { integrations, createIntegration, deleteIntegrationByUser, platformTemplates } = useIntegrationManagement();
  const searchParams = useSearchParams();
  
  const [platforms, setPlatforms] = useState<Array<{
    id: string;
    name: string;
    icon: string;
    status: 'connected' | 'not_connected' | 'pending';
    lastSync: string | null;
    description: string;
  }>>([
    {
      id: 'shopee',
      name: 'Shopee',
      icon: '🛍️',
      status: 'not_connected',
      lastSync: null,
      description: 'Southeast Asia\'s leading e-commerce platform'
    },
    {
      id: 'lazada',
      name: 'Lazada',
      icon: '📦',
      status: 'not_connected',
      lastSync: null,
      description: 'Alibaba Group\'s flagship e-commerce platform'
    },
    {
      id: 'tiktok',
      name: 'TikTok Shop',
      icon: '🎵',
      status: 'not_connected',
      lastSync: null,
      description: 'Social commerce platform with integrated shopping'
    },
  ]);

  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle OAuth callback
  useEffect(() => {
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const oauthError = searchParams.get('oauth_error');
    const oauthMessage = searchParams.get('message');

    if (platform && status === 'success' && oauthMessage) {
      // OAuth success - create integration
      handleOAuthSuccess(platform, oauthMessage);
    } else if (oauthError) {
      // OAuth error
      setMessage({ 
        type: 'error', 
        text: `OAuth authentication failed: ${decodeURIComponent(oauthError)}` 
      });
      setTimeout(() => setMessage(null), 5000);
    }
  }, [searchParams]);

  // Handle OAuth success
  const handleOAuthSuccess = async (platform: string, successMessage: string) => {
    if (!user) return;

    try {
      // Find the platform template
      const template = platformTemplates.find(t => t.platform === platform);
      if (!template) {
        throw new Error('Platform template not found');
      }

      // Create integration in admin system
      const userId = user.email.replace('@', '_').replace('.', '_');
      const integrationData = {
        platform: template.platform as 'shopee' | 'lazada' | 'tiktok' | 'custom',
        name: `${template.name} Integration - ${user.fname || 'User'} ${user.lname || ''}`,
        accessToken: `oauth_token_${userId}_${platform}_${Date.now()}`, // OAuth access token
        refreshToken: `oauth_refresh_${userId}_${platform}_${Date.now()}`, // OAuth refresh token
        webhookUrl: '',
        syncFrequency: 'daily' as const,
        configuration: { ...template.defaultConfiguration }
      };

      const result = await createIntegration(integrationData, user.email);
      
      if (result.success) {
        // Link OAuth integration to existing demo data
        await linkOAuthToDemoData(user.email, platform);
        
        // Update local platform status
        setPlatforms(prev => prev.map(p => 
          p.id === platform 
            ? { ...p, status: 'connected', lastSync: new Date().toISOString() }
            : p
        ));
        
        setMessage({ type: 'success', text: `${successMessage} Demo data has been linked and will appear in your dashboard.` });
        setTimeout(() => setMessage(null), 5000);
      } else {
        throw new Error(result.error || 'Failed to create integration');
      }
    } catch (err) {
      console.error('OAuth success handling error:', err);
      setMessage({ type: 'error', text: 'Failed to complete OAuth integration. Please try again.' });
    }
  };

  // Link OAuth integration to existing demo data
  const linkOAuthToDemoData = async (userEmail: string, platform: string) => {
    try {
      // Map demo users to their business data
      const demoUserMapping = {
        'user@example.com': 'electronics.owner@example.com', // Main demo user gets electronics data
        'admin@example.com': 'cosmetics.owner@example.com',  // Admin gets cosmetics data
        'system.admin@example.com': 'food.owner@example.com' // System admin gets food data
      };

      const businessOwnerEmail = demoUserMapping[userEmail as keyof typeof demoUserMapping] || 'electronics.owner@example.com';
      
      // Trigger data sync by calling the sync API
      const syncResponse = await fetch('/api/admin/sync-sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: platform,
          userId: userEmail,
          businessOwnerEmail: businessOwnerEmail,
          forceSync: true
        })
      });

      if (syncResponse.ok) {
        console.log(`✅ Linked OAuth integration to demo data for ${platform}`);
      } else {
        console.warn(`⚠️ Could not sync demo data for ${platform}, but OAuth connection succeeded`);
      }
    } catch (error) {
      console.error('Error linking OAuth to demo data:', error);
      // Don't throw - OAuth connection should still succeed even if demo linking fails
    }
  };

  // Sync platform status with existing integrations
  useEffect(() => {
    if (integrations.length > 0) {
      setPlatforms(prev => prev.map(platform => {
        const existingIntegration = integrations.find(integration => 
          integration.platform === platform.id && integration.createdBy === user?.email
        );
        
        if (existingIntegration) {
          return {
            ...platform,
            status: existingIntegration.status === 'active' ? 'connected' : 'pending',
            lastSync: existingIntegration.lastSyncAt || null
          };
        }
        
        return platform;
      }));
    }
  }, [integrations, user?.email]);

  const handleConnect = async (platformId: string) => {
    if (!user) return;
    
    // Type assertion since we've checked user is not null
    const currentUser = user;
    
    setIsConnecting(platformId);
    setMessage(null);

    try {
      // Find the platform template
      const template = platformTemplates.find(t => t.platform === platformId);
      if (!template) {
        throw new Error('Platform template not found');
      }

      // Check if platform uses OAuth
      if (template.authType === 'oauth2') {
        // Initiate OAuth flow
        const response = await fetch('/api/oauth/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: platformId,
            userId: currentUser.email
          })
        });

        const result = await response.json();
        
        if (result.success && result.authUrl) {
          // Redirect to OAuth provider
          window.location.href = result.authUrl;
          return; // Don't set isConnecting to null as we're redirecting
        } else {
          throw new Error(result.error || 'Failed to initiate OAuth flow');
        }
      } else {
        // For API key based platforms, use the existing flow
        // Simulate connection process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create integration in admin system
        const userId = currentUser.email.replace('@', '_').replace('.', '_');
        const integrationData = {
          platform: template.platform as 'shopee' | 'lazada' | 'tiktok' | 'custom',
          name: `${template.name} Integration - ${currentUser.fname || 'User'} ${currentUser.lname || ''}`,
          apiKey: `user_${userId}_${platformId}_${Date.now()}`, // Simulated API key
          apiSecret: `secret_${userId}_${platformId}_${Date.now()}`, // Simulated API secret
          webhookUrl: '',
          syncFrequency: 'daily' as const,
          configuration: { ...template.defaultConfiguration }
        };

        const result = await createIntegration(integrationData, currentUser.email);
        
        if (result.success) {
          // Update local platform status
          setPlatforms(prev => prev.map(p => 
            p.id === platformId 
              ? { ...p, status: 'connected', lastSync: new Date().toISOString() }
              : p
          ));
          
          setMessage({ type: 'success', text: `Successfully connected to ${platforms.find(p => p.id === platformId)?.name}! Integration has been added to admin management.` });
          setTimeout(() => setMessage(null), 5000);
        } else {
          throw new Error(result.error || 'Failed to create integration');
        }
      }
    } catch (err) {
      console.error('Connection error:', err);
      setMessage({ type: 'error', text: 'Connection failed. Please try again.' });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async (platformId: string) => {
    if (!user) return;
    
    try {
      // Remove integration from admin system
      const result = await deleteIntegrationByUser(platformId, user.email, user.email);
      
      if (!result.success) {
        console.warn('Failed to delete integration from admin system:', result.error);
        // Continue with local disconnection even if admin deletion fails
      }
      
      // Simulate disconnection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPlatforms(prev => prev.map(p => 
        p.id === platformId 
          ? { ...p, status: 'not_connected', lastSync: null }
          : p
      ));
      
      setMessage({ type: 'success', text: `Successfully disconnected from ${platforms.find(p => p.id === platformId)?.name}! Integration has been removed from admin management.` });
      setTimeout(() => setMessage(null), 5000);
    } catch {
      setMessage({ type: 'error', text: 'Disconnection failed. Please try again.' });
    } finally {
      setShowDisconnectModal(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-900/30 text-green-300 border border-green-500/30">Connected</span>;
      case 'pending':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-900/30 text-yellow-300 border border-yellow-500/30">Pending</span>;
      case 'not_connected':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-900/30 text-gray-300 border border-gray-500/30">Not Connected</span>;
      default:
        return null;
    }
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    const date = new Date(lastSync);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Connect Platforms</h3>
        <p className="text-gray-400">Link your e-commerce platforms to enable automated data collection and analytics.</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`rounded-lg p-3 ${
          message.type === 'success' 
            ? 'bg-green-900/30 border border-green-500/30 text-green-200'
            : 'bg-red-900/30 border border-red-500/30 text-red-200'
        }`}>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Available Platforms */}
      <div className="bg-black/40 rounded-xl border border-purple-500/30 p-6">
        <h4 className="text-lg font-medium text-white mb-4">Available Platforms</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform) => (
            <div key={platform.id} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <h5 className="font-medium text-white">{platform.name}</h5>
                    <p className="text-sm text-gray-400">{platform.description}</p>
                    <div className="mt-2">
                      {getStatusBadge(platform.status)}
                    </div>
                    {platform.status === 'connected' && platform.lastSync && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last sync: {formatLastSync(platform.lastSync)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  {platform.status === 'not_connected' && (
                    <button
                      onClick={() => handleConnect(platform.id)}
                      disabled={isConnecting === platform.id}
                      className="px-3 py-1 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50"
                      title={platformTemplates.find(t => t.platform === platform.id)?.authType === 'oauth2' 
                        ? 'Click to authenticate with OAuth' 
                        : 'Click to connect with API keys'
                      }
                    >
                      {isConnecting === platform.id ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                  {platform.status === 'connected' && (
                    <button
                      onClick={() => setShowDisconnectModal(platform.id)}
                      className="px-3 py-1 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
                    >
                      Disconnect
                    </button>
                  )}
                  {platform.status === 'pending' && (
                    <button
                      disabled
                      className="px-3 py-1 text-sm rounded-lg bg-gray-600 text-gray-300 cursor-not-allowed"
                    >
                      Pending
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* Connection Status */}
      <div className="bg-black/40 rounded-xl border border-purple-500/30 p-6">
        <h4 className="text-lg font-medium text-white mb-4">Connection Status</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Total Platforms</span>
            <span className="text-white font-medium">{platforms.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Connected</span>
            <span className="text-green-400 font-medium">
              {platforms.filter(p => p.status === 'connected').length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Pending</span>
            <span className="text-yellow-400 font-medium">
              {platforms.filter(p => p.status === 'pending').length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Not Connected</span>
            <span className="text-gray-400 font-medium">
              {platforms.filter(p => p.status === 'not_connected').length}
            </span>
          </div>
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-white mb-4">Confirm Disconnection</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to disconnect from{' '}
              <span className="font-medium text-white">
                {platforms.find(p => p.id === showDisconnectModal)?.name}
              </span>?
              <br />
              <span className="text-sm text-gray-400">
                This will stop data synchronization and remove stored credentials.
              </span>
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDisconnectModal(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDisconnect(showDisconnectModal)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface UserSettings {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const { user, isLoading: authLoading, updateUser } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingUserDetails, setEditingUserDetails] = useState(false);
  const [editingSecurity, setEditingSecurity] = useState(false);
  const [activeSection, setActiveSection] = useState<'account' | 'platforms'>('account');
  
  const [formData, setFormData] = useState<UserSettings>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.fname || '',
        lastName: user.lname || '',
        email: user.email || '',
        username: user.username || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) {
      return 'First name is required';
    }
    if (!formData.lastName.trim()) {
      return 'Last name is required';
    }
    if (!formData.email.trim()) {
      return 'Email is required';
    }
    if (!formData.username.trim()) {
      return 'Username is required';
    }
    if (!formData.email.includes('@')) {
      return 'Please enter a valid email address';
    }
    if (formData.firstName.length < 2) {
      return 'First name must be at least 2 characters long';
    }
    if (formData.lastName.length < 2) {
      return 'Last name must be at least 2 characters long';
    }
    if (formData.username.length < 3) {
      return 'Username must be at least 3 characters long';
    }

    // Password validation (only if user wants to change password)
    if (formData.newPassword || formData.confirmPassword || formData.currentPassword) {
      if (!formData.currentPassword) {
        return 'Current password is required to change password';
      }
      if (!formData.newPassword) {
        return 'New password is required';
      }
      if (formData.newPassword.length < 6) {
        return 'New password must be at least 6 characters long';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        return 'New passwords do not match';
      }
    }

    return null;
  };

  const handleUserDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const userUpdateData = {
        fname: formData.firstName,
        lname: formData.lastName,
        email: formData.email,
        username: formData.username
      };
      const success = await updateUser(userUpdateData);
      
      if (success) {
        setMessage({ type: 'success', text: 'User details updated successfully!' });
        setEditingUserDetails(false);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update user details. Please try again.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update user details. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword || formData.confirmPassword || formData.currentPassword) {
      const validationError = validateForm();
      if (validationError) {
        setMessage({ type: 'error', text: validationError });
        return;
      }
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Handle password change logic here
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setEditingSecurity(false);
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to update password. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-900 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-900 text-xl">Please log in</div>
      </div>
    );
  }

  const roles = user.roles || (user.role ? [user.role] : []);
  const isAdmin = roles.includes('admin') || roles.includes('system_admin');
  const canView = !isAdmin;
  if (!canView) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-900 text-xl">Access denied (Settings)</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header active="settings" />
      
      <div className="flex max-w-7xl mx-auto">
        {/* Left Sidebar */}
        <aside className="w-80 bg-white rounded-xl border border-gray-200 p-6 mx-6 my-6 shadow-sm">
          <div className="sticky top-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Settings</h3>
            
            <nav className="space-y-3 mb-8">
              <button
                onClick={() => setActiveSection('account')}
                className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${
                  activeSection === 'account'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account Details
              </button>
              
              <button
                onClick={() => setActiveSection('platforms')}
                className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${
                  activeSection === 'platforms'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect Platforms
              </button>
            </nav>

            {/* Help Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Need Help?</h4>
              <p className="text-xs text-gray-600">
                Contact support if you need assistance with your account settings.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-6 py-8">
          {activeSection === 'account' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
                <p className="text-gray-600 mt-2">Please review and update your account information below</p>
              </div>

              {/* Message Display */}
              {message && (
                <div className={`mb-6 rounded-lg p-4 ${
                  message.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  <p className="text-sm">{message.text}</p>
                </div>
              )}

              {/* User Details Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  {editingUserDetails ? (
                    <button
                      onClick={() => setEditingUserDetails(false)}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingUserDetails(true)}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>

                {editingUserDetails ? (
                  <form onSubmit={handleUserDetailsSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditingUserDetails(false)}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-600">First Name</span>
                      </div>
                      <span className="text-gray-900 font-medium">{formData.firstName}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-600">Last Name</span>
                      </div>
                      <span className="text-gray-900 font-medium">{formData.lastName}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-600">Username</span>
                      </div>
                      <span className="text-gray-900 font-medium">{formData.username}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-600">Email Address</span>
                      </div>
                      <span className="text-gray-900 font-medium">{formData.email}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Security Settings Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                  {editingSecurity ? (
                    <button
                      onClick={() => setEditingSecurity(false)}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingSecurity(true)}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>

                {editingSecurity ? (
                  <form onSubmit={handleSecuritySubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter current password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter new password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Confirm new password"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditingSecurity(false)}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-gray-600">Current Password</span>
                      </div>
                      <span className="text-gray-400">Enter current password</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span className="text-gray-600">New Password</span>
                      </div>
                      <span className="text-gray-400">Enter new password</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-600">Confirm New Password</span>
                      </div>
                      <span className="text-gray-400">Confirm new password</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeSection === 'platforms' && (
            <ConnectPlatformsSection />
          )}

          {/* Version Indicator */}
          <div className="mt-8 text-right">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">v0.6.0</span>
          </div>
        </main>
      </div>
    </div>
  );
}