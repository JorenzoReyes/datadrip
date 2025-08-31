'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'user' | 'admin';
  acceptTerms: boolean;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegistrationData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    acceptTerms: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = (): string | null => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
      return 'All fields are required';
    }

    if (formData.firstName.length < 2) {
      return 'First name must be at least 2 characters long';
    }

    if (formData.lastName.length < 2) {
      return 'Last name must be at least 2 characters long';
    }

    if (!formData.email.includes('@')) {
      return 'Please enter a valid email address';
    }

    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    if (!formData.acceptTerms) {
      return 'You must accept the Privacy Policy and Terms & Conditions';
    }

    if (formData.role === 'admin') {
      // Simple admin code validation (you can change this)
      const adminCode = prompt('Enter admin registration code:');
      if (adminCode !== 'ADMIN2024') {
        return 'Invalid admin registration code';
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setIsLoading(false);
      return;
    }

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get existing users from localStorage
      const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      
      // Check if email already exists
      if (existingUsers.find((user: any) => user.email === formData.email)) {
        setError('User with this email already exists');
        setIsLoading(false);
        return;
      }

      // Create new user
      const newUser = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password, // In real app, this would be hashed
        role: formData.role,
        acceptTerms: formData.acceptTerms,
        createdAt: new Date().toISOString()
      };

      // Add to existing users
      existingUsers.push(newUser);
      localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));

      setSuccess(true);
      setError('');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error) {
      setError('An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 via-black to-purple-900">
        <div className="w-full max-w-lg rounded-2xl bg-black/40 p-6 shadow-xl backdrop-blur-md text-center">
          <div className="text-green-400 text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">Registration Successful!</h1>
          <p className="text-gray-300 mb-4">
            Your account has been created successfully. You will be redirected to the login page shortly.
          </p>
          <div className="text-sm text-gray-400">
            Redirecting to login in 2 seconds...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 via-black to-purple-900">
      <div className="w-full max-w-lg rounded-2xl bg-black/40 p-6 shadow-xl backdrop-blur-md">
        <h1 className="text-center text-4xl font-extrabold text-white">DataDrip</h1>
        <p className="mt-2 text-center text-gray-400">Create your account</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-200">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="Enter your first name"
              required
              className="mt-2 w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-200">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Enter your last name"
              required
              className="mt-2 w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-200">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              required
              className="mt-2 w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-200">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              className="mt-2 w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-400">Must be at least 6 characters</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm your password"
              required
              className="mt-2 w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-200">
              Account Type
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="mt-2 w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-2 text-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
            >
              <option value="user">User Account</option>
              <option value="admin">Admin Account</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Admin accounts require a registration code
            </p>
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="acceptTerms"
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 rounded border-gray-700 bg-black/40 text-purple-600 focus:ring-purple-500 focus:ring-2"
            />
            <label htmlFor="acceptTerms" className="text-sm text-gray-300">
              I agree to the{' '}
              <Link href="/privacy-policy" className="text-purple-400 hover:text-purple-300 underline">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link href="/terms-conditions" className="text-purple-400 hover:text-purple-300 underline">
                Terms & Conditions
              </Link>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-500/30 p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-purple-700 px-4 py-2 font-medium text-white transition hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Login link */}
          <p className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/" className="font-medium text-purple-400 hover:text-purple-300">
              Log in.
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
