import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../utils/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    // Get account IDs for the user
    const accountRows = await query<{ account_id: number }>(
      `SELECT a.account_id 
       FROM accounts a 
       JOIN users u ON a.owner_user_id = u.user_id 
       WHERE u.email = $1`,
      [email]
    );

    if (accountRows.length === 0) {
      return NextResponse.json({ topProducts: [] });
    }

    const accountIds = accountRows.map(row => row.account_id);

    // Get date range from query parameters, or use current week as default
    let startDateStr = searchParams.get('startDate');
    let endDateStr = searchParams.get('endDate');
    
    // If dates not provided, calculate current week in Philippine time
    if (!startDateStr || !endDateStr) {
      const now = new Date();
      const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      const currentDayOfWeek = phTime.getDay();
      
      const startOfWeek = new Date(phTime);
      startOfWeek.setDate(phTime.getDate() - currentDayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      startDateStr = startOfWeek.toISOString().split('T')[0];
      endDateStr = endOfWeek.toISOString().split('T')[0];
    }

    // Get top 3 products for current week with platform breakdown from product_sales
    const topProducts = await query<{
      product_id: number;
      product_name: string;
      platform: string;
      total_revenue: number;
    }>(
      `SELECT 
        p.product_id,
        p.name as product_name,
        ps.platform,
        SUM(ps.total_sales) as total_revenue
      FROM products p
      JOIN product_sales ps ON p.product_id = ps.product_id
      WHERE ps.account_id = ANY($1)
        AND ps.sale_date >= $2::date
        AND ps.sale_date <= $3::date
      GROUP BY p.product_id, p.name, ps.platform
      ORDER BY total_revenue DESC`,
      [accountIds, startDateStr, endDateStr]
    );

    // Organize data for stacked bar chart by platform
    const platforms = ['tiktok', 'shopee', 'lazada'];
    
    const chartData = platforms.map(platform => {
      const platformProducts = topProducts
        .filter(p => p.platform === platform)
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 3);

      const result: { 
        platform: string; 
        platformDisplay: string; 
        product1: number; 
        product2: number; 
        product3: number; 
        product1Name: string; 
        product2Name: string; 
        product3Name: string; 
      } = { 
        platform,
        platformDisplay: platform.charAt(0).toUpperCase() + platform.slice(1),
        product1: 0,
        product2: 0,
        product3: 0,
        product1Name: '',
        product2Name: '',
        product3Name: ''
      };
      
      // Add products for this platform
      platformProducts.forEach((product, index) => {
        if (index === 0) {
          result.product1 = product.total_revenue;
          result.product1Name = product.product_name;
        } else if (index === 1) {
          result.product2 = product.total_revenue;
          result.product2Name = product.product_name;
        } else if (index === 2) {
          result.product3 = product.total_revenue;
          result.product3Name = product.product_name;
        }
      });

      // Fill empty slots with 0
      for (let i = platformProducts.length; i < 3; i++) {
        if (i === 0) {
          result.product1 = 0;
          result.product1Name = '';
        } else if (i === 1) {
          result.product2 = 0;
          result.product2Name = '';
        } else if (i === 2) {
          result.product3 = 0;
          result.product3Name = '';
        }
      }

      return result;
    });

    return NextResponse.json({
      topProducts: chartData,
      weekRange: { start: startDateStr, end: endDateStr }
    });

  } catch (error) {
    console.error('Error fetching weekly top products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly top products' },
      { status: 500 }
    );
  }
}

