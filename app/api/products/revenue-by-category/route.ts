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
      return NextResponse.json({ revenueByCategory: [] });
    }

    const accounts = await query<{ account_id: number }>(
      'SELECT account_id FROM accounts WHERE owner_user_id = $1',
      [owner[0].user_id]
    );
    const accountIds = accounts.map(acc => acc.account_id);

    if (accountIds.length === 0) {
      return NextResponse.json({ revenueByCategory: [] });
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

    // Get revenue by category
    const revenueByCategory = await query<{
      category: string;
      revenue: number;
    }>(
      `SELECT 
        COALESCE(p.category, 'Uncategorized') as category,
        SUM(ps.total_sales) as revenue
      FROM products p
      JOIN product_sales ps ON p.product_id = ps.product_id
      WHERE ps.account_id = ANY($1)
        AND ps.sale_date >= $2::date
        AND ps.sale_date <= $3::date
        ${platformFilter}
      GROUP BY COALESCE(p.category, 'Uncategorized')
      ORDER BY revenue DESC
      LIMIT 5`,
      queryParams
    );

    // Calculate total revenue and percentages
    const totalRevenue = revenueByCategory.reduce((sum, item) => sum + Number(item.revenue), 0);
    const revenueWithPercentage = revenueByCategory.map(item => ({
      ...item,
      revenue: Number(item.revenue),
      percentage: totalRevenue > 0 ? (Number(item.revenue) / totalRevenue) * 100 : 0
    }));

    // Audit logging removed for debugging

    return NextResponse.json({
      revenueByCategory: revenueWithPercentage,
      totalRevenue,
      period: `${days} days`
    });

  } catch (error) {
    console.error('Error fetching revenue by category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue by category' },
      { status: 500 }
    );
  }
}
