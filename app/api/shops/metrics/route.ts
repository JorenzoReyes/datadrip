import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../utils/database';

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

    // Daily sales for the past 7 days from product_sales table (using seeded data range)
    // Since the dashboard shows October 14, 2025, we'll show the 7 days before that
    const dailySales = await query<{
      sale_date: string;
      platform: string;
      total_sales: number;
    }>(
      `SELECT sale_date, 
              platform,
              SUM(total_sales) as total_sales
       FROM product_sales
       WHERE account_id = ANY($1) 
         AND sale_date >= '2025-10-08'::date
         AND sale_date <= '2025-10-14'::date
       GROUP BY sale_date, platform
       ORDER BY sale_date, platform`,
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

    return NextResponse.json({ shops, dailySales, totals });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load metrics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


