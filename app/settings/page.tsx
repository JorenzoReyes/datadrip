'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

// Connect Platforms Component
function ConnectPlatformsSection() {
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

  const handleConnect = async (platformId: string) => {
    setIsConnecting(platformId);
    setMessage(null);

    try {
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful connection
      setPlatforms(prev => prev.map(p => 
        p.id === platformId 
          ? { ...p, status: 'connected', lastSync: new Date().toISOString() }
          : p
      ));
      
      setMessage({ type: 'success', text: `Successfully connected to ${platforms.find(p => p.id === platformId)?.name}!` });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Connection failed. Please try again.' });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async (platformId: string) => {
    try {
      // Simulate disconnection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPlatforms(prev => prev.map(p => 
        p.id === platformId 
          ? { ...p, status: 'not_connected', lastSync: null }
          : p
      ));
      
      setMessage({ type: 'success', text: `Successfully disconnected from ${platforms.find(p => p.id === platformId)?.name}!` });
      setTimeout(() => setMessage(null), 3000);
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
  companyName: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const { user, isLoading: authLoading, logout, updateUser } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'details' | 'platforms'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState<UserSettings>({
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        companyName: user.companyName || '',
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
    if (!formData.email.includes('@')) {
      return 'Please enter a valid email address';
    }
    if (formData.firstName.length < 2) {
      return 'First name must be at least 2 characters long';
    }
    if (formData.lastName.length < 2) {
      return 'Last name must be at least 2 characters long';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Update user data using the context function
      const success = await updateUser(formData);
      
      if (success) {
        setMessage({ type: 'success', text: 'Settings updated successfully!' });
        
        // Clear password fields after successful update
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update settings. Please try again.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update settings. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-header text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold font-title text-header">DataDrip</h1>
              <nav className="hidden md:flex space-x-6">
                <a href={user.role === 'admin' || user.role === 'system_admin' ? '/admin/dashboard' : '/dashboard'} className="text-subheader hover:text-header transition">Dashboard</a>
                <a href="/sales-inventory" className="text-subheader hover:text-header transition">Sales and Inventory</a>
                <a href="/insights" className="text-subheader hover:text-header transition">Insights</a>
              </nav>
              <span className="text-primary-500 font-bold">SETTINGS</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push((user.role === 'admin' || user.role === 'system_admin') ? '/admin/dashboard' : '/dashboard')}
                className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition"
              >
                ← Back to Dashboard
              </button>
              <span className="text-subheader">{user.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

                           <div className="flex justify-center">
          <div className="flex max-w-7xl w-full">
            {/* Left Sidebar */}
            <aside className="w-80 bg-white border-r border-gray-200 p-6 rounded-r-2xl">
              <div className="sticky top-6">
                <h3 className="text-lg font-semibold font-title text-header mb-4">Settings</h3>
                
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveSection('details')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      activeSection === 'details'
                        ? 'bg-primary-500 text-white'
                        : 'text-subheader hover:bg-gray-100 hover:text-header'
                    }`}
                  >
                    👤 User Details
                  </button>
                  
                  <button
                    onClick={() => setActiveSection('platforms')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      activeSection === 'platforms'
                        ? 'bg-primary-500 text-white'
                        : 'text-subheader hover:bg-gray-100 hover:text-header'
                    }`}
                  >
                    🔗 Connect Platforms
                  </button>
                </nav>

                {/* Additional Info */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-header mb-2">Need Help?</h4>
                  <p className="text-xs text-subheader">
                    Contact support if you need assistance with your account settings.
                  </p>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-4xl">
          <div className="mb-6">
            <h2 className="text-3xl font-bold font-title text-header">User Settings</h2>
            <p className="text-subheader mt-2">Manage your account settings and preferences</p>
          </div>

          {/* Content based on active section */}
          {activeSection === 'details' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-semibold font-title text-header mb-6">User Details</h3>
              
              {message && (
                <div className={`mb-4 rounded-lg p-3 ${
                  message.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  <p className="text-sm">{message.text}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-200 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Enter your first name"
                      required
                      className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-200 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Enter your last name"
                      required
                      className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email address"
                    required
                    className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Company Name */}
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-200 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="Enter your company name (optional)"
                    className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Password Change Section */}
                <div className="col-span-full border-t border-gray-700 pt-6 mt-6">
                  <h4 className="text-lg font-medium text-white mb-4">Change Password</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Current Password */}
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-200 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        placeholder="Enter current password"
                        className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* New Password */}
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-200 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        placeholder="Enter new password"
                        className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm new password"
                        className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Leave password fields empty if you don&apos;t want to change your password.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full md:w-auto px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Updating...' : 'Update Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeSection === 'platforms' && (
            <ConnectPlatformsSection />
          )}
                   </main>

           
       </div>
     </div>
   </div>
 );
 }
