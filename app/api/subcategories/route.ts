import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../utils/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const categoryName = searchParams.get('categoryName');

    let subcategories;
    
    if (categoryName) {
      // Query by category name (for VARCHAR-based products table)
      subcategories = await query<{
        subcategory_id: number;
        category_id: number;
        name: string;
        description: string | null;
        display_order: number;
        is_active: boolean;
      }>(
        'SELECT sc.subcategory_id, sc.category_id, sc.name, sc.description, sc.display_order, sc.is_active FROM subcategories sc JOIN categories c ON sc.category_id = c.category_id WHERE c.name = $1 AND sc.is_active = true ORDER BY sc.display_order, sc.name',
        [categoryName]
      );
    } else if (categoryId) {
      // Query by category ID (for backward compatibility)
      subcategories = await query<{
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
    } else {
      return NextResponse.json(
        { error: 'Either categoryId or categoryName parameter is required' },
        { status: 400 }
      );
    }

    const subcategoriesResponse = subcategories.map(sc => ({
      id: sc.subcategory_id,
      category_id: sc.category_id,
      name: sc.name,
      description: sc.description,
      display_order: sc.display_order,
      is_active: sc.is_active
    }));

    return NextResponse.json({ subcategories: subcategoriesResponse });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subcategories' },
      { status: 500 }
    );
  }
}

