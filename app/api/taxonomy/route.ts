import { NextResponse } from 'next/server';
import { query } from '../../utils/database';

// GET all taxonomy data
export async function GET() {
  try {
    const [categories, subcategories, productTypes] = await Promise.all([
      query('SELECT * FROM categories WHERE is_active = true ORDER BY display_order, name'),
      query('SELECT * FROM subcategories WHERE is_active = true ORDER BY display_order, name'),
      query('SELECT * FROM product_types WHERE is_active = true ORDER BY display_order, name')
    ]);

    return NextResponse.json({
      categories: categories,
      subcategories: subcategories,
      productTypes: productTypes
    });
  } catch (error) {
    console.error('Error fetching taxonomy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch taxonomy data' },
      { status: 500 }
    );
  }
}
