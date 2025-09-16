'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from './contexts/AuthContext';

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    try {
      const success = await login(emailOrUsername, password);
      if (success) {
        // Redirect based on user role
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          if (user.role === 'admin' || user.role === 'system_admin') {
            router.push('/admin/manage-users');
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        setLoginError('Invalid email/username or password');
      }
    } catch {
      setLoginError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
        <h1 className="text-center text-4xl font-extrabold font-title text-header">DataDrip</h1>
        <p className="mt-2 text-center text-subheader">Log in to your account</p>

        {/* Demo Credentials Info */}
        <div className="mt-4 rounded-lg bg-primary-50 p-4 border border-primary-200">
          <p className="text-sm text-primary-700 font-medium mb-2">Demo Credentials:</p>
          <div className="text-xs text-primary-600 space-y-1">
            <div><strong>User:</strong> user@example.com or demo_user / password123</div>
            <div><strong>Admin:</strong> admin@example.com or demo_admin / admin123</div>
            <div><strong>System Admin:</strong> system.admin@example.com or demo_system_admin / system123</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* Email or Username */}
          <div>
            <label htmlFor="emailOrUsername" className="block text-sm font-medium text-subheader">
              Email or Username *
            </label>
            <input
              type="text"
              id="emailOrUsername"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="Enter your email or username"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
            <Link
              href="/forgot-password"
              className="mt-2 inline-block text-sm text-center text-subheader hover:text-primary-600"
            >
              Forgot password?
            </Link>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{loginError}</p>
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary-500 px-4 py-2 font-medium text-white transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>

          {/* Sign up link */}
          <p className="text-center text-sm text-subheader">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-medium text-primary-600 hover:text-primary-700">
              Sign up.
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}