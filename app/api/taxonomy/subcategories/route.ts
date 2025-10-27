import { NextResponse } from 'next/server';
import { query, queryOne } from '../../../utils/database';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');
    
    let queryString = 'SELECT * FROM subcategories WHERE is_active = true';
    const params: any[] = [];
    
    if (categoryId) {
      queryString += ' AND category_id = $1';
      params.push(categoryId);
    }
    
    queryString += ' ORDER BY display_order, name';
    
    const result = await query(queryString, params);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subcategories' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { category_id, name, description, display_order, is_active = true } = await req.json();
    
    if (!category_id || !name) {
      return NextResponse.json(
        { error: 'Category ID and subcategory name are required' },
        { status: 400 }
      );
    }

    const result = await queryOne(
      `INSERT INTO subcategories (category_id, name, description, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [category_id, name, description || null, display_order || 0, is_active]
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to create subcategory' },
      { status: 500 }
    );
  }
}
