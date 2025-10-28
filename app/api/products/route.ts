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
  category1: string | null;
  category2: string | null;
  category3: string | null;
  category4: string | null;
  category5: string | null;
  category6: string | null;
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

// Raw DB row shape (3-levels stored)
type ProductRow = {
  product_id: number;
  sku: string | null;
  name: string;
  description: string | null;
  highlights: string | null;
  in_box: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  product_type: string | null;
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
  images: unknown;
  videos: unknown;
  promotion_image: unknown;
  attributes: unknown;
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

    // Get all products owned by this user (3-levels)
    const rows = await query<ProductRow>(
      `SELECT 
        product_id,
        sku,
        name,
        description,
        highlights,
        in_box,
        brand,
        category,
        subcategory,
        product_type,
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
        updated_at
       FROM products
       WHERE owner_user_id = $1
       ORDER BY created_at DESC`,
      [owner.user_id]
    );

    // Helper to coerce jsonb -> string[] | null
    function toStringArray(v: unknown): string[] | null {
      if (Array.isArray(v)) return v as string[];
      if (v == null) return null;
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed) ? (parsed as string[]) : null;
        } catch {
          return null;
        }
      }
      return null;
    }

    // Map to UI shape with 5-levels
    const products: Product[] = rows.map((r) => {
      const pt = (r.product_type || '').trim();
      const parts = pt.length
        ? pt.split('>').map((s) => s.trim()).filter((s) => s.length > 0)
        : [];
      return {
        product_id: r.product_id,
        sku: r.sku,
        name: r.name,
        description: r.description,
        highlights: r.highlights,
        in_box: r.in_box,
        brand: r.brand,
        category1: r.category || null,
        category2: r.subcategory || null,
        category3: parts[0] || null,
        category4: parts[1] || null,
        category5: parts[2] || null,
        category6: parts[3] || null,
        price: r.price,
        special_price: r.special_price,
        cost: r.cost,
        currency: r.currency,
        stock: r.stock,
        reorder_level: r.reorder_level,
        sales_count: r.sales_count,
        sales_revenue: r.sales_revenue,
        weight_value: r.weight_value,
        weight_unit: r.weight_unit,
        length_cm: r.length_cm,
        width_cm: r.width_cm,
        height_cm: r.height_cm,
        has_dangerous: r.has_dangerous,
        warranty_type: r.warranty_type,
        warranty_period: r.warranty_period,
        warranty_policy: r.warranty_policy,
        status: r.status,
    images: toStringArray(r.images),
    videos: toStringArray(r.videos),
    promotion_image: typeof r.promotion_image === 'string' ? r.promotion_image : null,
    attributes: (r.attributes ?? null) as { [key: string]: unknown } | null,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

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
    const { name, sku, description, highlights, in_box, brand, category, subcategory, product_type, price, special_price, stock, images, videos, promotion_image, status, weight_value, weight_unit, length_cm, width_cm, height_cm, has_dangerous, warranty_type, warranty_period, warranty_policy, attributes } = body;

    // Normalize inputs
    const normCategory = category && category.trim() ? category.trim() : null;
    const normSubcategory = subcategory && subcategory.trim() ? subcategory.trim() : null;
    const normProductType = product_type && product_type.trim() ? product_type.trim() : null;

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

    console.log('Creating product:', { name, sku, brand, category: normCategory, subcategory: normSubcategory, product_type: normProductType, price, stock, images, promotion_image });
    console.log('Images being sent to database:', images);
    console.log('Promotion image being sent to database:', promotion_image);
    console.log('Images JSON stringified:', images && Array.isArray(images) ? JSON.stringify(images) : null);

    // Insert the product (store 3-levels)
    const inserted = await queryOne<ProductRow>(
      `INSERT INTO products 
        (owner_user_id, account_id, name, sku, description, highlights, in_box, brand, category, subcategory, product_type, price, special_price, stock, images, videos, promotion_image, status, weight_value, weight_unit, length_cm, width_cm, height_cm, has_dangerous, warranty_type, warranty_period, warranty_policy, attributes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
       RETURNING 
        product_id, sku, name, description, highlights, in_box, brand, category, subcategory, product_type, price, special_price, cost, currency, stock, reorder_level, sales_count, sales_revenue, weight_value, weight_unit, length_cm, width_cm, height_cm, has_dangerous, warranty_type, warranty_period, warranty_policy, status, images, videos, promotion_image, attributes, created_at, updated_at`,
      [
        owner.user_id,
        accountId,
        name.trim(),
        sku && sku.trim() ? sku.trim() : null,
        description && description.trim() ? description.trim() : null,
        highlights && highlights.trim() ? highlights.trim() : null,
        in_box && in_box.trim() ? in_box.trim() : null,
        brand && brand.trim() ? brand.trim() : null,
        normCategory,
        normSubcategory,
        normProductType,
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

    if (!inserted) {
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    // Map to UI shape
    const parts = ((inserted.product_type || '') as string)
      .split('>')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const coerceArray = (v: unknown): string[] | null => {
      if (Array.isArray(v)) return v as string[];
      if (v == null) return null;
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed) ? (parsed as string[]) : null;
        } catch {
          return null;
        }
      }
      return null;
    };
    const apiProduct: Product = {
      product_id: inserted.product_id,
      sku: inserted.sku,
      name: inserted.name,
      description: inserted.description,
      highlights: inserted.highlights,
      in_box: inserted.in_box,
      brand: inserted.brand,
      category1: inserted.category || null,
      category2: inserted.subcategory || null,
      category3: parts[0] || null,
      category4: parts[1] || null,
      category5: parts[2] || null,
      category6: parts[3] || null,
      price: inserted.price,
      special_price: inserted.special_price,
      cost: inserted.cost,
      currency: inserted.currency,
      stock: inserted.stock,
      reorder_level: inserted.reorder_level,
      sales_count: inserted.sales_count,
      sales_revenue: inserted.sales_revenue,
      weight_value: inserted.weight_value,
      weight_unit: inserted.weight_unit,
      length_cm: inserted.length_cm,
      width_cm: inserted.width_cm,
      height_cm: inserted.height_cm,
      has_dangerous: inserted.has_dangerous,
      warranty_type: inserted.warranty_type,
      warranty_period: inserted.warranty_period,
      warranty_policy: inserted.warranty_policy,
      status: inserted.status,
      images: coerceArray(inserted.images),
      videos: coerceArray(inserted.videos),
      promotion_image: typeof inserted.promotion_image === 'string' ? inserted.promotion_image : null,
      attributes: (inserted.attributes ?? null) as { [key: string]: unknown } | null,
      created_at: inserted.created_at,
      updated_at: inserted.updated_at,
    };

    console.log('Product created successfully:', apiProduct);

    return NextResponse.json({ product: apiProduct }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create product';
    console.error('Error creating product:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
