import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../utils/database';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subcategoryId = searchParams.get('subcategory_id');
    
    let queryString = 'SELECT * FROM product_types WHERE is_active = true';
    const params: any[] = [];
    
    if (subcategoryId) {
      queryString += ' AND subcategory_id = $1';
      params.push(subcategoryId);
    }
    
    queryString += ' ORDER BY display_order, name';
    
    const result = await query(queryString, params);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching product types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product types' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { subcategory_id, name, description, display_order, is_active = true } = await req.json();
    
    if (!subcategory_id || !name) {
      return NextResponse.json(
        { error: 'Subcategory ID and product type name are required' },
        { status: 400 }
      );
    }

    const result = await queryOne(
      `INSERT INTO product_types (subcategory_id, name, description, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [subcategory_id, name, description || null, display_order || 0, is_active]
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating product type:', error);
    return NextResponse.json(
      { error: 'Failed to create product type' },
      { status: 500 }
    );
  }
}
