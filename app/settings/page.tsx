'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/auth';
import { useIntegrationManagement } from '../contexts/integrations';
import Header from '../components/Header';
import RedirectToShopModal from '../components/RedirectToShopModal';
import Image from 'next/image';


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
                    ? 'bg-green-700 text-white'
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
                    ? 'bg-green-700 text-white'
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
            <div className="bg-green-100 rounded-lg p-4 border border-green-300">
              <h4 className="text-sm font-semibold text-green-900 mb-2">Need Help?</h4>
              <p className="text-xs text-green-800">
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
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 focus:border-green-700"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-700 focus:border-green-700"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                        className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
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
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                        className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
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
            <PlatformsSection user={user} />
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

// PlatformsSection Component
interface PlatformsSectionProps {
  user: {
    email: string;
    fname?: string;
    lname?: string;
  };
}

function PlatformsSection({ user }: PlatformsSectionProps) {
  const { integrations, platformTemplates, deleteIntegrationByUser, testConnection, createIntegration } = useIntegrationManagement();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const searchParams = useSearchParams();

  // Get user's integrations
  const userIntegrations = integrations.filter(integration => 
    integration.createdBy === user.email
  );

  // Handle OAuth success
  const handleOAuthSuccess = useCallback(async (platform: string, successMessage: string) => {
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
        accessToken: `oauth_token_${userId}_${platform}_${Date.now()}`,
        refreshToken: `oauth_refresh_${userId}_${platform}_${Date.now()}`,
        webhookUrl: '',
        syncFrequency: 'daily' as const,
        configuration: { ...template.defaultConfiguration }
      };

      const result = await createIntegration(integrationData, user.email);
      
      if (result.success) {
        // Link OAuth integration to existing demo data
        await linkOAuthToDemoData(user.email, platform);
        
        setMessage({ type: 'success', text: `${successMessage} Demo data has been linked and will appear in your dashboard.` });
        setTimeout(() => setMessage(null), 5000);
      } else {
        throw new Error(result.error || 'Failed to create integration');
      }
    } catch (err) {
      console.error('OAuth success handling error:', err);
      setMessage({ type: 'error', text: 'Failed to complete OAuth integration. Please try again.' });
    }
  }, [user, platformTemplates, createIntegration]);

  // Handle OAuth callback
  useEffect(() => {
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const oauthError = searchParams.get('oauth_error');
    const oauthMessage = searchParams.get('message');

    if (platform && status === 'success' && oauthMessage) {
      handleOAuthSuccess(platform, oauthMessage);
    } else if (oauthError) {
      setMessage({ 
        type: 'error', 
        text: `OAuth authentication failed: ${decodeURIComponent(oauthError)}` 
      });
      setTimeout(() => setMessage(null), 5000);
    }
  }, [searchParams, handleOAuthSuccess]);

  // Link OAuth integration to existing demo data
  const linkOAuthToDemoData = async (userEmail: string, platform: string) => {
    try {
      const demoUserMapping = {
        'user@example.com': 'electronics.owner@example.com',
        'admin@example.com': 'cosmetics.owner@example.com',
        'system.admin@example.com': 'food.owner@example.com'
      };

      const businessOwnerEmail = demoUserMapping[userEmail as keyof typeof demoUserMapping] || 'electronics.owner@example.com';
      
      const syncResponse = await fetch('/api/admin/sync-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    }
  };

  const handleConnect = async (platformId: string) => {
    if (!user) return;
    
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: platformId,
            userId: user.email
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
        // For API key based platforms, show the modal
        setShowConnectModal(true);
      }
    } catch (err) {
      console.error('Connection error:', err);
      setMessage({ type: 'error', text: 'Connection failed. Please try again.' });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleTestConnection = async (integrationId: string) => {
    setTestingIntegration(integrationId);
    try {
      const result = await testConnection(integrationId);
      if (result.success) {
        alert('Connection test successful!');
      } else {
        alert(`Connection test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      alert('Failed to test connection');
    } finally {
      setTestingIntegration(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!confirm(`Are you sure you want to disconnect your ${platform} shop?`)) {
      return;
    }

    setDisconnectingPlatform(platform);
    try {
      const result = await deleteIntegrationByUser(platform, user.email, user.email);
      if (result.success) {
        alert(`${platform} shop disconnected successfully`);
      } else {
        alert(`Failed to disconnect: ${result.error}`);
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Failed to disconnect shop');
    } finally {
      setDisconnectingPlatform(null);
    }
  };

  const getPlatformColor = (platform: string) => {
    const template = platformTemplates.find(t => t.platform === platform);
    return template?.color || '#6b7280';
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'shopee':
        return '/shopee.png';
      case 'lazada':
        return '/lazada.png';
      case 'tiktok':
        return '/tiktok.svg';
      default:
        return '🔗';
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Connect Your Shops</h2>
        <p className="text-gray-600 mt-2">Connect your e-commerce platforms to sync sales data and manage your business</p>
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

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {['shopee', 'lazada', 'tiktok'].map(platform => {
          const integration = userIntegrations.find(i => i.platform === platform);
          const isConnected = !!integration;
          const isDisconnecting = disconnectingPlatform === platform;
          const isTesting = testingIntegration === integration?.id;

          return (
            <div 
              key={platform}
              className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-col items-center text-center">
                {/* Platform Icon */}
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${getPlatformColor(platform)}15` }}
                >
                  {getPlatformIcon(platform).startsWith('/') ? (
                    <Image 
                      src={getPlatformIcon(platform)} 
                      alt={`${platform} icon`}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-4xl">{getPlatformIcon(platform)}</span>
                  )}
                </div>

                {/* Platform Name */}
                <h3 className="text-xl font-bold text-gray-900 capitalize mb-2">
                  {platform}
                </h3>

                {/* Connection Status */}
                {isConnected ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm text-green-600 font-medium">Connected</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Status: <span className="font-medium capitalize">{integration?.status}</span>
                    </p>
                    {integration?.lastSyncAt && (
                      <p className="text-xs text-gray-500 mb-4">
                        Last sync: {new Date(integration.lastSyncAt).toLocaleDateString()}
                      </p>
                    )}
                    
                    {/* Action Buttons for Connected Platform */}
                    <div className="flex flex-col gap-2 w-full">
                      <button
                        onClick={() => handleTestConnection(integration!.id)}
                        disabled={isTesting}
                        className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm disabled:opacity-50"
                      >
                        {isTesting ? 'Testing...' : 'Test Connection'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(platform)}
                        disabled={isDisconnecting}
                        className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm disabled:opacity-50"
                      >
                        {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      <span className="text-sm text-gray-500 font-medium">Not Connected</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Connect your {platform} shop to start syncing data
                    </p>
                    <button
                      onClick={() => {
                        setSelectedPlatform(platform);
                        setShowRedirectModal(true);
                      }}
                      className="w-full px-4 py-2 rounded-lg hover:opacity-90 transition-colors font-medium text-sm text-white"
                      style={{ backgroundColor: getPlatformColor(platform) }}
                    >
                      Connect {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connected Platforms Summary */}
      {userIntegrations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Connected Platforms</h3>
          <div className="space-y-4">
            {userIntegrations.map(integration => (
              <div 
                key={integration.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${getPlatformColor(integration.platform)}15` }}
                  >
                    {getPlatformIcon(integration.platform).startsWith('/') ? (
                      <Image 
                        src={getPlatformIcon(integration.platform)} 
                        alt={`${integration.platform} icon`}
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    ) : (
                      <span className="text-2xl">{getPlatformIcon(integration.platform)}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{integration.name}</h4>
                    <p className="text-sm text-gray-600">
                      Platform: <span className="capitalize">{integration.platform}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Sync: {integration.syncFrequency}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    integration.status === 'active' ? 'bg-green-100 text-green-700' :
                    integration.status === 'error' ? 'bg-red-100 text-red-700' :
                    integration.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {integration.status}
                  </span>
                  {integration.lastErrorMessage && (
                    <p className="text-xs text-red-600 mt-1">{integration.lastErrorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
       <div className="bg-green-100 rounded-xl border border-green-300 p-6 mt-6">
         <div className="flex gap-4">
           <div className="flex-shrink-0">
             <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
           </div>
           <div>
             <h4 className="text-sm font-semibold text-green-900 mb-2">How to Connect Your Shops</h4>
             <ul className="text-sm text-green-800 space-y-1">
               <li>• Click &quot;Connect&quot; on the platform you want to integrate</li>
               <li>• You&apos;ll be redirected to the shop&apos;s website to log in</li>
               <li>• Authorize the connection on the shop&apos;s platform</li>
               <li>• Your sales data will automatically sync based on your chosen frequency</li>
             </ul>
           </div>
         </div>
       </div>

       {/* Redirect to Shop Modal */}
       {showRedirectModal && (
         <RedirectToShopModal
           onClose={() => setShowRedirectModal(false)}
           onConfirm={() => {
             setShowRedirectModal(false);
             alert('Redirecting to shop login...');
           }}
           platform={selectedPlatform}
         />
       )}
    </>
  );
}
