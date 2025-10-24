'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { useAuth } from '../contexts/auth';
import ExportReportsModal from '../components/ExportReportsModal';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [processedDailySales, setProcessedDailySales] = useState<{ date: string; totalSales: number; tiktok: number; shopee: number; lazada: number; dayOfWeek: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ product_name: string; total_revenue: number; total_quantity_sold: number; brand: string; platform?: string; platforms?: string }[]>([]);
  const [topWeeklyProducts, setTopWeeklyProducts] = useState<{
    platform: string;
    platformDisplay: string;
    product1: number;
    product2: number;
    product3: number;
    product1Name: string;
    product2Name: string;
    product3Name: string;
  }[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [weeklyTotals, setWeeklyTotals] = useState<{ all: number; tiktok: number; lazada: number; shopee: number }>({ all: 0, tiktok: 0, lazada: 0, shopee: 0 });
  const [revenueByCategory, setRevenueByCategory] = useState<{ category: string; revenue: number; percentage: number }[]>([]);
  const [aovTrend, setAovTrend] = useState<{ date: string; tiktok?: number; shopee?: number; lazada?: number }[]>([]);
  
  // Week selection state
  type WeekOption = { label: string; startDate: Date; endDate: Date; month: string; year: number };
  const [availableWeeks, setAvailableWeeks] = useState<WeekOption[]>([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);
  const [currentMonthPage, setCurrentMonthPage] = useState<number>(0);
  const [monthlyWeeks, setMonthlyWeeks] = useState<WeekOption[][]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);



  // Export function
  const handleExport = async (options: { reportType: string; format: string; dateRange: string }) => {
    try {
      const response = await fetch('/api/export/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.user_id,
          ...options
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `export_${options.reportType}_${new Date().toISOString().split('T')[0]}.${options.format}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  // Generate available weeks on mount
  useEffect(() => {
    const weeks: WeekOption[] = [];
    const startMonth = new Date('2025-09-01');
    const endMonth = new Date('2025-12-31');
    
    // Find the first Sunday on or before September 1, 2025
    const firstSunday = new Date(startMonth);
    firstSunday.setDate(firstSunday.getDate() - firstSunday.getDay());
    
    let currentWeekStart = new Date(firstSunday);
    
    // Generate weeks until we cover the entire date range
    while (currentWeekStart <= endMonth) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      
      const startStr = currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
      const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
      const year = currentWeekStart.getFullYear();
      const month = currentWeekStart.toLocaleDateString('en-US', { month: 'long', timeZone: 'Asia/Manila' });
      
      weeks.push({
        label: `${startStr} - ${endStr}, ${year}`,
        startDate: new Date(currentWeekStart),
        endDate: new Date(weekEnd),
        month: month,
        year: year
      });
      
      currentWeekStart = new Date(currentWeekStart);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    setAvailableWeeks(weeks);
    
    // Group weeks by month and limit to 4 weeks per month
    const monthlyGroups: WeekOption[][] = [];
    const monthGroups = new Map<string, WeekOption[]>();
    
    weeks.forEach(week => {
      const monthKey = `${week.month} ${week.year}`;
      if (!monthGroups.has(monthKey)) {
        monthGroups.set(monthKey, []);
      }
      monthGroups.get(monthKey)!.push(week);
    });
    
    // Convert to array and limit each month to 4 weeks
    monthGroups.forEach(monthWeeks => {
      const limitedWeeks = monthWeeks.slice(0, 4);
      monthlyGroups.push(limitedWeeks);
    });
    
    setMonthlyWeeks(monthlyGroups);
    
    // Extract unique months and years
    const uniqueMonths = [...new Set(weeks.map(week => week.month))];
    const uniqueYears = [...new Set(weeks.map(week => week.year))];
    setAvailableMonths(uniqueMonths);
    setAvailableYears(uniqueYears.sort());
    
    // Find and select the current week by default
    const now = new Date();
    const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const currentWeekIdx = weeks.findIndex(week => 
      phTime >= week.startDate && phTime <= week.endDate
    );
    
    setSelectedWeekIndex(currentWeekIdx >= 0 ? currentWeekIdx : weeks.length - 1);
    
    // Find which month page contains the current week
    const currentMonthIdx = monthlyGroups.findIndex(monthWeeks => 
      monthWeeks.some(week => 
        phTime >= week.startDate && phTime <= week.endDate
      )
    );
    setCurrentMonthPage(currentMonthIdx >= 0 ? currentMonthIdx : 0);
    
    // Set initial month and year
    if (monthlyGroups[currentMonthIdx] && monthlyGroups[currentMonthIdx].length > 0) {
      setSelectedMonth(monthlyGroups[currentMonthIdx][0].month);
      setSelectedYear(monthlyGroups[currentMonthIdx][0].year);
    }
  }, []);

  // Update selected week when month page changes
  useEffect(() => {
    if (monthlyWeeks[currentMonthPage] && monthlyWeeks[currentMonthPage].length > 0) {
      const firstWeekOfMonth = monthlyWeeks[currentMonthPage][0];
      const globalIndex = availableWeeks.findIndex(w => 
        w.startDate.getTime() === firstWeekOfMonth.startDate.getTime()
      );
      if (globalIndex >= 0) {
        setSelectedWeekIndex(globalIndex);
      }
    }
  }, [currentMonthPage, monthlyWeeks, availableWeeks]);

  // Update month page when month or year changes
  useEffect(() => {
    if (selectedMonth && selectedYear && monthlyWeeks.length > 0) {
      const monthIndex = monthlyWeeks.findIndex(monthWeeks => 
        monthWeeks.length > 0 && 
        monthWeeks[0].month === selectedMonth && 
        monthWeeks[0].year === selectedYear
      );
      if (monthIndex >= 0) {
        setCurrentMonthPage(monthIndex);
      }
    }
  }, [selectedMonth, selectedYear, monthlyWeeks]);

  // Close platform dropdown when clicking outside

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
        const selectedWeekForMetrics = availableWeeks[selectedWeekIndex];
        const startDateStrForMetrics = selectedWeekForMetrics.startDate.toISOString().split('T')[0];
        const endDateStrForMetrics = selectedWeekForMetrics.endDate.toISOString().split('T')[0];
        const res = await fetch(`/api/shops/metrics?email=${email}&startDate=${startDateStrForMetrics}&endDate=${endDateStrForMetrics}`, { cache: 'no-store' });
        const json = await res.json();


        // Fetch top selling products
        const topProductsRes = await fetch(`/api/products/top-selling?email=${email}&limit=5&days=30`, { cache: 'no-store' });
        const topProductsJson = await topProductsRes.json();
        setTopProducts(topProductsJson.topProducts || []);

        // Fetch top 3 weekly products with platform breakdown for the selected week
        const selectedWeekForProducts = availableWeeks[selectedWeekIndex];
        const startDateStrForProducts = selectedWeekForProducts.startDate.toISOString().split('T')[0];
        const endDateStrForProducts = selectedWeekForProducts.endDate.toISOString().split('T')[0];
        const weeklyProductsRes = await fetch(`/api/products/top-weekly?email=${email}&startDate=${startDateStrForProducts}&endDate=${endDateStrForProducts}`, { cache: 'no-store' });
        const weeklyProductsJson = await weeklyProductsRes.json();
        setTopWeeklyProducts(weeklyProductsJson.topProducts || []);

        // Fetch revenue by category data for current week
        const selectedWeekForCharts = availableWeeks[selectedWeekIndex];
        const startDateStrForCharts = selectedWeekForCharts.startDate.toISOString().split('T')[0];
        const endDateStrForCharts = selectedWeekForCharts.endDate.toISOString().split('T')[0];
        
        const categoryRes = await fetch(`/api/products/revenue-by-category?email=${email}&startDate=${startDateStrForCharts}&endDate=${endDateStrForCharts}`, { cache: 'no-store' });
        const categoryJson = await categoryRes.json();
        setRevenueByCategory(categoryJson.revenueByCategory || []);

        // Fetch AOV trend data for current week
        const aovRes = await fetch(`/api/products/aov-trend?email=${email}&startDate=${startDateStrForCharts}&endDate=${endDateStrForCharts}`, { cache: 'no-store' });
        const aovJson = await aovRes.json();
        setAovTrend(aovJson.aovTrend || []);

        // Process daily sales data for the line chart from product_sales
        // Note: We calculate our own weekly totals from the daily sales data
        if (json.dailySales && json.dailySales.length > 0) {
          // Aggregate platform data by date (multiple accounts may have same date)
          const aggregatedByDate: { [date: string]: { tiktok: number; shopee: number; lazada: number } } = {};
          
          json.dailySales.forEach((sale: { sale_date: string; total_sales: number; platform_breakdown?: { tiktok?: number; shopee?: number; lazada?: number } }) => {
            const dateStr = sale.sale_date.split('T')[0]; // Convert to YYYY-MM-DD format
            
            if (!aggregatedByDate[dateStr]) {
              aggregatedByDate[dateStr] = { tiktok: 0, shopee: 0, lazada: 0 };
            }
            
            // Only use platform breakdown, not total_sales (which is already the sum)
            aggregatedByDate[dateStr].tiktok += sale.platform_breakdown?.tiktok || 0;
            aggregatedByDate[dateStr].shopee += sale.platform_breakdown?.shopee || 0;
            aggregatedByDate[dateStr].lazada += sale.platform_breakdown?.lazada || 0;
          });
          
          // Get the selected week's date range (Sunday to Saturday)
          // Use the selected week from the dropdown, or default to current week if not set
          if (availableWeeks.length === 0) return; // Wait for weeks to be initialized
          
          const selectedWeek = availableWeeks[selectedWeekIndex];
          const startOfWeek = new Date(selectedWeek.startDate);
          startOfWeek.setHours(0, 0, 0, 0);
          
          // Generate all 7 days from Sunday to Saturday for the selected week
          const weekData: { date: string; totalSales: number; tiktok: number; shopee: number; lazada: number; dayOfWeek: number }[] = [];
          
          for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            // Format as YYYY-MM-DD in Philippine time
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            
            const salesData = aggregatedByDate[dateString] || { tiktok: 0, shopee: 0, lazada: 0 };
            const totalSales = salesData.tiktok + salesData.shopee + salesData.lazada;
            
            weekData.push({
              date: dateString,
              totalSales: totalSales,
              tiktok: salesData.tiktok,
              shopee: salesData.shopee,
              lazada: salesData.lazada,
              dayOfWeek: d.getDay() // 0 = Sunday, 1 = Monday, etc.
            });
          }
          
          setProcessedDailySales(weekData);
          
          // Calculate weekly totals from the current week's data
          const totals = weekData.reduce((acc, day) => ({
            all: acc.all + day.totalSales,
            tiktok: acc.tiktok + day.tiktok,
            lazada: acc.lazada + day.lazada,
            shopee: acc.shopee + day.shopee
          }), { all: 0, tiktok: 0, lazada: 0, shopee: 0 });
          
          setWeeklyTotals(totals);
        } else {
          setProcessedDailySales([]);
          setWeeklyTotals({ all: 0, tiktok: 0, lazada: 0, shopee: 0 });
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (!isLoading && user && availableWeeks.length > 0) load();
  }, [isLoading, user, selectedWeekIndex, availableWeeks]);

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
  const CustomXAxisTick = (props: { x?: number; y?: number; payload?: { value: string } }) => {
    const { x, y, payload } = props;
    
    if (!payload?.value) return null;
    
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
            <p className="text-gray-600 mb-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' })}</p>
            
            {/* Filters */}
            <div className="flex items-center gap-2 justify-end">
              {/* Week Filter */}
              <div className="flex items-center gap-2">
                <label htmlFor="week-filter" className="text-xs text-gray-500 font-medium">View Week:</label>
                
                {/* Month Selection */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-xs px-2 py-1.5 border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  <option value="">Month</option>
                  {availableMonths.map((month, index) => (
                    <option key={index} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
                
                {/* Year Selection */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs px-2 py-1.5 border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  <option value="">Year</option>
                  {availableYears.map((year, index) => (
                    <option key={index} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                
                {/* Week Selection */}
                <select
                  id="week-filter"
                  value={selectedWeekIndex}
                  onChange={(e) => {
                    const newIndex = Number(e.target.value);
                    setSelectedWeekIndex(newIndex);
                    // Store timeline context for insights chat
                    const selectedWeek = availableWeeks[newIndex];
                    if (selectedWeek) {
                      localStorage.setItem('dashboardTimeline', JSON.stringify({
                        type: 'week',
                        index: newIndex,
                        label: selectedWeek.label,
                        startDate: selectedWeek.startDate.toISOString(),
                        endDate: selectedWeek.endDate.toISOString(),
                        month: selectedWeek.month,
                        year: selectedWeek.year
                      }));
                    }
                  }}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  {monthlyWeeks[currentMonthPage]?.map((week, index) => {
                    const globalIndex = availableWeeks.findIndex(w => 
                      w.startDate.getTime() === week.startDate.getTime()
                    );
                    return (
                      <option key={index} value={globalIndex}>
                        {week.label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-gray-600 text-xs font-medium mb-2">Total Sales</h4>
            <p className="text-xl font-bold text-header">₱ {Math.round(weeklyTotals.all).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-gray-600 text-xs font-medium mb-2">TikTok Sales</h4>
            <p className="text-xl font-bold text-header">₱ {Math.round(weeklyTotals.tiktok).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-gray-600 text-xs font-medium mb-2">Lazada Sales</h4>
            <p className="text-xl font-bold text-header">₱ {Math.round(weeklyTotals.lazada).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-gray-600 text-xs font-medium mb-2">Shopee Sales</h4>
            <p className="text-xl font-bold text-header">₱ {Math.round(weeklyTotals.shopee).toLocaleString()}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-base font-semibold font-title text-header mb-4">Top 3 Products by Platform</h4>
            <div className="h-64">
              {topWeeklyProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topWeeklyProducts}>
                    <XAxis 
                      dataKey="platformDisplay" 
                      tick={{ fontSize: 12 }}
                      interval={0}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value: number) => `₱${value.toFixed(0)}`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string, props: { payload: Record<string, unknown> }) => {
                        if (value === 0) return null;
                        const productNameKey = `${name}Name`;
                        const productName = props.payload[productNameKey] || 'Product';
                        return [`₱${Math.round(value).toLocaleString()}`, productName];
                      }}
                      contentStyle={{ 
                        fontSize: '12px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ 
                        fontWeight: 'bold',
                        color: '#1f2937',
                        fontSize: '13px'
                      }}
                      itemStyle={{ 
                        color: '#059669',
                        fontWeight: '600'
                      }}
                    />
                    {/* Product 1 - Base color (darkest/most saturated) */}
                    <Bar dataKey="product1" stackId="stack">
                      {topWeeklyProducts.map((entry, index) => {
                        const colors: { [key: string]: string } = {
                          'tiktok': '#000000',
                          'shopee': '#EE4D2D',
                          'lazada': '#0F146D'
                        };
                        return <Cell key={`cell-${index}`} fill={colors[entry.platform]} />;
                      })}
                    </Bar>
                    {/* Product 2 - Medium shade */}
                    <Bar dataKey="product2" stackId="stack">
                      {topWeeklyProducts.map((entry, index) => {
                        const colors: { [key: string]: string } = {
                          'tiktok': '#4A4A4A',
                          'shopee': '#F37258',
                          'lazada': '#3B4BA0'
                        };
                        return <Cell key={`cell-${index}`} fill={colors[entry.platform]} />;
                      })}
                    </Bar>
                    {/* Product 3 - Lightest shade */}
                    <Bar dataKey="product3" stackId="stack">
                      {topWeeklyProducts.map((entry, index) => {
                        const colors: { [key: string]: string } = {
                          'tiktok': '#8B8B8B',
                          'shopee': '#F89D87',
                          'lazada': '#6D7BC7'
                        };
                        return <Cell key={`cell-${index}`} fill={colors[entry.platform]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No product data available for this week
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-base font-semibold font-title text-header mb-4">Sales Trend by Platform</h4>
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
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value: number) => `₱${value.toFixed(0)}`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [`₱${Math.round(value).toLocaleString()}`, name]}
                    labelFormatter={(label: string) => {
                      const date = new Date(label);
                      return `Date: ${date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        timeZone: 'Asia/Manila'
                      })}`;
                    }}
                    contentStyle={{ 
                      fontSize: '12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tiktok" 
                    name="TikTok" 
                    stroke="#000000" 
                    strokeWidth={2}
                    dot={{ fill: '#000000', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="shopee" 
                    name="Shopee" 
                    stroke="#EE4D2D" 
                    strokeWidth={2}
                    dot={{ fill: '#EE4D2D', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="lazada" 
                    name="Lazada" 
                    stroke="#0F146D" 
                    strokeWidth={2}
                    dot={{ fill: '#0F146D', r: 4 }}
                  />
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

        {/* Additional Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Revenue by Product Category - Donut Chart */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-base font-semibold font-title text-header mb-4">Top 5 Revenue by Product Category</h4>
            <div className="h-64">
              {revenueByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="revenue"
                      nameKey="category"
                    >
                      {revenueByCategory.map((entry, index) => {
                        const colors = [
                          '#EE4D2D', '#0F146D', '#000000', '#059669', '#DC2626', 
                          '#7C3AED', '#EA580C', '#0891B2', '#BE185D', '#65A30D'
                        ];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }: { active?: boolean; payload?: { payload: { category: string; revenue: number; percentage: number } }[] }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '12px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              fontSize: '12px'
                            }}>
                              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{data.category}</p>
                              <p style={{ margin: '0 0 2px 0' }}>₱{Math.round(data.revenue).toLocaleString()}</p>
                              <p style={{ margin: '0' }}>{data.percentage.toFixed(1)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No category data available
                </div>
              )}
            </div>
          </div>

          {/* Average Order Value Trend - Line Chart */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-base font-semibold font-title text-header mb-4">Average Order Value Trend</h4>
            <div className="h-64">
              {aovTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={aovTrend}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value: string) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                      axisLine={false}
                      padding={{ left: 20, right: 20 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value: number) => `₱${value.toFixed(0)}`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [`₱${value.toFixed(2)}`, name]}
                      labelFormatter={(label: string) => {
                        const date = new Date(label);
                        return `Date: ${date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          timeZone: 'Asia/Manila'
                        })}`;
                      }}
                      contentStyle={{ 
                        fontSize: '12px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="tiktok" 
                      name="TikTok" 
                      stroke="#000000" 
                      strokeWidth={2}
                      dot={{ fill: '#000000', r: 4 }}
                      activeDot={{ r: 6, stroke: '#000000', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="shopee" 
                      name="Shopee" 
                      stroke="#EE4D2D" 
                      strokeWidth={2}
                      dot={{ fill: '#EE4D2D', r: 4 }}
                      activeDot={{ r: 6, stroke: '#EE4D2D', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="lazada" 
                      name="Lazada" 
                      stroke="#0F146D" 
                      strokeWidth={2}
                      dot={{ fill: '#0F146D', r: 4 }}
                      activeDot={{ r: 6, stroke: '#0F146D', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No AOV data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top 5 Selling Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top 5 Selling Products</h3>
          </div>
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
                    <p className="text-xs text-gray-400">
                      {product.platforms || 'Multiple platforms'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No sales data available</p>
          )}
        </div>

        {/* Export Reports Button */}
        <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
          <button 
            onClick={() => setShowExportModal(true)}
            className="bg-header text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition text-sm flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export Reports</span>
          </button>
        </div>
      </main>

      {/* Export Reports Modal */}
      <ExportReportsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />
    </div>
  );
}