import { NextResponse } from 'next/server';
import { query, queryOne } from '../../utils/database';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    // Get user ID from email
    const owner = await queryOne<{ user_id: number }>('SELECT user_id FROM users WHERE email = $1', [email]);
    
    if (!owner) {
      return NextResponse.json({ products: [] });
    }

    // Get all accounts owned by this user
    const accounts = await query<{ account_id: number }>('SELECT account_id FROM accounts WHERE owner_user_id = $1', [owner.user_id]);
    const accountIds = accounts.map(a => a.account_id);
    
    if (accountIds.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // Get all products for these accounts
    const products = await query<{
      product_id: number;
      sku: string | null;
      name: string;
      description: string | null;
      brand: string | null;
      category: string | null;
      subcategory: string | null;
      price: number;
      cost: number | null;
      currency: string;
      stock: number;
      reorder_level: number | null;
      sales_count: number;
      sales_revenue: number;
      status: string;
      is_archived: boolean;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT 
        product_id,
        sku,
        name,
        description,
        brand,
        category,
        subcategory,
        price,
        cost,
        currency,
        stock,
        reorder_level,
        sales_count,
        sales_revenue,
        status,
        is_archived,
        created_at,
        updated_at
       FROM products
       WHERE account_id = ANY($1)
       AND is_archived = false
       ORDER BY created_at DESC`,
      [accountIds]
    );

    return NextResponse.json({ products });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load products';
    console.error('Error fetching products:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

