import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../utils/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'categoryId parameter is required' },
        { status: 400 }
      );
    }

    const subcategories = await query<{
      subcategory_id: number;
      category_id: number;
      name: string;
      description: string | null;
      display_order: number;
      is_active: boolean;
    }>(
      'SELECT subcategory_id, category_id, name, description, display_order, is_active FROM subcategories WHERE category_id = $1 AND is_active = true ORDER BY display_order, name',
      [parseInt(categoryId)]
    );

    return NextResponse.json({ subcategories });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subcategories' },
      { status: 500 }
    );
  }
}

