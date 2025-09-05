'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Basic email validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if email exists in registered users
      const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const userExists = existingUsers.find((user: any) => user.email === email);

      if (userExists) {
        setSuccess(true);
        setError('');
      } else {
        setError('No account found with this email address');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-200 text-center">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold font-title text-header mb-2">Reset Link Sent!</h1>
          <p className="text-subheader mb-4">
            We've sent a password reset link to <strong className="text-primary-600">{email}</strong>
          </p>
          <p className="text-sm text-subheader mb-6">
            Please check your email and follow the instructions to reset your password.
          </p>
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full rounded-lg bg-primary-500 px-4 py-2 font-medium text-white transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              Back to Login
            </Link>
            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="block w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 font-medium text-subheader transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              Try Different Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
        <h1 className="text-center text-4xl font-extrabold font-title text-header">DataDrip</h1>
        <p className="mt-2 text-center text-subheader">Reset your password</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-subheader">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
            <p className="mt-1 text-xs text-subheader">
              Enter the email address associated with your account
            </p>
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
            {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
          </button>

          {/* Back to login link */}
          <p className="text-center text-sm text-subheader">
            Remember your password?{" "}
            <Link href="/" className="font-medium text-primary-600 hover:text-primary-700">
              Back to login.
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
