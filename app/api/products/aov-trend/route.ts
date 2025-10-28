import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../utils/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const days = searchParams.get('days') || '30';
    const platform = searchParams.get('platform');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get user's account IDs
    const owner = await query<{ user_id: number }>('SELECT user_id FROM users WHERE email = $1', [email]);
    if (!owner || owner.length === 0) {
      return NextResponse.json({ aovTrend: [] });
    }

    const accounts = await query<{ account_id: number }>(
      'SELECT account_id FROM accounts WHERE owner_user_id = $1',
      [owner[0].user_id]
    );
    const accountIds = accounts.map(acc => acc.account_id);

    if (accountIds.length === 0) {
      return NextResponse.json({ aovTrend: [] });
    }

    // Use current week date range
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    
    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    // Build platform filter
    const platformFilter = platform && platform !== 'all' ? 'AND ps.platform = $4' : '';
    const queryParams = platform && platform !== 'all' ? [accountIds, startDateStr, endDateStr, platform] : [accountIds, startDateStr, endDateStr];

    // Get AOV trend data (daily average order value) grouped by platform
    const aovTrend = await query<{
      sale_date: string;
      platform: string;
      total_revenue: number;
      total_orders: number;
      aov: number;
    }>(
      `SELECT 
        ps.sale_date::text,
        ps.platform,
        SUM(ps.total_sales) as total_revenue,
        COUNT(DISTINCT ps.order_id) as total_orders,
        CASE 
          WHEN COUNT(DISTINCT ps.order_id) > 0 
          THEN SUM(ps.total_sales) / COUNT(DISTINCT ps.order_id)
          ELSE 0 
        END as aov
      FROM product_sales ps
      WHERE ps.account_id = ANY($1)
        AND ps.sale_date >= $2::date
        AND ps.sale_date <= $3::date
        ${platformFilter}
      GROUP BY ps.sale_date, ps.platform
      ORDER BY ps.sale_date ASC, ps.platform ASC`,
      queryParams
    );

    // Format the data for the chart - group by date and create platform columns
    const dateMap: { [date: string]: { date: string; tiktok?: number; shopee?: number; lazada?: number } } = {};
    
    aovTrend.forEach(item => {
      const date = item.sale_date;
      const aov = Math.round(item.aov * 100) / 100;
      
      if (!dateMap[date]) {
        dateMap[date] = { date };
      }
      
      // Type-safe platform assignment
      if (item.platform === 'tiktok') {
        dateMap[date].tiktok = aov;
      } else if (item.platform === 'shopee') {
        dateMap[date].shopee = aov;
      } else if (item.platform === 'lazada') {
        dateMap[date].lazada = aov;
      }
    });
    
    const formattedAovTrend = Object.values(dateMap).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Audit logging removed for debugging

    return NextResponse.json({
      aovTrend: formattedAovTrend,
      period: `${days} days`,
      totalDataPoints: formattedAovTrend.length
    });

  } catch (error) {
    console.error('Error fetching AOV trend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AOV trend' },
      { status: 500 }
    );
  }
}
