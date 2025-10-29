'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import { useAuth } from '../contexts/auth';
import ExportReportsModal from '../components/ExportReportsModal';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, PieChart, Pie, ComposedChart, Legend } from 'recharts';

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
  const [underperformingProducts, setUnderperformingProducts] = useState<{ 
    product_id: number; 
    product_name: string; 
    sku: string; 
    brand: string; 
    category: string; 
    stock: number; 
    price: number; 
    total_quantity_sold: number; 
    total_revenue: number; 
    stock_to_sales_ratio: number;
    last_sale_date: string | null;
    platforms?: string;
    listed_platforms?: string;
  }[]>([]);
  
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


        // Fetch top selling products for selected week
        const selectedWeekForTopProducts = availableWeeks[selectedWeekIndex];
        const startDateStrForTopProducts = selectedWeekForTopProducts.startDate.toISOString().split('T')[0];
        const endDateStrForTopProducts = selectedWeekForTopProducts.endDate.toISOString().split('T')[0];
        const daysDiff = Math.ceil((selectedWeekForTopProducts.endDate.getTime() - selectedWeekForTopProducts.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const topProductsRes = await fetch(`/api/products/top-selling?email=${email}&limit=5&startDate=${startDateStrForTopProducts}&endDate=${endDateStrForTopProducts}`, { cache: 'no-store' });
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

        // Fetch underperforming products (high stock, low sales) for selected week
        const selectedWeekForUnderperforming = availableWeeks[selectedWeekIndex];
        const startDateStrForUnderperforming = selectedWeekForUnderperforming.startDate.toISOString().split('T')[0];
        const endDateStrForUnderperforming = selectedWeekForUnderperforming.endDate.toISOString().split('T')[0];
        const daysDiffForUnderperforming = Math.ceil((selectedWeekForUnderperforming.endDate.getTime() - selectedWeekForUnderperforming.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const underperformingRes = await fetch(`/api/products/underperforming?email=${email}&limit=10&startDate=${startDateStrForUnderperforming}&endDate=${endDateStrForUnderperforming}&minStock=10&maxSales=5`, { cache: 'no-store' });
        const underperformingJson = await underperformingRes.json();
        setUnderperformingProducts(underperformingJson.underperformingProducts || []);

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

  // Helper to format currency with 2 decimal places
  const formatCurrency = (value: number | null | undefined | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (typeof numValue !== 'number' || isNaN(numValue)) {
      return '₱0.00';
    }
    return `₱${numValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  // Helper to safely convert to number for toFixed
  const toNumber = (value: number | string | null | undefined): number => {
    if (value == null) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Custom XAxis Tick component
  const CustomXAxisTick = (props: { x?: number; y?: number; payload?: { value: string } }) => {
    const { x, y, payload } = props;
    
    if (!payload?.value) return null;
    
    const dateString = payload.value;
    const dayOfWeek = processedDailySales.find(d => d.date === dateString)?.dayOfWeek;

    if (dayOfWeek === undefined) return null;

    const color = '#666';
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
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
            <h4 className="text-gray-600 text-xs font-medium mb-2">Total Sales</h4>
            <p className="text-xl font-bold text-header">{formatCurrency(weeklyTotals.all)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
            <h4 className="text-gray-600 text-xs font-medium mb-2">TikTok Sales</h4>
            <p className="text-xl font-bold text-header">{formatCurrency(weeklyTotals.tiktok)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
            <h4 className="text-gray-600 text-xs font-medium mb-2">Lazada Sales</h4>
            <p className="text-xl font-bold text-header">{formatCurrency(weeklyTotals.lazada)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
            <h4 className="text-gray-600 text-xs font-medium mb-2">Shopee Sales</h4>
            <p className="text-xl font-bold text-header">{formatCurrency(weeklyTotals.shopee)}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="text-base font-semibold font-title text-header mb-1">Top 3 Products by Platform</h4>
            <p className="text-xs text-gray-500 mb-4">Top performing products for the selected week</p>
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
                      tickFormatter={(value: number) => formatCurrency(value)}
                      width={80}
                    />
                    <Tooltip 
                      content={({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; payload: Record<string, string | number> }[]; label?: string }) => {
                        if (active && payload && payload.length) {
                          const platform = label;
                          const platformColors: { [key: string]: string } = {
                            'TikTok': '#000000',
                            'Shopee': '#EE4D2D',
                            'Lazada': '#0F146D'
                          };
                          const platformColor = platform ? platformColors[platform] || '#666' : '#666';
                          // Sort items by value (highest to lowest) to match visual order (top to bottom)
                          const items = payload
                            .filter(item => item.value > 0)
                            .sort((a, b) => b.value - a.value);
                          
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-xs">
                              <p className="font-bold mb-2" style={{ color: platformColor }}>{platform}</p>
                              {items.map((item: { dataKey: string; value: number; payload: Record<string, string | number> }, idx: number) => {
                                const productNameKey = `${item.dataKey}Name`;
                                const productName = (item.payload[productNameKey] || 'Product') as string;
                                // Determine color based on which product it is
                                const isProduct1 = item.dataKey === 'product1';
                                const isProduct2 = item.dataKey === 'product2';
                                let segmentColor = '#666';
                                if (platform === 'TikTok') {
                                  segmentColor = isProduct1 ? '#000000' : isProduct2 ? '#4A4A4A' : '#8B8B8B';
                                } else if (platform === 'Shopee') {
                                  segmentColor = isProduct1 ? '#EE4D2D' : isProduct2 ? '#F37258' : '#F89D87';
                                } else if (platform === 'Lazada') {
                                  segmentColor = isProduct1 ? '#0F146D' : isProduct2 ? '#3B4BA0' : '#6D7BC7';
                                }
                                return (
                                  <div key={idx} className="mb-1 flex items-center gap-2">
                                    <div style={{ width: '12px', height: '12px', backgroundColor: segmentColor, borderRadius: '2px' }} />
                                    <div>
                                      <p style={{ color: '#000000', fontWeight: '600', marginBottom: '2px' }}>{productName}</p>
                                      <p style={{ color: '#059669', fontWeight: '600' }}>{formatCurrency(item.value as number)}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Reverse order: Product3 at bottom, Product1 at top (highest) */}
                    {/* Product 3 - Lightest shade (renders first = bottom) */}
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
                    {/* Product 2 - Medium shade (renders second = middle) */}
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
                    {/* Product 1 - Base color (darkest, renders last = top) */}
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
            <h4 className="text-base font-semibold font-title text-header mb-1">Sales Trend by Platform</h4>
            <p className="text-xs text-gray-500 mb-4">Daily sales revenue across all platforms for the selected week</p>
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
                    tickFormatter={(value: number) => formatCurrency(value)}
                  />
                  <Tooltip 
                    content={({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) => {
                      if (active && payload && payload.length && label) {
                        const date = new Date(label);
                        const formattedDate = date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        timeZone: 'Asia/Manila'
                        });
                        const platformColors: { [key: string]: string } = {
                          'TikTok': '#000000',
                          'Shopee': '#EE4D2D',
                          'Lazada': '#0F146D'
                        };
                        
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-xs">
                            <p className="font-bold mb-2 text-gray-900" style={{ fontSize: '13px' }}>Date: {formattedDate}</p>
                            {payload.map((item, idx) => {
                              const platformName = item.name as string;
                              const platformColor = platformColors[platformName] || '#666';
                              return (
                                <p key={idx} style={{ color: platformColor, fontWeight: '600', marginBottom: '4px' }}>
                                  {platformName}: {formatCurrency(item.value as number)}
                                </p>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
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
            <h4 className="text-base font-semibold font-title text-header mb-1">Top 5 Revenue by Product Category</h4>
            <p className="text-xs text-gray-500 mb-4">Revenue breakdown by product category with percentage of total sales</p>
            <div className="h-64">
              {revenueByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByCategory.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="revenue"
                      nameKey="category"
                    >
                      {revenueByCategory.slice(0, 5).map((entry, index) => {
                        const colors = [
                          '#EE4D2D', '#0F146D', '#000000', '#059669', '#DC2626'
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
                              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#000000', fontSize: '13px' }}>{data.category}</p>
                              <p style={{ margin: '0 0 4px 0', color: '#047857', fontWeight: '600' }}>Revenue: {formatCurrency(data.revenue)}</p>
                              <p style={{ margin: '0 0 4px 0', color: '#666' }}>This category contributes <span style={{ color: '#047857', fontWeight: '600' }}>{data.percentage.toFixed(2)}%</span> of your total sales</p>
                              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#999', fontStyle: 'italic' }}>Focus marketing efforts here for maximum impact</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                      formatter={(value: string, entry: { name: string; value: number; color: string }) => (
                        <span style={{ color: entry.color, marginLeft: '8px' }}>{value}</span>
                      )}
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
            <h4 className="text-base font-semibold font-title text-header mb-1">Average Order Value Trend</h4>
            <p className="text-xs text-gray-500 mb-4">Average transaction value per platform over time</p>
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
                      tickFormatter={(value: number) => formatCurrency(value)}
                      width={80}
                    />
                    <Tooltip 
                      content={({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) => {
                        if (active && payload && payload.length) {
                          const date = new Date(label as string);
                          const formattedDate = date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          timeZone: 'Asia/Manila'
                          });
                          const platformColors: { [key: string]: string } = {
                            'TikTok': '#000000',
                            'Shopee': '#EE4D2D',
                            'Lazada': '#0F146D'
                          };
                          
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-xs">
                              <p className="font-bold mb-2 text-gray-900" style={{ fontSize: '13px' }}>Date: {formattedDate}</p>
                              {payload.map((item, idx) => {
                                const platformName = item.name;
                                const platformColor = platformColors[platformName] || '#666';
                                return (
                                  <p key={idx} style={{ color: platformColor, fontWeight: '600', marginBottom: '4px' }}>
                                    {platformName}: {formatCurrency(item.value)}
                                  </p>
                                );
                              })}
                              <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                                This shows the average amount customers spend per order. Higher values indicate stronger customer purchasing power or effective upselling strategies.
                              </p>
                            </div>
                          );
                        }
                        return null;
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
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-semibold font-title text-header">Top 5 Selling Products</h4>
              <p className="text-xs text-gray-500 mt-1">
                Best performing products by total revenue across all platforms for the selected week
              </p>
            </div>
          </div>
          {topProducts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} margin={{ top: 5, right: 10, left: 5, bottom: 60 }}>
                    <XAxis 
                      dataKey="product_name" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={0}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value: number) => formatCurrency(value)}
                      width={85}
                      label={{ 
                        value: 'Revenue', 
                        angle: -90, 
                        position: 'insideLeft', 
                        offset: 15,
                        style: { 
                          textAnchor: 'middle',
                          fill: '#666',
                          fontSize: 12,
                          fontWeight: 500
                        } 
                      }}
                    />
                    <Tooltip 
                      content={({ active, payload }: { active?: boolean; payload?: { payload: { product_name: string; brand: string; total_revenue: number; total_quantity_sold: number; platforms?: string } }[] }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const platforms = (data.platforms || '').split(', ').filter((p: string) => p);
                          const platformColors: { [key: string]: string } = {
                            'tiktok': '#000000',
                            'shopee': '#EE4D2D',
                            'lazada': '#0F146D'
                          };
                          const toCamelCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
                          
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-xs">
                              <p className="font-bold mb-2" style={{ color: '#047857' }}>{data.product_name}</p>
                              <p>Brand: <span className="font-semibold">{data.brand}</span></p>
                              <p>Revenue: <span className="font-semibold" style={{ color: '#059669' }}>{formatCurrency(data.total_revenue)}</span></p>
                              <p>Quantity Sold: <span className="font-semibold" style={{ color: '#059669' }}>{toNumber(data.total_quantity_sold).toFixed(0)}</span></p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {platforms.map((platform: string, idx: number) => {
                                  const platformKey = platform.toLowerCase();
                                  const platformColor = platformColors[platformKey] || '#666';
                                  return (
                                    <span key={idx} style={{ color: platformColor, fontWeight: '600' }}>
                                      {toCamelCase(platform)}{idx < platforms.length - 1 ? ',' : ''}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="total_revenue" 
                      fill="#059669"
                      name="Revenue"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
              {topProducts.map((product, index) => {
                  const qtySold = toNumber(product.total_quantity_sold);
                  const soldColor = qtySold === 0 ? 'text-red-600' : qtySold < 3 ? 'text-orange-600' : 'text-gray-500';
                  return (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{product.product_name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1 flex-wrap">
                          <span className="font-medium">{product.brand}</span>
                          {product.platforms && (
                            <>
                              <span className="flex items-center">•</span>
                              <div className="flex items-center gap-1">
                                {(product.platforms as string).split(', ').map((platform: string, idx: number) => {
                                const platformKey = platform.toLowerCase();
                                const platformColors: { [key: string]: string } = {
                                  'tiktok': '#000000',
                                  'shopee': '#EE4D2D',
                                  'lazada': '#0F146D'
                                };
                                const toCamelCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
                                const color = platformColors[platformKey] || '#666';
                                return (
                                  <span key={idx} style={{ color, fontWeight: '600' }}>
                                    {toCamelCase(platform)}{idx < (product.platforms as string).split(', ').length - 1 ? ', ' : ''}
                                  </span>
                                );
                              })}
                    </div>
                            </>
                          )}
                  </div>
                  </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(product.total_revenue)}</p>
                      <p className={`text-xs font-semibold ${soldColor}`}>{qtySold.toFixed(0)} sold</p>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No sales data available</p>
            </div>
          )}
        </div>

        {/* Underperforming Products */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-semibold font-title text-header">Underperforming Products</h4>
              <p className="text-xs text-gray-500 mt-1">
                Products with ≥10 stock units but ≤5 sales for the selected week
              </p>
            </div>
          </div>
          {underperformingProducts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={underperformingProducts.slice(0, 8)} margin={{ top: 5, right: 10, left: 5, bottom: 60 }}>
                    <XAxis 
                      dataKey="product_name" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={0}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Stock Level', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle' } }}
                      width={60}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      label={{ 
                        value: 'Sales Revenue', 
                        angle: 90, 
                        position: 'insideRight', 
                        offset: -5,
                        style: { 
                          textAnchor: 'middle',
                          fill: '#666',
                          fontSize: 12
                        } 
                      }}
                      tickFormatter={(value: number) => formatCurrency(value)}
                      width={75}
                    />
                    <Tooltip 
                      content={({ active, payload }: { active?: boolean; payload?: { payload?: { product_name?: string; stock?: number; total_quantity_sold?: number; total_revenue?: number; last_sale_date?: string | null; listed_platforms?: string }; name?: string; value?: number; dataKey?: string }[] }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const stockBar = payload.find(p => p.dataKey === 'stock');
                          const revenueBar = payload.find(p => p.dataKey === 'total_revenue');
                          if (!data) return null;
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-xs">
                              <p className="font-bold mb-2" style={{ color: '#047857' }}>{data.product_name}</p>
                                <div className="flex items-center gap-2 mb-2">
                                <div style={{ width: '8px', height: '8px', backgroundColor: '#EE4D2D', borderRadius: '2px' }} />
                                <p>Stock Level: <span className="font-semibold text-gray-900">{stockBar && typeof stockBar.value === 'number' ? stockBar.value.toLocaleString() : '0'} units</span></p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div style={{ width: '8px', height: '8px', backgroundColor: '#0F146D', borderRadius: '2px' }} />
                                <p>Sales Revenue: <span className="font-semibold" style={{ color: '#0F146D' }}>{formatCurrency(revenueBar?.value || 0)}</span></p>
                              </div>
                              <p className="mt-2">Sales: <span className="font-semibold" style={{ color: toNumber(data.total_quantity_sold) === 0 ? '#DC2626' : '#F97316' }}>{toNumber(data.total_quantity_sold).toFixed(0)} units</span></p>
                              {data.listed_platforms ? (
                                <div className="mt-2">
                                  <span className="mr-2">Platforms:</span>
                                  <span className="flex items-center gap-1 flex-wrap">
                                    {data.listed_platforms.split(', ').map((platform: string, idx: number) => {
                                      const platformKey = platform.toLowerCase();
                                      const platformColors: { [key: string]: string } = {
                                        'tiktok': '#000000',
                                        'shopee': '#EE4D2D',
                                        'lazada': '#0F146D'
                                      };
                                      const toCamelCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
                                      const color = platformColors[platformKey] || '#666';
                                      return (
                                        <span key={idx} className="font-semibold" style={{ color }}>
                                          {toCamelCase(platform)}{idx < (data.listed_platforms as string).split(', ').length - 1 ? ', ' : ''}
                                        </span>
                                      );
                                    })}
                                  </span>
                                </div>
                              ) : (
                                <p className="mt-2 text-amber-600 font-semibold">Not listed on any platform</p>
                              )}
                              {!data.last_sale_date && (
                                <p className="text-gray-600 mt-2 italic">No sales this week</p>
                              )}
                              {toNumber(data.total_quantity_sold) === 0 && (
                                <p className="text-xs text-amber-600 mt-2">💡 Consider running a promotion</p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      yAxisId="left" 
                      dataKey="stock" 
                      fill="#EE4D2D" 
                      name="Stock Level"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Bar 
                      yAxisId="right" 
                      dataKey="total_revenue" 
                      fill="#0F146D" 
                      name="Sales Revenue"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                      align="center"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              {/* List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {underperformingProducts.slice(0, 10).map((product, index) => (
                  <div key={product.product_id} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{product.product_name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1 flex-wrap">
                          <span className="font-medium">{product.brand}</span>
                          {product.listed_platforms && (
                            <>
                              <span className="flex items-center">•</span>
                              <div className="flex items-center gap-1">
                                {(product.listed_platforms as string).split(', ').map((platform: string, idx: number) => {
                                  const platformKey = platform.toLowerCase();
                                  const platformColors: { [key: string]: string } = {
                                    'tiktok': '#000000',
                                    'shopee': '#EE4D2D',
                                    'lazada': '#0F146D'
                                  };
                                  const toCamelCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
                                  const color = platformColors[platformKey] || '#666';
                                  return (
                                    <span key={idx} style={{ color, fontWeight: '600' }}>
                                      {toCamelCase(platform)}{idx < (product.listed_platforms as string).split(', ').length - 1 ? ', ' : ''}
                                    </span>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-700 font-semibold">{product.stock} stock</span>
                        <span className="text-gray-400">vs</span>
                        <span className={`text-xs font-semibold ${toNumber(product.total_quantity_sold) === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                          {toNumber(product.total_quantity_sold).toFixed(0)} sold
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-900">{formatCurrency(product.total_revenue)}</p>
                      {!product.listed_platforms && (
                        <p className="text-xs text-amber-600 mt-1">Not listed</p>
                      )}
                  </div>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No underperforming products found</p>
              <p className="text-xs mt-1">All products are selling well!</p>
            </div>
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