'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    if (!isLoading && !user) {
      router.push('/');
      return;
    }

    // Redirect admin and system_admin users to admin dashboard
    if (!isLoading && user && (user.role === 'admin' || user.role === 'system_admin')) {
      router.push('/admin/dashboard');
      return;
    }
  }, [user, isLoading, router]);

  const handleLogout = () => {
    // This will be handled by the AuthContext
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-header text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || user.role === 'admin' || user.role === 'system_admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold font-title text-header">DataDrip</h1>
              <nav className="hidden md:flex space-x-6">
                <a href="/dashboard" className="text-header font-medium">Dashboard</a>
                <a href="/sales-inventory" className="text-gray-600 hover:text-header transition">Sales and Inventory</a>
                <a href="/insights" className="text-gray-600 hover:text-header transition">Insights</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">U</span>
              </div>
            </div>
          </div>
        </div>
      </header>

                        {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Greeting Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold font-title text-header mb-2">Hi, User!</h2>
            <p className="text-gray-600 text-lg">This is what has been happening to your shops.</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600 text-lg mb-2">Friday, September 5, 2025</p>
            <button className="bg-header text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition">
              <span>This Month</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sales Report Title */}
        <h3 className="text-2xl font-bold font-title text-header mb-6">Sales Report</h3>

        {/* Sales Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h4 className="text-gray-600 text-sm font-medium mb-2">Total Sales</h4>
            <p className="text-2xl font-bold text-header">₱ 400,000.00</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h4 className="text-gray-600 text-sm font-medium mb-2">TikTok Sales</h4>
            <p className="text-2xl font-bold text-header">₱ 200,000.00</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h4 className="text-gray-600 text-sm font-medium mb-2">Lazada Sales</h4>
            <p className="text-2xl font-bold text-header">₱ 100,000.00</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h4 className="text-gray-600 text-sm font-medium mb-2">Shopee Sales</h4>
            <p className="text-2xl font-bold text-header">₱ 100,000.00</p>
          </div>
          </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Platform Sales Trend Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h4 className="text-lg font-semibold font-title text-header mb-4">Platform Sales Trend</h4>
            <div className="h-64 relative">
              <svg width="100%" height="100%" className="overflow-visible">
                {/* Grid lines */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* TikTok line */}
                <polyline
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="20,180 60,120 100,140 140,80 180,100 220,60"
                />
                
                {/* Shopee line */}
                <polyline
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="20,200 60,160 100,180 140,120 180,140 220,100"
                />
                
                {/* Lazada line */}
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="20,220 60,200 100,220 140,180 180,200 220,160"
                />
                
                {/* Data points for TikTok */}
                <circle cx="20" cy="180" r="4" fill="#000000" />
                <circle cx="60" cy="120" r="4" fill="#000000" />
                <circle cx="100" cy="140" r="4" fill="#000000" />
                <circle cx="140" cy="80" r="4" fill="#000000" />
                <circle cx="180" cy="100" r="4" fill="#000000" />
                <circle cx="220" cy="60" r="4" fill="#000000" />
                
                {/* Data points for Shopee */}
                <circle cx="20" cy="200" r="4" fill="#f97316" />
                <circle cx="60" cy="160" r="4" fill="#f97316" />
                <circle cx="100" cy="180" r="4" fill="#f97316" />
                <circle cx="140" cy="120" r="4" fill="#f97316" />
                <circle cx="180" cy="140" r="4" fill="#f97316" />
                <circle cx="220" cy="100" r="4" fill="#f97316" />
                
                {/* Data points for Lazada */}
                <circle cx="20" cy="220" r="4" fill="#3b82f6" />
                <circle cx="60" cy="200" r="4" fill="#3b82f6" />
                <circle cx="100" cy="220" r="4" fill="#3b82f6" />
                <circle cx="140" cy="180" r="4" fill="#3b82f6" />
                <circle cx="180" cy="200" r="4" fill="#3b82f6" />
                <circle cx="220" cy="160" r="4" fill="#3b82f6" />
                
                {/* X-axis labels */}
                <text x="20" y="240" textAnchor="middle" className="text-xs fill-gray-600">Jan</text>
                <text x="60" y="240" textAnchor="middle" className="text-xs fill-gray-600">Feb</text>
                <text x="100" y="240" textAnchor="middle" className="text-xs fill-gray-600">Mar</text>
                <text x="140" y="240" textAnchor="middle" className="text-xs fill-gray-600">Apr</text>
                <text x="180" y="240" textAnchor="middle" className="text-xs fill-gray-600">May</text>
                <text x="220" y="240" textAnchor="middle" className="text-xs fill-gray-600">Jun</text>
                
                {/* Y-axis labels */}
                <text x="10" y="50" textAnchor="middle" className="text-xs fill-gray-600">₱300k</text>
                <text x="10" y="100" textAnchor="middle" className="text-xs fill-gray-600">₱250k</text>
                <text x="10" y="150" textAnchor="middle" className="text-xs fill-gray-600">₱200k</text>
                <text x="10" y="200" textAnchor="middle" className="text-xs fill-gray-600">₱150k</text>
                <text x="10" y="250" textAnchor="middle" className="text-xs fill-gray-600">₱100k</text>
              </svg>
            </div>
            {/* Legend */}
            <div className="flex justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-black rounded"></div>
                <span className="text-sm text-gray-600">TikTok</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-sm text-gray-600">Shopee</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-600">Lazada</span>
              </div>
            </div>
          </div>

          {/* Sales per Month Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h4 className="text-lg font-semibold font-title text-header mb-4">Sales per Month</h4>
            <div className="h-64 flex items-end justify-between space-x-1">
              {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((month, index) => {
                const heights = [60, 120, 80, 40, 50, 45, 110, 85, 130, 55, 65, 125];
                return (
                  <div key={month} className="flex flex-col items-center space-y-2">
                    <div 
                      className="w-6 bg-header rounded-t" 
                      style={{height: `${heights[index]}px`}}
                    ></div>
                    <span className="text-xs text-gray-600">{month}</span>
              </div>
                );
              })}
              </div>
            </div>
          </div>

        {/* Export Reports Button */}
        <div className="flex justify-end">
          <button className="bg-header text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition">
            Export Reports
          </button>
        </div>
      </main>
    </div>
  );
}
