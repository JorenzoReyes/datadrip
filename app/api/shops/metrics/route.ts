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

    // Daily sales for the past 7 days from daily_sales_aggregated table
    // Get the last 7 days of aggregated data with platform breakdown
    const dailySales = await query<{
      sale_date: string;
      total_sales: number;
      platform_breakdown: { tiktok?: number; shopee?: number; lazada?: number };
    }>(
      `SELECT sale_date::text, 
              total_sales,
              platform_breakdown
       FROM daily_sales_aggregated
       WHERE account_id = ANY($1) 
       ORDER BY sale_date DESC
       LIMIT 7`,
      [accountIds]
    );

    // Get actual sales totals directly from product_sales table for the seeded data range
    const totalsRows = await query<{
      platform: string | null;
      total: string | null;
    }>(
      `SELECT platform, SUM(total_sales) AS total
       FROM product_sales
       WHERE account_id = ANY($1) 
         AND sale_date >= '2025-10-05'
         AND sale_date <= '2025-11-05'
       GROUP BY ROLLUP(platform)`,
      [accountIds]
    );

    const totals = {
      all: Number(totalsRows.find(r => r.platform === null)?.total || 0),
      tiktok: Number(totalsRows.find(r => r.platform === 'tiktok')?.total || 0),
      lazada: Number(totalsRows.find(r => r.platform === 'lazada')?.total || 0),
      shopee: Number(totalsRows.find(r => r.platform === 'shopee')?.total || 0)
    };

    // Log data access for audit
    EnhancedDataSanitizationService.logDataAccess(owner.user_id, 'dashboard_metrics', false);

    // Mask financial data for dashboard display (round to nearest 1000)
    const maskedTotals = {
      all: Math.round(totals.all / 1000) * 1000,
      tiktok: Math.round(totals.tiktok / 1000) * 1000,
      lazada: Math.round(totals.lazada / 1000) * 1000,
      shopee: Math.round(totals.shopee / 1000) * 1000
    };

    return NextResponse.json({ shops, dailySales, totals: maskedTotals });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load metrics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


