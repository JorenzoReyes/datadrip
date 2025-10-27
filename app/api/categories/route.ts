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

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

