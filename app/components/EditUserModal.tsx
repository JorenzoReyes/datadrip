'use client';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserManagement } from '../contexts/UserManagementContext';
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
    companyName: user.companyName || '',
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
      formData.email !== user.email ||
      formData.companyName !== (user.companyName || '') ||
      formData.role !== user.role ||
      formData.status !== user.status
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-purple-500/30 w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Edit User</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Info */}
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
            <div className="text-sm text-gray-400">Editing user:</div>
            <div className="text-white font-medium">{user.firstName} {user.lastName}</div>
            <div className="text-sm text-gray-300">{user.email}</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-200 mb-1">
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
                value={formData.lastName || ''}
                onChange={handleInputChange}
                placeholder="Enter last name"
                required
                className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              />
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
                value={formData.email || ''}
                onChange={handleInputChange}
                placeholder="Enter email address"
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
                value={formData.companyName || ''}
                onChange={handleInputChange}
                placeholder="Enter company name (optional)"
                className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-200 mb-1">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role || 'user'}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-200 mb-1">
                Status *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status || 'active'}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-900/30 border border-red-500/30 p-3">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !hasChanges()}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
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
