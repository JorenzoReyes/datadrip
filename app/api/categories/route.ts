import { NextResponse } from 'next/server';
import { query } from '../../utils/database';

export async function GET() {
  try {
    const categories = await query<{
      category_id: number;
      name: string;
      description: string | null;
      icon: string | null;
      display_order: number;
      is_active: boolean;
    }>(
      'SELECT category_id, name, description, icon, display_order, is_active FROM categories WHERE is_active = true ORDER BY display_order, name'
    );

    // Map to return name-based structure for products table
    const categoriesResponse = categories.map(cat => ({
      id: cat.category_id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      display_order: cat.display_order,
      is_active: cat.is_active
    }));

    return NextResponse.json({ categories: categoriesResponse });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

