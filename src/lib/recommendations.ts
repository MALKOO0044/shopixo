<<<<<<< HEAD
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
=======
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80

export interface RecommendedProduct {
  id: number;
  title: string;
  slug: string;
  price: number;
  images: string[];
  category: string;
  rating: number;
}

export async function getRelatedProducts(productId: number, limit: number = 8): Promise<RecommendedProduct[]> {
<<<<<<< HEAD
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
          .select('id, title, slug, price, images, category, rating')
          .eq('category', product.category)
          .neq('id', productId)
          .limit(limit);
        return similar || [];
=======
  if (!process.env.DATABASE_URL) return [];

  const client = await pool.connect();
  try {
    // Get the product's primary category
    const catResult = await client.query(
      `SELECT category_id FROM product_categories WHERE product_id = $1 AND is_primary = true LIMIT 1`,
      [productId]
    );

    if (catResult.rows.length === 0) {
      // Fallback: get product's category string and find similar
      const productResult = await client.query(
        `SELECT category FROM products WHERE id = $1`,
        [productId]
      );

      if (productResult.rows.length > 0 && productResult.rows[0].category) {
        const similarResult = await client.query(
          `SELECT id, title, slug, price, images, category, rating 
           FROM products 
           WHERE category = $1 AND is_active = true AND id != $2
           LIMIT $3`,
          [productResult.rows[0].category, productId, limit]
        );
        return similarResult.rows;
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
      }
      return [];
    }

<<<<<<< HEAD
    const { data: related } = await supabase
      .from('products')
      .select(`
        id, title, slug, price, images, category, rating,
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
      rating: p.rating
    }));
  } catch (error) {
    console.error("[Recommendations] Error getting related products:", error);
    return [];
=======
    const categoryId = catResult.rows[0].category_id;

    // Get other products in the same category
    const relatedResult = await client.query(
      `SELECT DISTINCT p.id, p.title, p.slug, p.price, p.images, p.category, p.rating
       FROM products p
       JOIN product_categories pc ON p.id = pc.product_id
       WHERE pc.category_id = $1 AND p.id != $2 AND p.is_active = true
       LIMIT $3`,
      [categoryId, productId, limit]
    );

    return relatedResult.rows;
  } catch (error) {
    console.error("[Recommendations] Error getting related products:", error);
    return [];
  } finally {
    client.release();
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
  }
}

export async function getProductsByCategory(
  categorySlug: string,
  options: { limit?: number; offset?: number; minPrice?: number; maxPrice?: number; sort?: string } = {}
): Promise<{ products: RecommendedProduct[]; total: number; category: any }> {
<<<<<<< HEAD
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
      .select('id, title, slug, price, images, category, rating', { count: 'exact' })
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
=======
  if (!process.env.DATABASE_URL) return { products: [], total: 0, category: null };

  const { limit = 24, offset = 0, minPrice, maxPrice, sort } = options;
  const client = await pool.connect();

  try {
    // Get the category
    const catResult = await client.query(
      `SELECT * FROM categories WHERE slug = $1`,
      [categorySlug]
    );

    if (catResult.rows.length === 0) {
      return { products: [], total: 0, category: null };
    }

    const category = catResult.rows[0];
    const categoryIds = [category.id];

    // Get descendant categories
    if (category.level === 1) {
      const childrenResult = await client.query(
        `SELECT id FROM categories WHERE parent_id = $1`,
        [category.id]
      );
      
      for (const child of childrenResult.rows) {
        categoryIds.push(child.id);
        const grandchildrenResult = await client.query(
          `SELECT id FROM categories WHERE parent_id = $1`,
          [child.id]
        );
        categoryIds.push(...grandchildrenResult.rows.map(g => g.id));
      }
    } else if (category.level === 2) {
      const childrenResult = await client.query(
        `SELECT id FROM categories WHERE parent_id = $1`,
        [category.id]
      );
      categoryIds.push(...childrenResult.rows.map(c => c.id));
    }

    // Build dynamic WHERE clause for price filters
    const conditions = ["pc.category_id = ANY($1)", "p.is_active = true"];
    const params: any[] = [categoryIds];
    let paramIndex = 2;
    
    if (typeof minPrice === 'number' && !isNaN(minPrice)) {
      conditions.push(`p.price >= $${paramIndex}`);
      params.push(minPrice);
      paramIndex++;
    }
    if (typeof maxPrice === 'number' && !isNaN(maxPrice)) {
      conditions.push(`p.price <= $${paramIndex}`);
      params.push(maxPrice);
      paramIndex++;
    }
    
    const whereClause = conditions.join(" AND ");
    
    // Determine ORDER BY clause
    let orderClause = "p.id DESC";
    if (sort === 'price-asc') orderClause = "p.price ASC";
    else if (sort === 'price-desc') orderClause = "p.price DESC";

    // Get products with filters and sorting
    const productsResult = await client.query(
      `SELECT DISTINCT p.id, p.title, p.slug, p.price, p.images, p.category, p.rating
       FROM products p
       JOIN product_categories pc ON p.id = pc.product_id
       WHERE ${whereClause}
       ORDER BY ${orderClause}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Get total count with same filters
    const countResult = await client.query(
      `SELECT COUNT(DISTINCT p.id) as count
       FROM products p
       JOIN product_categories pc ON p.id = pc.product_id
       WHERE ${whereClause}`,
      params
    );

    return {
      products: productsResult.rows,
      total: parseInt(countResult.rows[0]?.count || "0"),
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
      category,
    };
  } catch (error) {
    console.error("[Recommendations] Error getting products by category:", error);
    return { products: [], total: 0, category: null };
<<<<<<< HEAD
=======
  } finally {
    client.release();
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
  }
}

export async function getComplementaryProducts(
  productId: number,
  limit: number = 4
): Promise<RecommendedProduct[]> {
<<<<<<< HEAD
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
      .select('id, title, slug, price, images, category, rating')
      .in('id', productIds)
      .limit(limit);

    return products || [];
  } catch (error) {
    console.error("[Recommendations] Error getting complementary products:", error);
    return [];
=======
  if (!process.env.DATABASE_URL) return [];

  const client = await pool.connect();
  try {
    // Get the product's primary category
    const catResult = await client.query(
      `SELECT pc.category_id, c.parent_id
       FROM product_categories pc
       JOIN categories c ON pc.category_id = c.id
       WHERE pc.product_id = $1 AND pc.is_primary = true
       LIMIT 1`,
      [productId]
    );

    if (catResult.rows.length === 0 || !catResult.rows[0].parent_id) return [];

    const parentId = catResult.rows[0].parent_id;
    const categoryId = catResult.rows[0].category_id;

    // Get sibling categories
    const siblingsResult = await client.query(
      `SELECT id FROM categories WHERE parent_id = $1 AND id != $2 LIMIT 3`,
      [parentId, categoryId]
    );

    if (siblingsResult.rows.length === 0) return [];

    const siblingIds = siblingsResult.rows.map(s => s.id);

    // Get products from sibling categories
    const productsResult = await client.query(
      `SELECT DISTINCT p.id, p.title, p.slug, p.price, p.images, p.category, p.rating
       FROM products p
       JOIN product_categories pc ON p.id = pc.product_id
       WHERE pc.category_id = ANY($1) AND p.is_active = true
       LIMIT $2`,
      [siblingIds, limit]
    );

    return productsResult.rows;
  } catch (error) {
    console.error("[Recommendations] Error getting complementary products:", error);
    return [];
  } finally {
    client.release();
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
  }
}
