import { createClient } from '@supabase/supabase-js';
import { CjApi } from '@/lib/cj/api';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function isCjConfigured(): boolean {
<<<<<<< HEAD
  return !!(process.env.CJ_EMAIL && process.env.CJ_API_KEY);
}

/**
 * Normalize a variant name for comparison (lowercase, trim, remove extra spaces)
 */
function normalizeVariantName(name: string | null | undefined): string {
  if (!name) return '';
  return String(name).toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Parse size and color from a variant name like "Black-L", "Black And Silver-2XL", "Black XL", "Color: Black Size: L"
 */
function parseVariantName(name: string | null | undefined): { size?: string; color?: string } {
  if (!name) return {};
  const normalized = normalizeVariantName(name);
  
  // Handle "Color: X Size: Y" format
  const colorMatch = normalized.match(/color:\s*([^,;]+)/i);
  const sizeMatch = normalized.match(/size:\s*([^,;]+)/i);
  if (colorMatch || sizeMatch) {
    return { 
      color: colorMatch?.[1]?.trim(), 
      size: sizeMatch?.[1]?.trim() 
    };
  }
  
  // Split by common delimiters: hyphen, slash, space, comma
  const parts = normalized.split(/[-\/,\s]+/).map(p => p.trim()).filter(Boolean);
  
  const sizePatterns = /^(xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|5xl|6xl|\d+)$/i;
  let size: string | undefined;
  let color: string | undefined;
  const colorParts: string[] = [];
  
  for (const part of parts) {
    if (sizePatterns.test(part)) {
      size = part;
    } else {
      colorParts.push(part);
    }
  }
  
  if (colorParts.length > 0) {
    color = colorParts.join(' ');
  }
  
  return { size, color };
}

/**
 * Find the best matching CJ variant for a customer's selection
 * Uses fuzzy matching on variant name, size, and color
 * Returns null and logs warning if no match found - DOES NOT default to first variant
 */
function findMatchingCjVariant(
  customerVariantName: string | null | undefined,
  cjVariants: { vid: string; sku?: string; variantKey?: string; variantName?: string; size?: string; color?: string }[]
): { vid: string; sku?: string; matchedIndex: number } | null {
  if (!customerVariantName || cjVariants.length === 0) {
    return null;
  }

  const customerNormalized = normalizeVariantName(customerVariantName);
  const customerParsed = parseVariantName(customerVariantName);
  
  console.log(`[CJ Fulfill] Matching customer variant: "${customerVariantName}" -> normalized: "${customerNormalized}", size: "${customerParsed.size}", color: "${customerParsed.color}"`);
  console.log(`[CJ Fulfill] CJ variants available: ${cjVariants.map(v => `"${v.variantKey || v.variantName}"`).join(', ')}`);
  
  // Strategy 1: Exact match on variantKey or variantName
  for (let i = 0; i < cjVariants.length; i++) {
    const v = cjVariants[i];
    const keyNorm = normalizeVariantName(v.variantKey);
    const nameNorm = normalizeVariantName(v.variantName);
    if (keyNorm === customerNormalized || nameNorm === customerNormalized) {
      console.log(`[CJ Fulfill] EXACT MATCH found: vid=${v.vid}, key="${v.variantKey}"`);
      return { vid: v.vid, sku: v.sku, matchedIndex: i };
    }
  }
  
  // Strategy 2: Match by size + color combination
  if (customerParsed.size || customerParsed.color) {
    const customerSize = normalizeVariantName(customerParsed.size);
    const customerColor = normalizeVariantName(customerParsed.color);
    
    for (let i = 0; i < cjVariants.length; i++) {
      const v = cjVariants[i];
      const vParsed = v.size || v.color ? v : parseVariantName(v.variantKey || v.variantName);
      const vSize = normalizeVariantName(v.size || vParsed.size);
      const vColor = normalizeVariantName(v.color || vParsed.color);
      
      // Both size and color match
      if (customerSize && customerColor && vSize === customerSize && vColor === customerColor) {
        console.log(`[CJ Fulfill] SIZE+COLOR MATCH found: vid=${v.vid}, key="${v.variantKey}"`);
        return { vid: v.vid, sku: v.sku, matchedIndex: i };
      }
    }
    
    // Only size match (if only size was selected)
    for (let i = 0; i < cjVariants.length; i++) {
      const v = cjVariants[i];
      const vParsed = v.size || v.color ? v : parseVariantName(v.variantKey || v.variantName);
      const vSize = normalizeVariantName(v.size || vParsed.size);
      
      if (customerSize && !customerColor && vSize === customerSize) {
        console.log(`[CJ Fulfill] SIZE-ONLY MATCH found: vid=${v.vid}, key="${v.variantKey}"`);
        return { vid: v.vid, sku: v.sku, matchedIndex: i };
      }
    }
    
    // Only color match (if only color was selected)
    for (let i = 0; i < cjVariants.length; i++) {
      const v = cjVariants[i];
      const vParsed = v.size || v.color ? v : parseVariantName(v.variantKey || v.variantName);
      const vColor = normalizeVariantName(v.color || vParsed.color);
      
      if (customerColor && !customerSize && vColor === customerColor) {
        console.log(`[CJ Fulfill] COLOR-ONLY MATCH found: vid=${v.vid}, key="${v.variantKey}"`);
        return { vid: v.vid, sku: v.sku, matchedIndex: i };
      }
    }
  }
  
  // Strategy 3: Partial match - check if customer variant contains or is contained in CJ variant
  for (let i = 0; i < cjVariants.length; i++) {
    const v = cjVariants[i];
    const keyNorm = normalizeVariantName(v.variantKey);
    const nameNorm = normalizeVariantName(v.variantName);
    if (keyNorm && (keyNorm.includes(customerNormalized) || customerNormalized.includes(keyNorm))) {
      console.log(`[CJ Fulfill] PARTIAL MATCH (key) found: vid=${v.vid}, key="${v.variantKey}"`);
      return { vid: v.vid, sku: v.sku, matchedIndex: i };
    }
    if (nameNorm && (nameNorm.includes(customerNormalized) || customerNormalized.includes(nameNorm))) {
      console.log(`[CJ Fulfill] PARTIAL MATCH (name) found: vid=${v.vid}, name="${v.variantName}"`);
      return { vid: v.vid, sku: v.sku, matchedIndex: i };
    }
  }
  
  // Log detailed failure information for debugging
  console.warn(`[CJ Fulfill] MATCHING FAILED for "${customerVariantName}"`);
  console.warn(`[CJ Fulfill] Customer parsed: size="${customerParsed.size}", color="${customerParsed.color}"`);
  console.warn(`[CJ Fulfill] Available CJ variants:`);
  for (const v of cjVariants.slice(0, 5)) {
    const vParsed = parseVariantName(v.variantKey || v.variantName);
    console.warn(`  - vid=${v.vid}, key="${v.variantKey}", name="${v.variantName}", size="${vParsed.size}", color="${vParsed.color}"`);
  }
  
  // DO NOT default to first variant - return null and let caller handle the error
  return null;
}

interface ShippingInfo {
  name: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email?: string;
}

export async function maybeCreateCjOrderForOrderId(
  orderId: number, 
  shippingInfoOverride?: ShippingInfo
): Promise<{ ok: boolean; info?: any; reason?: string }> {
=======
  return !!(process.env.CJ_APP_KEY && process.env.CJ_APP_SECRET && (process.env.CJ_API_BASE || process.env.CJ_API_BASE_SANDBOX));
}

export async function maybeCreateCjOrderForOrderId(orderId: number, shippingInfo?: any): Promise<{ ok: boolean; info?: any; reason?: string }> {
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
  if (!isCjConfigured()) {
    return { ok: false, reason: 'CJ API not configured' };
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, reason: 'Supabase not configured' };

<<<<<<< HEAD
  let order: any = null;
  let hasShippingColumns = false;
  
  const { data: fullOrder, error: fullErr } = await supabase
    .from('orders')
    .select(`
      id, user_id, total_amount, status, order_number,
      shipping_name, shipping_phone, shipping_address1, shipping_address2,
      shipping_city, shipping_state, shipping_postal_code, shipping_country
    `)
    .eq('id', orderId)
    .single();
  
  if (fullErr) {
    if (fullErr.message?.includes('column') || fullErr.code === '42703') {
      const { data: minOrder, error: minErr } = await supabase
        .from('orders')
        .select('id, user_id, total_amount, status')
        .eq('id', orderId)
        .single();
      
      if (minErr || !minOrder) {
        return { ok: false, reason: 'Order not found' };
      }
      order = minOrder;
      hasShippingColumns = false;
    } else {
      return { ok: false, reason: 'Order not found: ' + fullErr.message };
    }
  } else {
    order = fullOrder;
    hasShippingColumns = true;
  }

  let items: any[] | null = null;
  
  const { data: fullItems, error: fullItemsErr } = await supabase
    .from('order_items')
    .select('product_id, variant_id, variant_name, quantity, unit_price, product_title, cj_product_id, cj_variant_id, cj_sku')
    .eq('order_id', orderId);
  
  if (fullItemsErr) {
    console.warn('[CJ Fulfill] Full items query failed, trying minimal:', fullItemsErr.message);
    const { data: minItems, error: minItemsErr } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);
    
    if (minItemsErr || !minItems || minItems.length === 0) {
      console.error('[CJ Fulfill] No order items found for order:', orderId, minItemsErr);
      return { ok: false, reason: 'No order items' };
    }
    items = minItems;
  } else {
    items = fullItems;
  }
  
  if (!items || items.length === 0) {
    console.error('[CJ Fulfill] No order items found for order:', orderId);
    return { ok: false, reason: 'No order items' };
  }

  console.log('[CJ Fulfill] Order items:', JSON.stringify(items, null, 2));

  const productIds = items.map((i: any) => i.product_id);
  const { data: products } = await supabase
    .from('products')
    .select('id, title, slug, cj_product_id')
    .in('id', productIds);
  
  const productMap = new Map<number, { title: string; slug: string; cj_product_id: string | null }>();
  for (const p of products || []) {
    productMap.set(p.id, { title: p.title, slug: p.slug, cj_product_id: p.cj_product_id });
  }

  const { data: allVariants } = await supabase
    .from('product_variants')
    .select('id, product_id, cj_variant_id, cj_sku, option_name, option_value, variant_key')
    .in('product_id', productIds);
  
  const variantsByProduct = new Map<number, any[]>();
  for (const v of allVariants || []) {
    const list = variantsByProduct.get(v.product_id) || [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  }

  const missingCjIds = items.filter((it: any) => !it.cj_variant_id && !it.cj_sku);
  if (missingCjIds.length > 0) {
    console.warn('[CJ Fulfill] Items missing CJ variant IDs, will look up from product_variants:', missingCjIds);
  }

  let shippingInfo: ShippingInfo | undefined;
  
  if (hasShippingColumns && order.shipping_name && order.shipping_address1 && order.shipping_city) {
    shippingInfo = {
      name: order.shipping_name,
      phone: order.shipping_phone || '',
      address1: order.shipping_address1,
      address2: order.shipping_address2 || '',
      city: order.shipping_city,
      state: order.shipping_state || '',
      postalCode: order.shipping_postal_code || '',
      country: order.shipping_country || 'US',
    };
  } else if (shippingInfoOverride && shippingInfoOverride.name && shippingInfoOverride.address1) {
    shippingInfo = shippingInfoOverride;
  }

  if (!shippingInfo || !shippingInfo.name || !shippingInfo.address1 || !shippingInfo.city) {
    return { ok: false, reason: 'Missing recipient address; cannot create CJ order' };
  }

  const cj = new CjApi();
  
  // Build order items with fallback to CJ API for missing variant IDs
  const orderItems: { sku: string; vid: string; name: string; quantity: number }[] = [];
  
  // Cache CJ API calls by cj_product_id to avoid redundant requests
  const cjVariantCache = new Map<string, { vid: string; sku?: string }[] | null>();
  
  for (const it of items) {
    const meta = productMap.get(it.product_id as number);
    const productVariants = variantsByProduct.get(it.product_id as number) || [];
    
    // Get the customer's selected variant name for matching
    const customerVariantName = it.variant_name || null;
    
    let vid = it.cj_variant_id || null;
    let sku = it.cj_sku || null;
    
    console.log(`[CJ Fulfill] Processing item - product_id: ${it.product_id}, variant_id: ${it.variant_id}, variant_name: "${customerVariantName}", cj_variant_id: ${vid}`);
    
    // First try: from order item directly (already has cj_variant_id)
    if (!vid && it.variant_id && productVariants.length > 0) {
      const matchedVariant = productVariants.find((v: any) => v.id === it.variant_id);
      if (matchedVariant) {
        vid = matchedVariant.cj_variant_id || null;
        sku = sku || matchedVariant.cj_sku || null;
        console.log(`[CJ Fulfill] Found variant by ID ${it.variant_id}: vid=${vid}, sku=${sku}`);
      }
    }
    
    // Second try: Match by variant name in local DB (100% accuracy matching)
    if (!vid && customerVariantName && productVariants.length > 0) {
      const customerNorm = normalizeVariantName(customerVariantName);
      for (const pv of productVariants) {
        const pvNorm = normalizeVariantName(pv.option_value || pv.variant_key);
        if (pvNorm && (pvNorm === customerNorm || pvNorm.includes(customerNorm) || customerNorm.includes(pvNorm))) {
          vid = pv.cj_variant_id || null;
          sku = sku || pv.cj_sku || null;
          if (vid) {
            console.log(`[CJ Fulfill] MATCHED local variant by name: "${customerVariantName}" -> vid=${vid}, sku=${sku}`);
            break;
          }
        }
      }
    }
    
    // Third try: first variant from local DB (ONLY if no variant name to match)
    if (!vid && !customerVariantName && productVariants.length > 0) {
      const firstVariant = productVariants[0];
      vid = firstVariant.cj_variant_id || null;
      sku = sku || firstVariant.cj_sku || null;
      if (vid) {
        console.log(`[CJ Fulfill] Using first variant (no customer selection): vid=${vid}, sku=${sku}`);
      }
    }
    
    // Fourth try: FALLBACK - fetch directly from CJ API and MATCH by name
    if (!vid && meta?.cj_product_id) {
      // Check cache first
      let cjVariants = cjVariantCache.get(meta.cj_product_id);
      if (cjVariants === undefined) {
        console.log(`[CJ Fulfill] No local vid found, fetching from CJ API for product ${meta.cj_product_id}...`);
        cjVariants = await cj.getProductVariants(meta.cj_product_id);
        cjVariantCache.set(meta.cj_product_id, cjVariants);
      }
      
      if (cjVariants && cjVariants.length > 0) {
        let matchedCjVariant: { vid: string; sku?: string; variantKey?: string } | null = null;
        
        // Use smart matching - REQUIRE customer variant name for multi-variant products
        if (customerVariantName) {
          const matched = findMatchingCjVariant(customerVariantName, cjVariants);
          if (matched) {
            vid = matched.vid;
            sku = sku || matched.sku || null;
            matchedCjVariant = cjVariants[matched.matchedIndex];
            console.log(`[CJ Fulfill] MATCHED CJ API variant: "${customerVariantName}" -> vid=${vid}`);
          } else {
            // Match failed - DO NOT use first variant for multi-variant products with customer selection
            console.error(`[CJ Fulfill] CRITICAL: Customer selected "${customerVariantName}" but no matching CJ variant found. NOT defaulting to first variant to avoid wrong item.`);
            // Continue to try title search, but log the failure
          }
        }
        
        // Only use first variant if there was NO customer selection (single-variant product or missing data)
        if (!vid && !customerVariantName) {
          vid = cjVariants[0].vid;
          sku = sku || cjVariants[0].sku || null;
          matchedCjVariant = cjVariants[0];
          console.log(`[CJ Fulfill] Using first CJ API variant (no customer selection): vid=${vid}`);
        }
        
        // Update local DB for future orders - ONLY update the variant row that matches customer's selection
        if (vid && matchedCjVariant) {
          // Find the correct local variant row to update
          let localVariantToUpdate: any = null;
          
          if (it.variant_id && productVariants.length > 0) {
            // Prefer updating the exact variant the customer selected
            localVariantToUpdate = productVariants.find((v: any) => v.id === it.variant_id);
          }
          
          if (!localVariantToUpdate && customerVariantName && productVariants.length > 0) {
            // Find by name match
            const customerNorm = normalizeVariantName(customerVariantName);
            localVariantToUpdate = productVariants.find((v: any) => {
              const vNorm = normalizeVariantName(v.option_value || v.variant_key);
              return vNorm === customerNorm || vNorm.includes(customerNorm) || customerNorm.includes(vNorm);
            });
          }
          
          if (localVariantToUpdate) {
            // Update the matched variant row
            try {
              await supabase
                .from('product_variants')
                .update({ cj_variant_id: vid, cj_sku: sku || null })
                .eq('id', localVariantToUpdate.id);
              console.log(`[CJ Fulfill] Updated matched local variant ${localVariantToUpdate.id} (${localVariantToUpdate.option_value}) with CJ data`);
            } catch (e) {
              console.warn('[CJ Fulfill] Failed to update matched local variant:', e);
            }
          } else if (productVariants.length === 0) {
            // Insert new variant record if none exists
            try {
              await supabase
                .from('product_variants')
                .insert({
                  product_id: it.product_id,
                  option_name: 'Size',
                  option_value: customerVariantName || matchedCjVariant.variantKey || 'Default',
                  cj_variant_id: vid,
                  cj_sku: sku || null,
                });
              console.log(`[CJ Fulfill] Created local variant for product ${it.product_id} with CJ data`);
            } catch (e) {
              console.warn('[CJ Fulfill] Failed to create local variant:', e);
            }
          }
          // If localVariantToUpdate is null but variants exist, do NOT update - we might corrupt the wrong row
        }
      }
    }
    
    // Fifth try: LAST RESORT - search CJ by product title and MATCH by name
    if (!vid) {
      const productTitle = it.product_title || meta?.title || '';
      if (productTitle) {
        console.log(`[CJ Fulfill] No CJ product ID, searching by title: "${productTitle}"...`);
        const searchResult = await cj.searchProductByTitle(productTitle);
        
        if (searchResult && searchResult.variants.length > 0) {
          // searchResult.variants already has variantKey, variantName, size, color from getProductVariants
          const searchVariants = searchResult.variants;
          let matchedVariantInfo: { vid: string; variantKey?: string } | null = null;
          
          // Use smart matching if we have a customer variant name
          if (customerVariantName) {
            const matched = findMatchingCjVariant(customerVariantName, searchVariants);
            if (matched) {
              vid = matched.vid;
              sku = sku || matched.sku || null;
              matchedVariantInfo = searchVariants[matched.matchedIndex];
              console.log(`[CJ Fulfill] MATCHED via title search: "${customerVariantName}" -> vid=${vid}`);
            } else {
              // Match failed - log but continue to try first variant only if no customer selection
              console.error(`[CJ Fulfill] Title search found variants but no match for "${customerVariantName}"`);
            }
          }
          
          // Only use first variant if there was NO customer selection
          if (!vid && !customerVariantName) {
            vid = searchResult.variants[0].vid;
            sku = sku || searchResult.variants[0].sku || null;
            matchedVariantInfo = searchVariants[0];
            console.log(`[CJ Fulfill] Using first variant from title search (no customer selection): vid=${vid}`);
          }
          
          // Update the product with the CJ product ID for future orders
          if (vid) {
            try {
              await supabase
                .from('products')
                .update({ cj_product_id: searchResult.cjProductId })
                .eq('id', it.product_id);
              console.log(`[CJ Fulfill] Updated product ${it.product_id} with cj_product_id: ${searchResult.cjProductId}`);
            } catch (e) {
              console.warn('[CJ Fulfill] Failed to update product with CJ ID:', e);
            }
            
            // Create variant record if none exists - do NOT update existing to avoid corruption
            if (productVariants.length === 0 && matchedVariantInfo) {
              try {
                await supabase
                  .from('product_variants')
                  .insert({
                    product_id: it.product_id,
                    option_name: 'Size',
                    option_value: customerVariantName || matchedVariantInfo.variantKey || 'Default',
                    cj_variant_id: vid,
                    cj_sku: sku || null,
                  });
                console.log(`[CJ Fulfill] Created local variant for product ${it.product_id} via title search`);
              } catch (e) {
                console.warn('[CJ Fulfill] Failed to create variant:', e);
              }
            }
            // If variants exist but we found via title search, log but don't update to avoid corrupting wrong row
          }
        }
      }
    }
    
    sku = sku || meta?.cj_product_id || meta?.slug || String(it.product_id);
    
    if (!vid) {
      console.error(`[CJ Fulfill] CRITICAL: No vid found for product ${it.product_id} (CJ: ${meta?.cj_product_id})`);
      return { ok: false, reason: `Missing CJ variant ID for product "${meta?.title || it.product_id}". Please re-import this product from CJ Dropshipping.` };
    }
    
    console.log(`[CJ Fulfill] Item mapping - product_id: ${it.product_id}, vid: ${vid}, sku: ${sku}`);
    
    orderItems.push({
      sku: sku,
      vid: vid,
      name: it.product_title || meta?.title || `Product ${it.product_id}`,
      quantity: it.quantity,
    });
  }

  const payload = {
    orderNo: `SHOPIXO-${order.id}-${Date.now()}`,
    recipient: {
      name: shippingInfo.name,
      phone: shippingInfo.phone,
      country: shippingInfo.country || 'US',
      state: shippingInfo.state,
      city: shippingInfo.city,
      address1: shippingInfo.address1,
      address2: shippingInfo.address2,
      postalCode: shippingInfo.postalCode,
    },
    shippingCountry: shippingInfo.country || 'US',
    logisticName: 'CJPacket Ordinary',
=======
  // 1) Load order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, user_id, total_amount, status')
    .eq('id', orderId)
    .single();
  if (orderErr || !order) return { ok: false, reason: 'Order not found' };

  // 2) Load order items (include variant_id)
  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('product_id, variant_id, quantity, price')
    .eq('order_id', orderId);
  if (itemsErr || !items || items.length === 0) return { ok: false, reason: 'No order items' };

  // 3) Load minimal product info (title, slug) used as fallback SKU mapping
  const productIds = items.map((i) => i.product_id);
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, title, slug')
    .in('id', productIds);
  if (prodErr) {
    // Non-fatal; continue with minimal mapping
  }
  const productMap = new Map<number, { title: string; slug: string }>();
  for (const p of products || []) productMap.set(p.id, { title: p.title, slug: p.slug });

  // 3b) Load variant info for those items that have variant_id (to extract cj_sku)
  const variantIds = items.map((i) => i.variant_id).filter((v: any) => v !== null && v !== undefined) as number[];
  let variantMap = new Map<number, { cj_sku: string | null; option_name: string | null; option_value: string | null }>();
  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, cj_sku, option_name, option_value')
      .in('id', variantIds);
    for (const v of variants || []) {
      variantMap.set(v.id, { cj_sku: v.cj_sku, option_name: v.option_name, option_value: v.option_value });
    }
  }

  // 4) Load recipient (default address of user) or use provided shippingInfo
  let addr;
  if (shippingInfo) {
    addr = shippingInfo;
  } else {
    const { data: addressData } = await supabase
      .from('addresses')
      .select('full_name, phone, line1, line2, city, state, postal_code, country, is_default')
      .eq('user_id', order.user_id)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle();
    addr = addressData;
  }

  if (!addr) return { ok: false, reason: 'Missing recipient address; cannot create CJ order yet' };

  // 5) Build CJ payload (placeholder structure; adjust to CJ docs when provided)
  const payload = {
    orderNo: `SHOPIXO-${order.id}-${Date.now()}`,
    recipient: {
      name: addr.name || addr.full_name,
      phone: addr.phone,
      country: addr.country,
      state: addr.state,
      city: addr.city,
      address1: addr.address1 || addr.line1,
      address2: addr.address2 || addr.line2,
      postalCode: addr.postalCode || addr.postal_code,
    },
    // Choose service code once provided by CJ (e.g., 'KSA_DDP_ECONOMY')
    serviceCode: 'KSA_DDP_ECONOMY',
    // Packaging instructions
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
    packaging: {
      neutral: true,
      includePackingSlip: true,
      includeThankYouCard: true,
    },
<<<<<<< HEAD
    items: orderItems,
  };

  console.log('[CJ Fulfill] Creating CJ order with payload:', JSON.stringify(payload, null, 2));
  try {
    // Step 1: Create the order on CJ
    const res = await cj.createOrder(payload);
    console.log('[CJ Fulfill] CJ API create order response:', JSON.stringify(res, null, 2));
    
    // CJ API v2 response format: { code: 200, result: true, data: { orderId: "...", orderNum: "..." } }
    // Try multiple possible response formats for compatibility
    const cjOrderNo = 
      res?.data?.orderId || 
      res?.data?.orderNum || 
      res?.data?.orderNo ||
      res?.data?.cjOrderId ||
      res?.orderId ||
      res?.orderNo || 
      res?.order_no || 
      res?.id || 
      null;
    
    if (!cjOrderNo) {
      console.error('[CJ Fulfill] Order created but no order ID returned. Full response:', JSON.stringify(res, null, 2));
      return { ok: false, reason: `Order created but no CJ order ID returned. Response: ${JSON.stringify(res)}` };
    }
    
    console.log(`[CJ Fulfill] Order created with CJ order number: ${cjOrderNo}`);
    
    // Step 2: Automatically pay with CJ Wallet balance
    console.log(`[CJ Fulfill] Attempting automatic payment for order ${cjOrderNo}...`);
    const paymentResult = await cj.payWithBalance(cjOrderNo);
    
    let orderStatus = 'awaiting_payment';
    let paymentInfo: any = { attempted: true };
    
    if (paymentResult.success) {
      console.log(`[CJ Fulfill] Payment successful for order ${cjOrderNo}`);
      orderStatus = 'processing';
      paymentInfo = { 
        paid: true, 
        method: 'cj_wallet', 
        message: paymentResult.message,
        paidAt: new Date().toISOString(),
      };
    } else {
      console.warn(`[CJ Fulfill] Payment failed for order ${cjOrderNo}: ${paymentResult.message}`);
      paymentInfo = { 
        paid: false, 
        error: paymentResult.message,
        requiresManualPayment: true,
      };
    }
    
    // Step 3: Update local order with CJ order number and status
    try {
      await supabase
        .from('orders')
        .update({ 
          status: orderStatus, 
          cj_order_no: cjOrderNo,
        })
        .eq('id', orderId);
      console.log(`[CJ Fulfill] Order ${orderId} updated - status: ${orderStatus}, cj_order_no: ${cjOrderNo}`);
    } catch (e) {
      console.warn('[CJ Fulfill] Failed to update order status:', e);
    }
    
    return { 
      ok: true, 
      info: {
        cjOrderNo,
        orderCreated: true,
        payment: paymentInfo,
        createResponse: res,
      }
    };
  } catch (e: any) {
    console.error('[CJ Fulfill] CJ API error:', e?.message, e?.response?.data || e);
=======
    items: items.map((it) => {
      const meta = productMap.get(it.product_id as number);
      const vmeta = (it as any).variant_id ? variantMap.get((it as any).variant_id) : null;
      const sku = vmeta?.cj_sku || meta?.slug || String(it.product_id);
      const optionLabel = vmeta?.option_value ? ` (${vmeta.option_value})` : '';
      return {
        sku,
        name: (meta?.title || `Product ${it.product_id}`) + optionLabel,
        quantity: it.quantity,
      };
    }),
  };

  const cj = new CjApi();
  try {
    const res = await cj.createOrder(payload);
    try {
      const cjOrderNo = res?.orderNo || res?.order_no || res?.id || res?.data?.orderNo || null;
      if (cjOrderNo) {
        await supabase
          .from('orders')
          .update({ cj_order_no: String(cjOrderNo), shipping_status: 'created' })
          .eq('id', orderId);
      }
    } catch (e) {
      // Best-effort: do not fail the main call
      console.warn('Failed to persist CJ order number:', e);
    }
    return { ok: true, info: res };
  } catch (e: any) {
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
    return { ok: false, reason: e?.message || 'CJ create order failed' };
  }
}
