'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RegistrationData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'user' | 'admin';
  acceptTerms: boolean;
}

interface RegisteredUser {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  acceptTerms: boolean;
  createdAt: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegistrationData>({
    firstName: '',
    lastName: '',
    username: '',
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
    if (!formData.firstName || !formData.lastName || !formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      return 'All fields are required';
    }

    if (formData.firstName.length < 2) {
      return 'First name must be at least 2 characters long';
    }

    if (formData.lastName.length < 2) {
      return 'Last name must be at least 2 characters long';
    }

    // Username validation
    if (formData.username.length < 3) {
      return 'Username must be at least 3 characters long';
    }

    if (formData.username.length > 30) {
      return 'Username must be no more than 30 characters long';
    }


    // Check for allowed characters (letters, numbers, underscores, dots, hyphens)
    if (!/^[a-zA-Z0-9._-]+$/.test(formData.username)) {
      return 'Username can only contain letters, numbers, underscores, dots, and hyphens';
    }

    // Check for reserved words
    const reservedWords = ['admin', 'root', 'support', 'system', 'user', 'guest', 'test', 'demo', 'api', 'www', 'mail', 'ftp', 'localhost'];
    if (reservedWords.includes(formData.username.toLowerCase())) {
      return 'This username is reserved and cannot be used';
    }

    // Check for offensive patterns (basic check)
    const offensivePatterns = ['fuck', 'shit', 'damn', 'bitch', 'ass', 'hell'];
    if (offensivePatterns.some(pattern => formData.username.toLowerCase().includes(pattern))) {
      return 'Username contains inappropriate content';
    }

    if (!formData.email.includes('@')) {
      return 'Please enter a valid email address';
    }

    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(formData.password)) {
      return 'Password must contain at least one uppercase letter';
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(formData.password)) {
      return 'Password must contain at least one lowercase letter';
    }

    // Check for special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
      return 'Password must contain at least one special character';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    if (!formData.acceptTerms) {
      return 'You must accept the Privacy Policy and Terms & Conditions';
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
      if (existingUsers.find((user: RegisteredUser) => user.email === formData.email)) {
        setError('User with this email already exists');
        setIsLoading(false);
        return;
      }

      // Check if username already exists (case-insensitive)
      if (existingUsers.find((user: RegisteredUser) => user.username.toLowerCase() === formData.username.toLowerCase())) {
        setError('Username is already taken');
        setIsLoading(false);
        return;
      }

      // Create new user
      const newUser = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
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

    } catch {
      setError('An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
          <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-200 text-center">
        <div className="text-primary-500 text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold font-title text-header mb-2">Registration Successful!</h1>
        <p className="text-subheader mb-4">
          Your account has been created successfully. You will be redirected to the login page shortly.
        </p>
        <div className="text-sm text-gray-500">
          Redirecting to login in 2 seconds...
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
        <h1 className="text-center text-4xl font-extrabold font-title text-header">DataDrip</h1>
        <p className="mt-2 text-center text-subheader">Create your account</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-subheader">
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
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-subheader">
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
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-subheader">
              Username *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Choose a username"
              required
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
            <p className="mt-1 text-xs text-gray-400">
              Must have 3-30 characters 
            </p>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-subheader">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              required
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-subheader">
              Password *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
            <p className="mt-1 text-xs text-gray-400">
              Must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 special character
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-subheader">
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm your password"
              required
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-subheader">
              Account Type *            
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            >
              <option value="user">User Account</option>
              <option value="admin">Admin Account</option>
              <option value="system_admin">System Administrator Account</option>
            </select>
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="acceptTerms"
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleInputChange}
              className="mt-1 h-4 w-4 rounded border-gray-300 bg-white text-primary-500 focus:ring-primary-200 focus:ring-2"
            />
            <label htmlFor="acceptTerms" className="text-sm text-subheader">
              I agree to the{' '}
                             <Link href="/privacy-policy" className="text-primary-600 hover:text-primary-700 underline">
                Privacy Policy
              </Link>{' '}
              and{' '}
                             <Link href="/terms-conditions" className="text-primary-600 hover:text-primary-700 underline">
                Terms & Conditions
              </Link>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={isLoading}
                           className="w-full rounded-lg bg-primary-500 px-4 py-2 font-medium text-white transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Login link */}
          <p className="text-center text-sm text-subheader">
            Already have an account?{" "}
                         <Link href="/" className="font-medium text-primary-600 hover:text-primary-700">
              Log in.
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
