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

    // Verify the product belongs to this user
    const product = await queryOne<{ product_id: number; owner_user_id: number; name: string }>(
      'SELECT product_id, owner_user_id, name FROM products WHERE product_id = $1',
      [productId]
    );

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.owner_user_id !== owner.user_id) {
      return NextResponse.json({ error: 'Unauthorized to update this product' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const {
      name,
      sku,
      description,
      highlights,
      in_box,
      brand,
      category,
      subcategory,
      product_type,
      price,
      special_price,
      stock,
      images,
      videos,
      promotion_image,
      status,
      weight_value,
      weight_unit,
      length_cm,
      width_cm,
      height_cm,
      has_dangerous,
      warranty_type,
      warranty_period,
      warranty_policy,
      attributes
    } = body;

    // Validate required fields
    if (!name || !price) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (sku !== undefined) {
      updateFields.push(`sku = $${paramCount++}`);
      values.push(sku && sku.trim() ? sku.trim() : null);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description && description.trim() ? description.trim() : null);
    }
    if (highlights !== undefined) {
      updateFields.push(`highlights = $${paramCount++}`);
      values.push(highlights && highlights.trim() ? highlights.trim() : null);
    }
    if (in_box !== undefined) {
      updateFields.push(`in_box = $${paramCount++}`);
      values.push(in_box && in_box.trim() ? in_box.trim() : null);
    }
    if (brand !== undefined) {
      updateFields.push(`brand = $${paramCount++}`);
      values.push(brand && brand.trim() ? brand.trim() : null);
    }
    if (category !== undefined) {
      updateFields.push(`category = $${paramCount++}`);
      values.push(category && category.trim() ? category.trim() : null);
    }
    if (subcategory !== undefined) {
      updateFields.push(`subcategory = $${paramCount++}`);
      values.push(subcategory && subcategory.trim() ? subcategory.trim() : null);
    }
    if (product_type !== undefined) {
      updateFields.push(`product_type = $${paramCount++}`);
      values.push(product_type && product_type.trim() ? product_type.trim() : null);
    }
    if (price !== undefined) {
      updateFields.push(`price = $${paramCount++}`);
      values.push(parseFloat(price));
    }
    if (special_price !== undefined) {
      updateFields.push(`special_price = $${paramCount++}`);
      values.push(special_price ? parseFloat(special_price) : null);
    }
    if (stock !== undefined) {
      updateFields.push(`stock = $${paramCount++}`);
      values.push(stock && !isNaN(parseInt(stock)) ? parseInt(stock) : 0);
    }
    if (images !== undefined) {
      updateFields.push(`images = $${paramCount++}`);
      values.push(images && images.length > 0 ? JSON.stringify(images) : null);
    }
    if (videos !== undefined) {
      updateFields.push(`videos = $${paramCount++}`);
      values.push(videos && videos.length > 0 ? JSON.stringify(videos) : null);
    }
    if (promotion_image !== undefined) {
      updateFields.push(`promotion_image = $${paramCount++}`);
      values.push(promotion_image && promotion_image.trim() ? promotion_image.trim() : null);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(status && status.trim() ? status.trim() : 'active');
    }
    if (weight_value !== undefined) {
      updateFields.push(`weight_value = $${paramCount++}`);
      values.push(weight_value ? parseFloat(weight_value) : null);
    }
    if (weight_unit !== undefined) {
      updateFields.push(`weight_unit = $${paramCount++}`);
      values.push(weight_unit && weight_unit.trim() ? weight_unit.trim() : null);
    }
    if (length_cm !== undefined) {
      updateFields.push(`length_cm = $${paramCount++}`);
      values.push(length_cm ? parseFloat(length_cm) : null);
    }
    if (width_cm !== undefined) {
      updateFields.push(`width_cm = $${paramCount++}`);
      values.push(width_cm ? parseFloat(width_cm) : null);
    }
    if (height_cm !== undefined) {
      updateFields.push(`height_cm = $${paramCount++}`);
      values.push(height_cm ? parseFloat(height_cm) : null);
    }
    if (has_dangerous !== undefined) {
      updateFields.push(`has_dangerous = $${paramCount++}`);
      values.push(has_dangerous);
    }
    if (warranty_type !== undefined) {
      updateFields.push(`warranty_type = $${paramCount++}`);
      values.push(warranty_type && warranty_type.trim() ? warranty_type.trim() : null);
    }
    if (warranty_period !== undefined) {
      updateFields.push(`warranty_period = $${paramCount++}`);
      values.push(warranty_period && warranty_period.trim() ? warranty_period.trim() : null);
    }
    if (warranty_policy !== undefined) {
      updateFields.push(`warranty_policy = $${paramCount++}`);
      values.push(warranty_policy && warranty_policy.trim() ? warranty_policy.trim() : null);
    }
    if (attributes !== undefined) {
      updateFields.push(`attributes = $${paramCount++}`);
      values.push(attributes && Object.keys(attributes).length > 0 ? JSON.stringify(attributes) : null);
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updateFields.length === 1) { // Only updated_at
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Add product ID as the last parameter
    values.push(productId);

    const updateQuery = `
      UPDATE products 
      SET ${updateFields.join(', ')}
      WHERE product_id = $${paramCount}
      RETURNING *
    `;

    console.log('Updating product:', productId, 'with fields:', updateFields);

    const updatedProduct = await queryOne(updateQuery, values);

    console.log('Product updated successfully:', productId);

    return NextResponse.json({ 
      success: true, 
      product: updatedProduct,
      message: 'Product updated successfully' 
    });
  } catch (e) {
    console.error('API Error:', e);
    const message = e instanceof Error ? e.message : 'Failed to update product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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
    const product = await queryOne<{ product_id: number; owner_user_id: number; name: string }>(
      'SELECT product_id, owner_user_id, name FROM products WHERE product_id = $1',
      [productId]
    );

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.owner_user_id !== owner.user_id) {
      return NextResponse.json({ error: 'Unauthorized to delete this product' }, { status: 403 });
    }

    console.log('Deleting product:', productId, product.name);

    // Delete the product
    await query(
      'DELETE FROM products WHERE product_id = $1',
      [productId]
    );

    console.log('Product deleted successfully:', productId);

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (e) {
    console.error('API Error:', e);
    const message = e instanceof Error ? e.message : 'Failed to delete product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}