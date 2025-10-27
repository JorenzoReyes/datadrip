import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../utils/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subcategoryId = searchParams.get('subcategoryId');
    const subcategoryName = searchParams.get('subcategoryName');
    const categoryName = searchParams.get('categoryName');

    let productTypes;
    
    if (subcategoryName && categoryName) {
      // Query by subcategory name and category name (for VARCHAR-based products table)
      productTypes = await query<{
        product_type_id: number;
        subcategory_id: number;
        name: string;
        description: string | null;
        display_order: number;
        is_active: boolean;
      }>(
        'SELECT pt.product_type_id, pt.subcategory_id, pt.name, pt.description, pt.display_order, pt.is_active FROM product_types pt JOIN subcategories sc ON pt.subcategory_id = sc.subcategory_id JOIN categories c ON sc.category_id = c.category_id WHERE sc.name = $1 AND c.name = $2 AND pt.is_active = true ORDER BY pt.display_order, pt.name',
        [subcategoryName, categoryName]
      );
    } else if (subcategoryId) {
      // Query by subcategory ID (for backward compatibility)
      productTypes = await query<{
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
    } else {
      return NextResponse.json(
        { error: 'Either subcategoryId or both subcategoryName and categoryName are required' },
        { status: 400 }
      );
    }

    const productTypesResponse = productTypes.map(pt => ({
      id: pt.product_type_id,
      subcategory_id: pt.subcategory_id,
      name: pt.name,
      description: pt.description,
      display_order: pt.display_order,
      is_active: pt.is_active
    }));

    return NextResponse.json({ productTypes: productTypesResponse });
  } catch (error) {
    console.error('Error fetching product types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product types' },
      { status: 500 }
    );
  }
}

