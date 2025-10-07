'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/auth';

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
      router.push('/admin/manage-users');
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold font-title text-header hover:text-primary-600 transition">
                DataDrip
              </Link>
              <nav className="hidden md:flex space-x-6 text-sm">
                <a href="/dashboard" className="text-header font-medium">Dashboard</a>
                <a href="/products" className="text-gray-600 hover:text-header transition">Products</a>
                <a href="/insights" className="text-gray-600 hover:text-header transition">Insights</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/settings')}
                className="p-2 text-gray-600 hover:text-header hover:bg-gray-100 rounded-lg transition text-sm"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">U</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-gray-600 hover:text-header hover:bg-gray-100 rounded-lg transition font-medium text-sm"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

                        {/* Main Content */}
      <main className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-6 py-6 text-sm">
        {/* Greeting Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold font-title text-header mb-2">Hi, User!</h2>
            <p className="text-gray-600">This is what has been happening to your shops.</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600 mb-2">Friday, September 5, 2025</p>
            <button className="bg-header text-white px-3 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition text-sm">
              <span>This Month</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sales Report Title */}
        <h3 className="text-xl font-bold font-title text-header mb-6">Sales Report</h3>

        {/* Sales Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-gray-600 text-xs font-medium mb-2">Total Sales</h4>
            <p className="text-xl font-bold text-header">₱ 400,000.00</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-gray-600 text-xs font-medium mb-2">TikTok Sales</h4>
            <p className="text-xl font-bold text-header">₱ 200,000.00</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-gray-600 text-xs font-medium mb-2">Lazada Sales</h4>
            <p className="text-xl font-bold text-header">₱ 100,000.00</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-gray-600 text-xs font-medium mb-2">Shopee Sales</h4>
            <p className="text-xl font-bold text-header">₱ 100,000.00</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Platform Sales Trend Chart */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-base font-semibold font-title text-header mb-4">Platform Sales Trend</h4>
            <div className="h-64 relative px-4">
              <svg width="100%" height="100%" viewBox="0 0 400 256" preserveAspectRatio="xMidYMid meet" className="overflow-visible">
                {/* Grid lines */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                  </pattern>
                </defs>
                
                {/* Chart area with proper margins */}
                <rect x="60" y="20" width="300" height="200" fill="url(#grid)" />
                
                {/* TikTok line */}
                <polyline
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="80,180 120,120 160,140 200,80 240,100 280,60"
                />
                
                {/* Shopee line */}
                <polyline
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="80,200 120,160 160,180 200,120 240,140 280,100"
                />
                
                {/* Lazada line */}
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="80,220 120,200 160,220 200,180 240,200 280,160"
                />
                
                {/* Data points for TikTok */}
                <circle cx="80" cy="180" r="4" fill="#000000" />
                <circle cx="120" cy="120" r="4" fill="#000000" />
                <circle cx="160" cy="140" r="4" fill="#000000" />
                <circle cx="200" cy="80" r="4" fill="#000000" />
                <circle cx="240" cy="100" r="4" fill="#000000" />
                <circle cx="280" cy="60" r="4" fill="#000000" />
                
                {/* Data points for Shopee */}
                <circle cx="80" cy="200" r="4" fill="#f97316" />
                <circle cx="120" cy="160" r="4" fill="#f97316" />
                <circle cx="160" cy="180" r="4" fill="#f97316" />
                <circle cx="200" cy="120" r="4" fill="#f97316" />
                <circle cx="240" cy="140" r="4" fill="#f97316" />
                <circle cx="280" cy="100" r="4" fill="#f97316" />
                
                {/* Data points for Lazada */}
                <circle cx="80" cy="220" r="4" fill="#3b82f6" />
                <circle cx="120" cy="200" r="4" fill="#3b82f6" />
                <circle cx="160" cy="220" r="4" fill="#3b82f6" />
                <circle cx="200" cy="180" r="4" fill="#3b82f6" />
                <circle cx="240" cy="200" r="4" fill="#3b82f6" />
                <circle cx="280" cy="160" r="4" fill="#3b82f6" />
                
                {/* X-axis labels - properly aligned with data points */}
                <text x="80" y="250" textAnchor="middle" className="text-xs fill-gray-600">Jan</text>
                <text x="120" y="250" textAnchor="middle" className="text-xs fill-gray-600">Feb</text>
                <text x="160" y="250" textAnchor="middle" className="text-xs fill-gray-600">Mar</text>
                <text x="200" y="250" textAnchor="middle" className="text-xs fill-gray-600">Apr</text>
                <text x="240" y="250" textAnchor="middle" className="text-xs fill-gray-600">May</text>
                <text x="280" y="250" textAnchor="middle" className="text-xs fill-gray-600">Jun</text>
                
                {/* Y-axis labels - properly aligned with grid lines */}
                <text x="40" y="30" textAnchor="middle" className="text-xs fill-gray-600">₱300k</text>
                <text x="40" y="80" textAnchor="middle" className="text-xs fill-gray-600">₱250k</text>
                <text x="40" y="130" textAnchor="middle" className="text-xs fill-gray-600">₱200k</text>
                <text x="40" y="180" textAnchor="middle" className="text-xs fill-gray-600">₱150k</text>
                <text x="40" y="230" textAnchor="middle" className="text-xs fill-gray-600">₱100k</text>
              </svg>
            </div>
            {/* Legend */}
            <div className="flex justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-black rounded"></div>
                <span className="text-sm text-subheader">TikTok</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-sm text-subheader">Shopee</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm text-subheader">Lazada</span>
              </div>
            </div>
          </div>

          {/* Sales per Month Chart */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-base font-semibold font-title text-header mb-4">Sales per Month by Platform</h4>
            <div className="h-64 flex items-end justify-between space-x-1">
              {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((month, index) => {
                // Sample data for each platform per month (in pixels for bar height)
                const platformData = {
                  tiktok: [45, 90, 60, 30, 40, 35, 85, 65, 100, 40, 50, 95],
                  shopee: [35, 70, 50, 25, 35, 30, 70, 55, 80, 35, 40, 75],
                  lazada: [25, 50, 35, 20, 25, 20, 50, 40, 60, 25, 30, 55]
                };
                
                return (
                  <div key={month} className="flex flex-col items-center space-y-2">
                    <div className="flex items-end space-x-0.5">
                      {/* TikTok bar */}
                      <div 
                        className="w-2 rounded-t" 
                        style={{
                          height: `${platformData.tiktok[index]}px`,
                          backgroundColor: '#000000'
                        }}
                        title={`TikTok: ₱${(platformData.tiktok[index] * 1000).toLocaleString()}`}
                      ></div>
                      {/* Shopee bar */}
                      <div 
                        className="w-2 rounded-t" 
                        style={{
                          height: `${platformData.shopee[index]}px`,
                          backgroundColor: '#f97316'
                        }}
                        title={`Shopee: ₱${(platformData.shopee[index] * 1000).toLocaleString()}`}
                      ></div>
                      {/* Lazada bar */}
                      <div 
                        className="w-2 rounded-t" 
                        style={{
                          height: `${platformData.lazada[index]}px`,
                          backgroundColor: '#3b82f6'
                        }}
                        title={`Lazada: ₱${(platformData.lazada[index] * 1000).toLocaleString()}`}
                      ></div>
                    </div>
                    <span className="text-xs text-subheader">{month}</span>
                  </div>
                );
              })}
            </div>
            
            {/* Legend for the bar chart */}
            <div className="flex justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-black rounded"></div>
                <span className="text-sm text-subheader">TikTok</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-sm text-subheader">Shopee</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm text-subheader">Lazada</span>
              </div>
            </div>
          </div>
        </div>

        {/* Export Reports Button */}
        <div className="flex justify-end">
          <button className="bg-header text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition text-sm">
            Export Reports
          </button>
        </div>
      </main>
    </div>
  );
}
