import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/cj/product-discovery';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categoryGroups = await getCategories();
    
    const flatCategories: Array<{
      id: string;
      name: string;
      fullPath: string;
      level1: string;
      level2: string;
      level3: string;
    }> = [];

    for (const group of categoryGroups) {
      const level1 = group.categoryFirstName;
      
      for (const second of group.categoryFirstList || []) {
        const level2 = second.categorySecondName;
        
        for (const third of second.categorySecondList || []) {
          flatCategories.push({
            id: third.categoryId,
            name: third.categoryName,
            fullPath: `${level1} > ${level2} > ${third.categoryName}`,
            level1,
            level2,
            level3: third.categoryName,
          });
        }
      }
    }

    const grouped = categoryGroups.map(group => ({
      name: group.categoryFirstName,
      subcategories: (group.categoryFirstList || []).map(sub => ({
        name: sub.categorySecondName,
        categories: (sub.categorySecondList || []).map(cat => ({
          id: cat.categoryId,
          name: cat.categoryName,
        })),
      })),
    }));

    return NextResponse.json({
      ok: true,
      flat: flatCategories,
      grouped,
      totalCategories: flatCategories.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
      },
      { status: 500 }
    );
  }
}
