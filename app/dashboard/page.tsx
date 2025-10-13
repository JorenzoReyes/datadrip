'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { useAuth } from '../contexts/auth';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from 'recharts';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  type ShopRow = { platform: string; followers_count: number | null };
  type ListingRow = { platform: string; total_listings: string; avg_price: string | null };
  type Totals = { all: number; tiktok: number; lazada: number; shopee: number };
  const [data, setData] = useState<{ shops: ShopRow[]; listings: ListingRow[]; totals?: Totals } | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);

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

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/shops/metrics', { cache: 'no-store' });
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    }
    if (!isLoading && user) load();
  }, [isLoading, user]);

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
      <Header active="dashboard" />

                        {/* Main Content */}
      <main className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-6 py-6 text-sm">
        {/* Greeting Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold font-title text-header mb-2">Hi, {user?.fname || user?.username || user?.email || 'User'}!</h2>
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
        <h3 className="text-xl font-bold font-title text-header mb-6">Shop Metrics</h3>

        {/* Sales Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-gray-600 text-xs font-medium mb-2">Total Sales</h4>
            <p className="text-xl font-bold text-header">₱ {(data?.totals?.all || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-gray-600 text-xs font-medium mb-2">TikTok Sales</h4>
            <p className="text-xl font-bold text-header">₱ {(data?.totals?.tiktok || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-gray-600 text-xs font-medium mb-2">Lazada Sales</h4>
            <p className="text-xl font-bold text-header">₱ {(data?.totals?.lazada || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-gray-600 text-xs font-medium mb-2">Shopee Sales</h4>
            <p className="text-xl font-bold text-header">₱ {(data?.totals?.shopee || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-base font-semibold font-title text-header mb-4">Followers by Platform</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(data?.shops || []).reduce<{ platform: string; followers: number }[]>((acc, s) => {
                  const found = acc.find(a => a.platform === s.platform);
                  if (found) {
                    found.followers += s.followers_count || 0;
                  } else {
                    acc.push({ platform: s.platform, followers: s.followers_count || 0 });
                  }
                  return acc;
                }, [])}>
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="followers" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-base font-semibold font-title text-header mb-4">Avg Listing Price by Platform</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.listings || []}>
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avg_price" name="Avg Price" stroke="#f97316" />
                </LineChart>
              </ResponsiveContainer>
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
