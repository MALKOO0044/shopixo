import { NextResponse } from 'next/server';
import { testConnection, getCategories } from '@/lib/cj/product-discovery';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await testConnection();
    
    let categories: Array<{ id: string; name: string; level: number }> = [];
    if (result.success) {
      try {
        const categoryGroups = await getCategories();
        for (const group of categoryGroups) {
          for (const second of group.categoryFirstList || []) {
            for (const third of second.categorySecondList || []) {
              categories.push({
                id: third.categoryId,
                name: `${group.categoryFirstName} > ${second.categorySecondName} > ${third.categoryName}`,
                level: 3,
              });
            }
          }
        }
      } catch {
        // Categories optional
      }
    }

    return NextResponse.json({
      ok: result.success,
      message: result.message,
      responseTime: result.responseTime,
      categoriesCount: categories.length,
      categories: categories.slice(0, 50),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      },
      { status: 500 }
    );
  }
}
