import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../utils/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subcategoryId = searchParams.get('subcategoryId');

    if (!subcategoryId) {
      return NextResponse.json(
        { error: 'subcategoryId parameter is required' },
        { status: 400 }
      );
    }

    const productTypes = await query<{
      product_type_id: number;
      subcategory_id: number;
      name: string;
      description: string | null;
      display_order: number;
      is_active: boolean;
    }>(
      'SELECT product_type_id, subcategory_id, name, description, display_order, is_active FROM product_types WHERE subcategory_id = $1 AND is_active = true ORDER BY display_order, name',
      [parseInt(subcategoryId)]
    );

    return NextResponse.json({ productTypes });
  } catch (error) {
    console.error('Error fetching product types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product types' },
      { status: 500 }
    );
  }
}

