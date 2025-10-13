'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { useAuth } from '../contexts/auth';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from 'recharts';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  type ShopRow = { platform: string; followers_count: number | null };
  type Totals = { all: number; tiktok: number; lazada: number; shopee: number };
  const [data, setData] = useState<{ shops: ShopRow[]; dailySales: { sale_date: string; platform: string; total_sales: number }[]; totals?: Totals } | null>(null);
  const [processedDailySales, setProcessedDailySales] = useState<{ date: string; totalSales: number; dayOfWeek: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ product_name: string; total_revenue: number; total_quantity_sold: number; brand: string }[]>([]);
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
        const email = encodeURIComponent(user?.email || '');
        const res = await fetch(`/api/shops/metrics?email=${email}`, { cache: 'no-store' });
        const json = await res.json();
        setData(json);

        // Fetch top selling products
        const topProductsRes = await fetch(`/api/products/top-selling?email=${email}&limit=5&days=30`, { cache: 'no-store' });
        const topProductsJson = await topProductsRes.json();
        setTopProducts(topProductsJson.topProducts || []);

        // Process daily sales data for the line chart, ensuring all 7 days are present
        if (json.dailySales && json.dailySales.length > 0) {
          const aggregatedSales: { [date: string]: number } = {};
          json.dailySales.forEach((sale: { sale_date: string; platform: string; total_sales: number }) => {
            // Convert ISO date to YYYY-MM-DD format
            const dateStr = sale.sale_date.split('T')[0];
            aggregatedSales[dateStr] = (aggregatedSales[dateStr] || 0) + parseFloat(sale.total_sales.toString());
          });
          
          // Generate all 7 days to ensure complete X-axis
          const sevenDaysData: { date: string; totalSales: number; dayOfWeek: number }[] = [];
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0); // Normalize to start of day UTC

          // Start from 6 days ago and go to today (7 days total)
          for (let i = 6; i >= 0; i--) { 
            const d = new Date(today);
            d.setUTCDate(today.getUTCDate() - i);
            const dateString = d.toISOString().split('T')[0]; // YYYY-MM-DD

            sevenDaysData.push({
              date: dateString,
              totalSales: aggregatedSales[dateString] || 0,
              dayOfWeek: d.getUTCDay(), // 0 for Sunday, 1 for Monday, etc.
            });
          }
          
          // Sort by date to ensure chronological order (oldest to newest)
          const sortedData = sevenDaysData.sort((a, b) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });
          
          console.log('Original data order:', sevenDaysData.map(d => d.date));
          console.log('Sorted data order:', sortedData.map(d => d.date));
          console.log('Sorted seven days data (chronological):', sortedData.map(d => ({ date: d.date, day: d.dayOfWeek, sales: d.totalSales })));
          setProcessedDailySales(sortedData);
        } else {
          setProcessedDailySales([]);
        }
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

  // Helper to format date as mm-dd
  const formatDateAsMMDD = (dateString: string) => {
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}-${day}`;
  };

  // Custom XAxis Tick component
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const dateString = payload.value;
    const dayOfWeek = processedDailySales.find(d => d.date === dateString)?.dayOfWeek;

    if (dayOfWeek === undefined) return null;

    const isSunday = dayOfWeek === 0;
    const color = isSunday ? '#EE4D2D' : '#666';
    const label = formatDateAsMMDD(dateString);

    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={16} 
          textAnchor="middle" 
          fill={color} 
          fontSize={12}
          fontWeight="500"
        >
          {label}
        </text>
      </g>
    );
  };

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
            <p className="text-gray-600 mb-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
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
                  <Bar dataKey="followers">
                    {(data?.shops || []).reduce<{ platform: string; followers: number }[]>((acc, s) => {
                      const found = acc.find(a => a.platform === s.platform);
                      if (found) {
                        found.followers += s.followers_count || 0;
                      } else {
                        acc.push({ platform: s.platform, followers: s.followers_count || 0 });
                      }
                      return acc;
                    }, []).map((entry, index) => {
                      const color = entry.platform === 'shopee' ? '#EE4D2D' :
                        entry.platform === 'lazada' ? '#000083' :
                          entry.platform === 'tiktok' ? 'black' : '#8884d8';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-base font-semibold font-title text-header mb-4">Sales Trend (Past 7 Days)</h4>
            <div className="h-64">
              {processedDailySales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedDailySales}>
                  <XAxis 
                    dataKey="date" 
                    tick={<CustomXAxisTick />}
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                    height={60}
                    padding={{ left: 20, right: 20 }}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [`₱${Math.round(value).toLocaleString()}`, 'Total Sales']}
                    labelFormatter={() => ''}
                  />
                  <Line type="monotone" dataKey="totalSales" name="Total Sales" stroke="#f97316" />
                </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No sales data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top 5 Selling Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Selling Products (Last 30 Days)</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.product_name}</p>
                      <p className="text-sm text-gray-500">{product.brand}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₱{Math.round(product.total_revenue).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{product.total_quantity_sold} sold</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No sales data available</p>
          )}
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