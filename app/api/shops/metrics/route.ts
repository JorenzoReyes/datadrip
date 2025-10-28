import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../utils/database';
import { EnhancedDataSanitizationService } from '../../../services/enhancedDataSanitizationService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const owner = await queryOne<{ user_id: number }>('SELECT user_id FROM users WHERE email = $1', [email]);
    if (!owner) {
      return NextResponse.json({ shops: [], listings: [], totals: { all: 0, tiktok: 0, lazada: 0, shopee: 0 } });
    }
    const accounts = await query<{ account_id: number }>('SELECT account_id FROM accounts WHERE owner_user_id = $1', [owner.user_id]);
    const accountIds = accounts.map(a => a.account_id);
    if (accountIds.length === 0) {
      return NextResponse.json({ shops: [], listings: [], totals: { all: 0, tiktok: 0, lazada: 0, shopee: 0 } });
    }
    // Aggregate per shop across platforms
    const shops = await query<{
      shop_id: number;
      account_id: number;
      name: string;
      platform: string;
      followers_count: number | null;
      products_count: number | null;
      rating_value: number | null;
      rating_count: number | null;
      chat_performance_percent: number | null;
    }>(
      `SELECT s.shop_id, s.account_id, s.name, s.platform, s.followers_count, s.products_count,
              s.rating_value, s.rating_count, s.chat_performance_percent
       FROM shops s
       WHERE s.account_id = ANY($1)
       ORDER BY s.account_id, s.name, s.platform`,
      [accountIds]
    );

    // Get date range from query parameters, or use current week as default
    let startDateStr = searchParams.get('startDate');
    let endDateStr = searchParams.get('endDate');
    
    // If dates not provided, calculate current week in Philippine time
    if (!startDateStr || !endDateStr) {
      const now = new Date();
      const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      const currentDayOfWeek = phTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      const startOfWeek = new Date(phTime);
      startOfWeek.setDate(phTime.getDate() - currentDayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      startDateStr = startOfWeek.toISOString().split('T')[0];
      endDateStr = endOfWeek.toISOString().split('T')[0];
    }
    
    // Get daily sales data from product_sales table for consistency
    const dailySales = await query<{
      sale_date: string;
      total_sales: number;
      platform_breakdown: { tiktok?: number; shopee?: number; lazada?: number };
    }>(
      `SELECT 
        sale_date::text,
        SUM(platform_total) as total_sales,
        jsonb_object_agg(platform, platform_total) as platform_breakdown
      FROM (
        SELECT 
          sale_date,
          platform,
          SUM(total_sales) as platform_total
        FROM product_sales
        WHERE account_id = ANY($1)
          AND sale_date >= $2::date
          AND sale_date <= $3::date
        GROUP BY sale_date, platform
      ) platform_sales
      GROUP BY sale_date
      ORDER BY sale_date ASC`,
      [accountIds, startDateStr, endDateStr]
    );

    // Log data access for audit
    EnhancedDataSanitizationService.logDataAccess(owner.user_id, 'dashboard_metrics', false);

    // Return only the daily sales data - frontend will calculate its own weekly totals
    return NextResponse.json({ shops, dailySales });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load metrics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}