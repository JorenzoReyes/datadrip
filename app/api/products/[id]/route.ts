import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../utils/database';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const resolvedParams = await params;
    const productId = parseInt(resolvedParams.id);

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    // Get user ID from email
    const owner = await queryOne<{ user_id: number }>('SELECT user_id FROM users WHERE email = $1', [email]);
    
    if (!owner) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all accounts owned by this user
    const accounts = await query<{ account_id: number }>('SELECT account_id FROM accounts WHERE owner_user_id = $1', [owner.user_id]);
    const accountIds = accounts.map(a => a.account_id);
    
    if (accountIds.length === 0) {
      return NextResponse.json({ error: 'No accounts found' }, { status: 404 });
    }

    // Verify the product belongs to this user's account
    const product = await queryOne<{ product_id: number; account_id: number }>(
      'SELECT product_id, account_id FROM products WHERE product_id = $1',
      [productId]
    );

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!accountIds.includes(product.account_id)) {
      return NextResponse.json({ error: 'Unauthorized to edit this product' }, { status: 403 });
    }

    // Parse the request body
    const body = await req.json();
    const { name, brand, category, price, stock } = body;

    console.log('Updating product:', productId, 'with data:', body);

    // Build dynamic UPDATE query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (brand !== undefined) {
      updates.push(`brand = $${paramCount++}`);
      values.push(brand);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }
    if (stock !== undefined) {
      updates.push(`stock = $${paramCount++}`);
      values.push(stock);
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 1) {
      // Only updated_at was added, no actual changes
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Add product_id as the last parameter
    values.push(productId);

    const updateQuery = `UPDATE products SET ${updates.join(', ')} WHERE product_id = $${paramCount}`;
    console.log('Executing UPDATE query:', updateQuery);
    console.log('With values:', values);

    // Execute the update
    const result = await query(
      updateQuery,
      values
    );

    console.log('UPDATE result:', result);

    // Fetch and return the updated product
    const updatedProduct = await queryOne<{
      product_id: number;
      name: string;
      brand: string | null;
      category: string | null;
      price: number;
      stock: number;
      updated_at: string;
    }>(
      `SELECT product_id, name, brand, category, price, stock, updated_at 
       FROM products 
       WHERE product_id = $1`,
      [productId]
    );

    return NextResponse.json({ 
      success: true, 
      product: updatedProduct 
    });

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update product';
    console.error('Error updating product:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

