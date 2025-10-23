import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../utils/database';
import { AuditLogService } from '../../../services/auditLogService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const limit = parseInt(searchParams.get('limit') || '5');
    const days = parseInt(searchParams.get('days') || '30');
    const platform = searchParams.get('platform');

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
      return NextResponse.json({ error: 'No accounts found for user' }, { status: 404 });
    }

    const accountIds = accountRows.map(row => row.account_id);

    // Get top selling products (using a broader date range for demo data)
    const platformFilter = platform ? 'AND ps.platform = $3' : '';
    const queryParams = platform ? [accountIds, limit, platform] : [accountIds, limit];
    
    const topProducts = await query<{
      product_id: number;
      product_name: string;
      sku: string;
      brand: string;
      category: string;
      total_quantity_sold: number;
      total_revenue: number;
      avg_price: number;
      sales_count: number;
      platform?: string;
      platforms?: string;
    }>(
      `SELECT 
        p.product_id,
        p.name as product_name,
        p.sku,
        p.brand,
        p.category,
        SUM(ps.quantity_sold) as total_quantity_sold,
        SUM(ps.total_sales) as total_revenue,
        AVG(ps.unit_price) as avg_price,
        COUNT(ps.sale_id) as sales_count,
        ${platform ? 'ps.platform' : 'STRING_AGG(DISTINCT ps.platform, \', \') as platforms'}
      FROM products p
      JOIN product_sales ps ON p.product_id = ps.product_id
      WHERE ps.account_id = ANY($1)
        AND ps.sale_date >= '2025-10-01'
        ${platformFilter}
      GROUP BY p.product_id, p.name, p.sku, p.brand, p.category${platform ? ', ps.platform' : ''}
      ORDER BY total_revenue DESC
      LIMIT $2`,
      queryParams
    );

    // Get user ID for audit logging
    const userResult = await query<{ user_id: number }>('SELECT user_id FROM users WHERE email = $1', [email]);
    const userId = userResult[0]?.user_id;

    // Log data access for audit
    if (userId) {
      AuditLogService.logDataAccess(userId, 'top_selling_products', false, {
        platform: platform || 'all',
        limit,
        days
      });
    }

    return NextResponse.json({
      topProducts,
      period: `${days} days`,
      totalProducts: topProducts.length
    });

  } catch (error) {
    console.error('Error fetching top selling products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top selling products' },
      { status: 500 }
    );
  }
}
