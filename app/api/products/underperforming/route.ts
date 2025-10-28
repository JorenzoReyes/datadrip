import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../utils/database';
import { AuditLogService } from '../../../services/auditLogService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const limit = parseInt(searchParams.get('limit') || '10');
    const days = parseInt(searchParams.get('days') || '30');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const minStockThreshold = parseInt(searchParams.get('minStock') || '10'); // Products with at least this much stock
    const maxSalesThreshold = parseInt(searchParams.get('maxSales') || '5'); // Products with max this many sales

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

    // Calculate the start date for the period
    let startDateStr: string;
    if (startDateParam && endDateParam) {
      startDateStr = startDateParam;
    } else {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDateStr = startDate.toISOString().split('T')[0];
    }

    // Get underperforming products: high stock but low sales
    // This query considers:
    // 1. Products from product_listings (listed on platforms) OR products with account_id
    // 2. Sales data from product_sales table only
    // 3. Stock levels from products table
    // 4. Finds products with high stock but low/zero sales in the period
    const underperformingProducts = await query<{
      product_id: number;
      product_name: string;
      sku: string;
      brand: string;
      category: string;
      stock: number;
      price: number;
      total_quantity_sold: number;
      total_revenue: number;
      avg_price: number;
      sales_count: number;
      stock_to_sales_ratio: number;
      last_sale_date: string | null;
      platforms?: string;
      listed_platforms?: string;
    }>(
      `SELECT 
        p.product_id,
        p.name as product_name,
        p.sku,
        p.brand,
        p.category,
        p.stock,
        p.price,
        COALESCE(SUM(ps.quantity_sold), 0) as total_quantity_sold,
        COALESCE(SUM(ps.total_sales), 0) as total_revenue,
        COALESCE(AVG(ps.unit_price), p.price) as avg_price,
        COUNT(ps.sale_id) as sales_count,
        CASE 
          WHEN COALESCE(SUM(ps.quantity_sold), 0) = 0 THEN p.stock * 1000
          ELSE p.stock::numeric / NULLIF(SUM(ps.quantity_sold), 0)
        END as stock_to_sales_ratio,
        MAX(ps.sale_date)::text as last_sale_date,
        STRING_AGG(DISTINCT ps.platform, ', ') FILTER (WHERE ps.platform IS NOT NULL) as platforms,
        STRING_AGG(DISTINCT pl.platform, ', ') FILTER (WHERE pl.platform IS NOT NULL AND pl.listing_status = 'active') as listed_platforms
      FROM products p
      LEFT JOIN product_sales ps ON p.product_id = ps.product_id 
        AND ps.account_id = ANY($1)
        AND ps.sale_date >= $5::date
        ${endDateParam ? 'AND ps.sale_date <= $6::date' : ''}
      LEFT JOIN product_listings pl ON p.product_id = pl.product_id 
        AND pl.account_id = ANY($1)
        AND pl.listing_status = 'active'
      WHERE (p.account_id = ANY($1) OR pl.product_id IS NOT NULL)
        AND p.stock >= $2
        AND p.status = 'active'
      GROUP BY p.product_id, p.name, p.sku, p.brand, p.category, p.stock, p.price
      HAVING COUNT(ps.sale_id) <= $3
      ORDER BY stock_to_sales_ratio DESC, p.stock DESC, total_revenue ASC
      LIMIT $4`,
      endDateParam ? [accountIds, minStockThreshold, maxSalesThreshold, limit, startDateStr, endDateParam] : [accountIds, minStockThreshold, maxSalesThreshold, limit, startDateStr]
    );

    // Get user ID for audit logging
    const userResult = await query<{ user_id: number }>('SELECT user_id FROM users WHERE email = $1', [email]);
    const userId = userResult[0]?.user_id;

    // Log data access for audit
    if (userId) {
      AuditLogService.logDataAccess(userId, 'underperforming_products', false, {
        limit,
        days,
        minStock: minStockThreshold,
        maxSales: maxSalesThreshold
      });
    }

    return NextResponse.json({
      underperformingProducts,
      period: `${days} days`,
      totalProducts: underperformingProducts.length,
      filters: {
        minStock: minStockThreshold,
        maxSales: maxSalesThreshold
      }
    });

  } catch (error) {
    console.error('Error fetching underperforming products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch underperforming products' },
      { status: 500 }
    );
  }
}

