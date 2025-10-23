import { NextResponse } from 'next/server';
import { query, queryOne } from '../../utils/database';

type Product = {
  product_id: number;
  sku: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  product_type: string | null;
  price: number;
  cost: number | null;
  currency: string;
  stock: number;
  reorder_level: number | null;
  sales_count: number;
  sales_revenue: number;
  status: string;
  is_archived: boolean;
  images: string[] | null;
  created_at: string;
  updated_at: string;
};

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

    // Get all products owned by this user
    const products = await query<Product>(
      `SELECT 
        product_id,
        sku,
        name,
        description,
        brand,
        category,
        subcategory,
        product_type,
        price,
        cost,
        currency,
        stock,
        reorder_level,
        sales_count,
        sales_revenue,
        status,
        is_archived,
        images,
        created_at,
        updated_at
       FROM products
       WHERE owner_user_id = $1
       AND is_archived = false
       ORDER BY created_at DESC`,
      [owner.user_id]
    );

    return NextResponse.json({ products });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load products';
    console.error('Error fetching products:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    // Get user ID from email
    const owner = await queryOne<{ user_id: number }>('SELECT user_id FROM users WHERE email = $1', [email]);
    
    if (!owner) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the first account owned by this user
    const accounts = await query<{ account_id: number }>('SELECT account_id FROM accounts WHERE owner_user_id = $1', [owner.user_id]);
    
    // Use the first account if available, otherwise use null
    const accountId = accounts.length > 0 ? accounts[0].account_id : null;

    // Parse request body
    const body = await req.json();
    const { name, sku, description, brand, category, subcategory, product_type, price, stock, images } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    if (price === undefined || price === null || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }

    if (stock === undefined || stock === null || isNaN(parseInt(stock)) || parseInt(stock) < 0) {
      return NextResponse.json({ error: 'Valid stock is required' }, { status: 400 });
    }

    // Check if SKU already exists (if provided)
    if (sku && sku.trim()) {
      const existingSku = await queryOne<{ product_id: number }>(
        'SELECT product_id FROM products WHERE sku = $1',
        [sku.trim()]
      );
      
      if (existingSku) {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
      }
    }

    console.log('Creating product:', { name, sku, brand, category, price, stock, images });
    console.log('Images being sent to database:', images);
    console.log('Images JSON stringified:', images && Array.isArray(images) ? JSON.stringify(images) : null);

    // Insert the product
    const newProduct = await queryOne<Product>(
      `INSERT INTO products 
        (owner_user_id, account_id, name, sku, description, brand, category, subcategory, product_type, price, stock, images, status, is_archived)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', false)
       RETURNING 
        product_id,
        sku,
        name,
        description,
        brand,
        category,
        subcategory,
        product_type,
        price,
        cost,
        currency,
        stock,
        reorder_level,
        sales_count,
        sales_revenue,
        status,
        is_archived,
        images,
        created_at,
        updated_at`,
      [
        owner.user_id,
        accountId,
        name.trim(),
        sku && sku.trim() ? sku.trim() : null,
        description && description.trim() ? description.trim() : null,
        brand && brand.trim() ? brand.trim() : null,
        category && category.trim() ? category.trim() : null,
        subcategory && subcategory.trim() ? subcategory.trim() : null,
        product_type && product_type.trim() ? product_type.trim() : null,
        parseFloat(price),
        parseInt(stock),
        images && Array.isArray(images) ? JSON.stringify(images) : null
      ]
    );

    console.log('Product created successfully:', newProduct);

    return NextResponse.json({ product: newProduct }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create product';
    console.error('Error creating product:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
