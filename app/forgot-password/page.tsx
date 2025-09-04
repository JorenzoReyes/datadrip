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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 via-black to-purple-900">
        <div className="w-full max-w-lg rounded-2xl bg-black/40 p-6 shadow-xl backdrop-blur-md text-center">
          <div className="text-green-400 text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">Reset Link Sent!</h1>
          <p className="text-gray-300 mb-4">
            We've sent a password reset link to <strong className="text-purple-400">{email}</strong>
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Please check your email and follow the instructions to reset your password.
          </p>
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full rounded-lg bg-purple-700 px-4 py-2 font-medium text-white transition hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Back to Login
            </Link>
            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="block w-full rounded-lg border border-gray-700 bg-transparent px-4 py-2 font-medium text-gray-300 transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Try Different Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 via-black to-purple-900">
      <div className="w-full max-w-lg rounded-2xl bg-black/40 p-6 shadow-xl backdrop-blur-md">
        <h1 className="text-center text-4xl font-extrabold text-white">DataDrip</h1>
        <p className="mt-2 text-center text-gray-400">Reset your password</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-200">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="mt-2 w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Enter the email address associated with your account
            </p>
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
            {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
          </button>

          {/* Back to login link */}
          <p className="text-center text-sm text-gray-400">
            Remember your password?{" "}
            <Link href="/" className="font-medium text-purple-400 hover:text-purple-300">
              Back to login.
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
