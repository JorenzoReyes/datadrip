'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin' | 'system_admin';
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole = 'user',
  redirectTo = '/'
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // Check if user is authenticated
      if (!user) {
        router.push(redirectTo);
        return;
      }

      // Check if user has required role
      if (requiredRole === 'admin' && user.role !== 'admin' && user.role !== 'system_admin') {
        router.push('/dashboard');
        return;
      }

      if (requiredRole === 'system_admin' && user.role !== 'system_admin') {
        router.push('/dashboard');
        return;
      }

      if (requiredRole === 'user' && (user.role === 'admin' || user.role === 'system_admin')) {
        router.push('/admin/dashboard');
        return;
      }
    }
  }, [user, isLoading, requiredRole, redirectTo, router]);

  if (isLoading) {
    return (
          <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-header text-xl font-title">Loading...</div>
      </div>
    );
  }

  // Don't render children if user doesn't meet requirements
  if (!user || 
      (requiredRole === 'admin' && user.role !== 'admin' && user.role !== 'system_admin') ||
      (requiredRole === 'system_admin' && user.role !== 'system_admin') ||
      (requiredRole === 'user' && (user.role === 'admin' || user.role === 'system_admin'))) {
    return null;
  }

  return <>{children}</>;
}
