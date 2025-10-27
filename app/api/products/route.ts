import { NextResponse } from 'next/server';
import { query, queryOne } from '../../utils/database';

type Product = {
  product_id: number;
  sku: string | null;
  name: string;
  description: string | null;
  highlights: string | null;
  in_box: string | null;
  brand: string | null;
  category_id: number | null;
  subcategory_id: number | null;
  product_type_id: number | null;
  category_name: string | null;
  subcategory_name: string | null;
  product_type_name: string | null;
  price: number;
  special_price: number | null;
  cost: number | null;
  currency: string;
  stock: number;
  reorder_level: number | null;
  sales_count: number;
  sales_revenue: number;
  weight_value: number | null;
  weight_unit: string | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  has_dangerous: boolean;
  warranty_type: string | null;
  warranty_period: string | null;
  warranty_policy: string | null;
  status: string;
  images: string[] | null;
  videos: string[] | null;
  promotion_image: string | null;
  attributes: {[key: string]: unknown} | null;
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

    // Get all products owned by this user with taxonomy names
    const products = await query<Product>(
      `SELECT 
        p.product_id,
        p.sku,
        p.name,
        p.description,
        p.highlights,
        p.in_box,
        p.brand,
        p.category_id,
        p.subcategory_id,
        p.product_type_id,
        c.name as category_name,
        sc.name as subcategory_name,
        pt.name as product_type_name,
        p.price,
        p.special_price,
        p.cost,
        p.currency,
        p.stock,
        p.reorder_level,
        p.sales_count,
        p.sales_revenue,
        p.weight_value,
        p.weight_unit,
        p.length_cm,
        p.width_cm,
        p.height_cm,
        p.has_dangerous,
        p.warranty_type,
        p.warranty_period,
        p.warranty_policy,
        p.status,
        p.images,
        p.videos,
        p.promotion_image,
        p.attributes,
        p.created_at,
        p.updated_at
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.category_id
       LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
       LEFT JOIN product_types pt ON p.product_type_id = pt.product_type_id
       WHERE p.owner_user_id = $1
       ORDER BY p.created_at DESC`,
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
    const { name, sku, description, highlights, in_box, brand, category_id, subcategory_id, product_type_id, price, special_price, stock, images, videos, promotion_image, status, weight_value, weight_unit, length_cm, width_cm, height_cm, has_dangerous, warranty_type, warranty_period, warranty_policy, attributes } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    if (price === undefined || price === null || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }

    // Stock is now optional - only validate if provided
    if (stock !== undefined && stock !== null && stock !== '' && (isNaN(parseInt(stock)) || parseInt(stock) < 0)) {
      return NextResponse.json({ error: 'Invalid stock value' }, { status: 400 });
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

    console.log('Creating product:', { name, sku, brand, category, price, stock, images, promotion_image });
    console.log('Images being sent to database:', images);
    console.log('Promotion image being sent to database:', promotion_image);
    console.log('Images JSON stringified:', images && Array.isArray(images) ? JSON.stringify(images) : null);

    // Insert the product
    const newProduct = await queryOne<Product>(
      `INSERT INTO products 
        (owner_user_id, account_id, name, sku, description, highlights, in_box, brand, category_id, subcategory_id, product_type_id, price, special_price, stock, images, videos, promotion_image, status, weight_value, weight_unit, length_cm, width_cm, height_cm, has_dangerous, warranty_type, warranty_period, warranty_policy, attributes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
       RETURNING 
        product_id,
        sku,
        name,
        description,
        highlights,
        in_box,
        brand,
        category_id,
        subcategory_id,
        product_type_id,
        price,
        special_price,
        cost,
        currency,
        stock,
        reorder_level,
        sales_count,
        sales_revenue,
        weight_value,
        weight_unit,
        length_cm,
        width_cm,
        height_cm,
        has_dangerous,
        warranty_type,
        warranty_period,
        warranty_policy,
        status,
        images,
        videos,
        promotion_image,
        attributes,
        created_at,
        updated_at`,
      [
        owner.user_id,
        accountId,
        name.trim(),
        sku && sku.trim() ? sku.trim() : null,
        description && description.trim() ? description.trim() : null,
        highlights && highlights.trim() ? highlights.trim() : null,
        in_box && in_box.trim() ? in_box.trim() : null,
        brand && brand.trim() ? brand.trim() : null,
        category_id ? parseInt(category_id) : null,
        subcategory_id ? parseInt(subcategory_id) : null,
        product_type_id ? parseInt(product_type_id) : null,
        parseFloat(price),
        special_price && !isNaN(parseFloat(special_price)) ? parseFloat(special_price) : null,
        stock && !isNaN(parseInt(stock)) ? parseInt(stock) : 0,
        images && Array.isArray(images) ? JSON.stringify(images) : null,
        videos && Array.isArray(videos) ? JSON.stringify(videos) : null,
        promotion_image && promotion_image.trim() ? promotion_image.trim() : null,
        status || 'active',
        weight_value && !isNaN(parseFloat(weight_value)) ? parseFloat(weight_value) : null,
        weight_unit && weight_unit.trim() ? weight_unit.trim() : null,
        length_cm && !isNaN(parseFloat(length_cm)) ? parseFloat(length_cm) : null,
        width_cm && !isNaN(parseFloat(width_cm)) ? parseFloat(width_cm) : null,
        height_cm && !isNaN(parseFloat(height_cm)) ? parseFloat(height_cm) : null,
        has_dangerous || false,
        warranty_type && warranty_type.trim() ? warranty_type.trim() : null,
        warranty_period && warranty_period.trim() ? warranty_period.trim() : null,
        warranty_policy && warranty_policy.trim() ? warranty_policy.trim() : null,
        attributes && Object.keys(attributes).length > 0 ? JSON.stringify(attributes) : null
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
