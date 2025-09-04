'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from './contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
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
      const success = await login(email, password);
      if (success) {
        // Redirect based on user role
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          if (user.role === 'admin') {
            router.push('/admin/dashboard');
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        setLoginError('Invalid email or password');
      }
    } catch {
      setLoginError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-900 via-black to-purple-900">
      <div className="w-full max-w-lg rounded-2xl bg-black/40 p-6 shadow-xl backdrop-blur-md">
        <h1 className="text-center text-4xl font-extrabold text-white">DataDrip</h1>
        <p className="mt-2 text-center text-gray-400">Log in to your account</p>

        {/* Demo Credentials Info */}
        <div className="mt-4 rounded-lg bg-purple-900/30 p-4 border border-purple-500/30">
          <p className="text-sm text-purple-200 font-medium mb-2">Demo Credentials:</p>
          <div className="text-xs text-purple-300 space-y-1">
            <div><strong>User:</strong> user@example.com / password123</div>
            <div><strong>Admin:</strong> admin@example.com / admin123</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-200">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="mt-2 w-full rounded-lg border border-gray-700 bg-black/40 px-4 py-2 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
            />
            <Link
              href="/forgot-password"
              className="mt-2 inline-block text-sm text-center text-gray-400 hover:text-purple-400"
            >
              Forgot password?
            </Link>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="rounded-lg bg-red-900/30 border border-red-500/30 p-3">
              <p className="text-sm text-red-200">{loginError}</p>
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-purple-700 px-4 py-2 font-medium text-white transition hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-400">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-medium text-purple-400 hover:text-purple-300">
              Sign up.
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}