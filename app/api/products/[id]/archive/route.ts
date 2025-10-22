import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../../utils/database';

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

    // Verify the product belongs to this user
    const product = await queryOne<{ product_id: number; owner_user_id: number; is_archived: boolean }>(
      'SELECT product_id, owner_user_id, is_archived FROM products WHERE product_id = $1',
      [productId]
    );

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.owner_user_id !== owner.user_id) {
      return NextResponse.json({ error: 'Unauthorized to archive this product' }, { status: 403 });
    }

    console.log('Archiving product:', productId);

    // Archive the product (set is_archived to true)
    await query(
      'UPDATE products SET is_archived = true, updated_at = CURRENT_TIMESTAMP WHERE product_id = $1',
      [productId]
    );

    console.log('Product archived successfully:', productId);

    return NextResponse.json({ success: true, message: 'Product archived successfully' });
  } catch (e) {
    console.error('API Error:', e);
    const message = e instanceof Error ? e.message : 'Failed to archive product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

