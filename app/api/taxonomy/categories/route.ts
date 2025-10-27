import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../utils/database';

export async function GET() {
  try {
    console.log('Categories API called');
    const result = await query(
      'SELECT * FROM categories WHERE is_active = true ORDER BY display_order, name'
    );
    console.log('Categories result:', result.length, 'categories found');
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { name, description, display_order, is_active = true } = await req.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const result = await queryOne(
      `INSERT INTO categories (name, description, display_order, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description || null, display_order || 0, is_active]
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
