import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, key);
  }
  return supabaseAdmin;
}

export interface RecommendedProduct {
  id: number;
  title: string;
  slug: string;
  price: number;
  images: string[];
  category: string;
  displayed_rating?: number | null;
}

export async function getRelatedProducts(productId: number, limit: number = 8): Promise<RecommendedProduct[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data: catLink } = await supabase
      .from('product_categories')
      .select('category_id')
      .eq('product_id', productId)
      .eq('is_primary', true)
      .maybeSingle();

    if (!catLink?.category_id) {
      const { data: product } = await supabase
        .from('products')
        .select('category')
        .eq('id', productId)
        .single();

      if (product?.category) {
        const { data: similar } = await supabase
          .from('products')
          .select('id, title, slug, price, images, category, displayed_rating')
          .eq('category', product.category)
          .neq('id', productId)
          .limit(limit);
        return similar || [];
      }
      return [];
    }

    const { data: related } = await supabase
      .from('products')
      .select(`
        id, title, slug, price, images, category, displayed_rating,
        product_categories!inner(category_id)
      `)
      .eq('product_categories.category_id', catLink.category_id)
      .neq('id', productId)
      .limit(limit);

    return (related || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: p.price,
      images: p.images,
      category: p.category,
      displayed_rating: p.displayed_rating
    }));
  } catch (error) {
    console.error("[Recommendations] Error getting related products:", error);
    return [];
  }
}

export async function getProductsByCategory(
  categorySlug: string,
  options: { limit?: number; offset?: number; minPrice?: number; maxPrice?: number; sort?: string } = {}
): Promise<{ products: RecommendedProduct[]; total: number; category: any }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { products: [], total: 0, category: null };

  const { limit = 24, offset = 0, minPrice, maxPrice, sort } = options;

  try {
    const { data: category } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', categorySlug)
      .single();

    if (!category) {
      return { products: [], total: 0, category: null };
    }

    const categoryIds: number[] = [category.id];

    if (category.level === 1) {
      const { data: children } = await supabase
        .from('categories')
        .select('id')
        .eq('parent_id', category.id);

      if (children) {
        for (const child of children) {
          categoryIds.push(child.id);
          const { data: grandchildren } = await supabase
            .from('categories')
            .select('id')
            .eq('parent_id', child.id);
          if (grandchildren) {
            categoryIds.push(...grandchildren.map(g => g.id));
          }
        }
      }
    } else if (category.level === 2) {
      const { data: children } = await supabase
        .from('categories')
        .select('id')
        .eq('parent_id', category.id);
      if (children) {
        categoryIds.push(...children.map(c => c.id));
      }
    }

    const { data: productLinks } = await supabase
      .from('product_categories')
      .select('product_id')
      .in('category_id', categoryIds);

    if (!productLinks || productLinks.length === 0) {
      return { products: [], total: 0, category };
    }

    const productIds = [...new Set(productLinks.map(pl => pl.product_id))];

    let query = supabase
      .from('products')
      .select('id, title, slug, price, images, category, displayed_rating', { count: 'exact' })
      .in('id', productIds);

    if (typeof minPrice === 'number' && !isNaN(minPrice)) {
      query = query.gte('price', minPrice);
    }
    if (typeof maxPrice === 'number' && !isNaN(maxPrice)) {
      query = query.lte('price', maxPrice);
    }

    if (sort === 'price-asc') {
      query = query.order('price', { ascending: true });
    } else if (sort === 'price-desc') {
      query = query.order('price', { ascending: false });
    } else {
      query = query.order('id', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: products, count, error } = await query;

    if (error) {
      console.error("[Recommendations] Query error:", error);
      return { products: [], total: 0, category };
    }

    return {
      products: products || [],
      total: count || 0,
      category,
    };
  } catch (error) {
    console.error("[Recommendations] Error getting products by category:", error);
    return { products: [], total: 0, category: null };
  }
}

export async function getComplementaryProducts(
  productId: number,
  limit: number = 4
): Promise<RecommendedProduct[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data: catLink } = await supabase
      .from('product_categories')
      .select('category_id, categories(parent_id)')
      .eq('product_id', productId)
      .eq('is_primary', true)
      .maybeSingle();

    if (!catLink || !catLink.categories) return [];

    const parentId = (catLink.categories as any).parent_id;
    const categoryId = catLink.category_id;

    if (!parentId) return [];

    const { data: siblings } = await supabase
      .from('categories')
      .select('id')
      .eq('parent_id', parentId)
      .neq('id', categoryId)
      .limit(3);

    if (!siblings || siblings.length === 0) return [];

    const siblingIds = siblings.map(s => s.id);

    const { data: productLinks } = await supabase
      .from('product_categories')
      .select('product_id')
      .in('category_id', siblingIds);

    if (!productLinks || productLinks.length === 0) return [];

    const productIds = [...new Set(productLinks.map(pl => pl.product_id))];

    const { data: products } = await supabase
      .from('products')
      .select('id, title, slug, price, images, category, displayed_rating')
      .in('id', productIds)
      .limit(limit);

    return products || [];
  } catch (error) {
    console.error("[Recommendations] Error getting complementary products:", error);
    return [];
  }
}
