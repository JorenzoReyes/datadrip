import { NextResponse } from 'next/server';
import { query } from '../../../utils/database';

export async function GET() {
  try {
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
       ORDER BY s.account_id, s.name, s.platform`
    );

    // Sales/price summaries per platform (from product_listings)
    const listings = await query<{
      platform: string;
      total_listings: string; // pg returns as string
      avg_price: string | null;
    }>(
      `SELECT platform, COUNT(*) AS total_listings, AVG(listing_price) AS avg_price
       FROM product_listings
       GROUP BY platform
       ORDER BY platform`
    );

    // Derive simple "sales" totals using sum of listing_price as demo data
    const totalsRows = await query<{
      platform: string | null;
      total: string | null;
    }>(
      `SELECT platform, SUM(listing_price) AS total
       FROM product_listings
       GROUP BY ROLLUP(platform)`
    );

    const totals = {
      all: Number(totalsRows.find(r => r.platform === null)?.total || 0),
      tiktok: Number(totalsRows.find(r => r.platform === 'tiktok')?.total || 0),
      lazada: Number(totalsRows.find(r => r.platform === 'lazada')?.total || 0),
      shopee: Number(totalsRows.find(r => r.platform === 'shopee')?.total || 0)
    };

    return NextResponse.json({ shops, listings, totals });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load metrics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


