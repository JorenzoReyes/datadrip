'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 via-black to-purple-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-black to-purple-900">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">DataDrip</h1>
              <span className="text-blue-400 font-bold">SETTINGS</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(user.role === 'admin' ? '/admin/dashboard' : '/dashboard')}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition"
              >
                ← Back to Dashboard
              </button>
              <span className="text-gray-300">{user.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Main Content */}
        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white">User Settings</h2>
            <p className="text-gray-400 mt-2">Manage your account settings and preferences</p>
          </div>

          {/* Content based on active section */}
          {activeSection === 'details' && (
            <div className="bg-black/40 rounded-xl border border-purple-500/30 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">User Details</h3>
              
              {message && (
                <div className={`mb-4 rounded-lg p-3 ${
                  message.type === 'success' 
                    ? 'bg-green-900/30 border border-green-500/30 text-green-200'
                    : 'bg-red-900/30 border border-red-500/30 text-red-200'
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
            <div className="bg-black/40 rounded-xl border border-purple-500/30 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Connect Platforms</h3>
              <p className="text-gray-400">Platform connection features will be implemented here.</p>
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 bg-black/40 border-l border-purple-500/30 p-6">
          <div className="sticky top-6">
            <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>
            
            <nav className="space-y-2">
              <button
                onClick={() => setActiveSection('details')}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${
                  activeSection === 'details'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                }`}
              >
                👤 User Details
              </button>
              
              <button
                onClick={() => setActiveSection('platforms')}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${
                  activeSection === 'platforms'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                }`}
              >
                🔗 Connect Platforms
              </button>
            </nav>

            {/* Additional Info */}
            <div className="mt-8 p-4 bg-gray-800/30 rounded-lg">
              <h4 className="text-sm font-medium text-gray-200 mb-2">Need Help?</h4>
              <p className="text-xs text-gray-400">
                Contact support if you need assistance with your account settings.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
