'use client';
import { useState } from 'react';
import { useAuth } from '../contexts/auth';
import { useUserManagement } from '../contexts/users';
import { User, UpdateUserData } from '../types/user';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditUserModal({ user, onClose, onSuccess }: EditUserModalProps) {
  const { user: currentUser } = useAuth();
  const { updateUser } = useUserManagement();
  
  const [formData, setFormData] = useState<UpdateUserData>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.firstName?.trim()) {
      return 'First name is required';
    }
    if (!formData.lastName?.trim()) {
      return 'Last name is required';
    }
    if (!formData.username?.trim()) {
      return 'Username is required';
    }
    if (!formData.email?.trim()) {
      return 'Email is required';
    }
    if (!formData.email?.includes('@')) {
      return 'Please enter a valid email address';
    }
    if (formData.firstName.length < 2) {
      return 'First name must be at least 2 characters long';
    }
    if (formData.lastName.length < 2) {
      return 'Last name must be at least 2 characters long';
    }
    if (formData.username && formData.username.length < 3) {
      return 'Username must be at least 3 characters long';
    }
    if (formData.username && formData.username.length > 30) {
      return 'Username must be no more than 30 characters long';
    }
    if (formData.username && !/^[a-zA-Z0-9._-]+$/.test(formData.username)) {
      return 'Username can only contain letters, numbers, underscores, dots, and hyphens';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!currentUser) {
      setError('You must be logged in to update users');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await updateUser(user.id, formData, currentUser.email);
      
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to update user');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = () => {
    return (
      formData.firstName !== user.firstName ||
      formData.lastName !== user.lastName ||
      formData.username !== user.username ||
      formData.email !== user.email ||
      formData.role !== user.role ||
      formData.status !== user.status
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-border w-full max-w-md shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold font-title text-header">Edit User</h3>
            <button
              onClick={onClose}
              className="text-subheader hover:text-header transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-border">
            <div className="text-sm text-subheader">Editing user:</div>
            <div className="text-header font-medium">{user.firstName} {user.lastName}</div>
            <div className="text-sm text-subheader">{user.email}</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-subheader mb-1">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName || ''}
                onChange={handleInputChange}
                placeholder="Enter first name"
                required
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-header placeholder-subheader focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-subheader mb-1">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName || ''}
                onChange={handleInputChange}
                placeholder="Enter last name"
                required
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-header placeholder-subheader focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-subheader mb-1">
                Username *
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username || ''}
                onChange={handleInputChange}
                placeholder="Enter username"
                required
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-header placeholder-subheader focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
              <p className="mt-1 text-xs text-subheader">
                Must be 3-30 characters, letters, numbers, underscores, dots, and hyphens only
              </p>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-subheader mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                placeholder="Enter email address"
                required
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-header placeholder-subheader focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              />
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-subheader mb-1">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role || 'user'}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-header focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="system_admin">System Administrator</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-subheader mb-1">
                Status *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status || 'active'}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-header focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-subheader hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !hasChanges()}
                className="flex-1 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
