import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { slugify } from '@/lib/utils/slug';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

function extractFromHtml(html: string, pageUrl: string) {
  // Title: og:title > <title>
  let title = '';
  const og = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (og && og[1]) title = og[1].trim();
  if (!title) {
    const t = html.match(/<title>([^<]+)<\/title>/i);
    if (t && t[1]) title = t[1].trim();
  }
  if (!title) title = 'Untitled';

  // Images: pick common CJ CDN patterns and general img/src
  const imgRegex = /(https?:\/\/(?:cc|cf)[^\s"'<>]+\.(?:jpg|jpeg|png|webp))/ig;
  const imgRegex2 = /(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp))(?:\?[^\s"'<>]*)?/ig;
  const imgs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = imgRegex.exec(html)) && imgs.length < 30) { imgs.push(m[1]); }
  if (imgs.length < 6) {
    while ((m = imgRegex2.exec(html)) && imgs.length < 30) { imgs.push(m[1]); }
  }
  const images = uniq(imgs).slice(0, 12);

  // Attempt to extract numeric id from URL pattern p-123456...html
  const np = pageUrl.match(/p-([0-9]{6,})/i);
  const numericId = np ? np[1] : undefined;

  return { title, images, numericId };
}

async function ensureUniqueSlug(admin: any, base: string): Promise<string> {
  const s = slugify(base);
  let candidate = s;
  for (let i = 2; i <= 50; i++) {
    const { data } = await admin
      .from('products')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${s}-${i}`;
  }
  return `${s}-${Date.now()}`;
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const urls = new Set<string>();
    for (const u of searchParams.getAll('url')) if (u && u.trim()) urls.add(u.trim());
    const urlsCsv = searchParams.get('urls');
    if (urlsCsv) for (const u of urlsCsv.split(',').map((s) => s.trim()).filter(Boolean)) urls.add(u);
    if (urls.size === 0) return NextResponse.json({ ok: false, error: 'Provide url=... (supports multiple)' }, { status: 400 });

    const results: any[] = [];

    for (const u of Array.from(urls)) {
      try {
        const res = await fetch(u, { method: 'GET', cache: 'no-store' });
        const html = await res.text();
        const ext = extractFromHtml(html, u);

        const baseSlug = await ensureUniqueSlug(supabase, ext.title);
        const productPayload: any = {
          title: ext.title,
          slug: baseSlug,
          description: '',
          price: 0,
          images: ext.images,
          category: 'Women',
          stock: 0,
          video_url: null,
          processing_time_hours: null,
          delivery_time_hours: null,
          origin_area: null,
          origin_country_code: null,
          free_shipping: true,
          inventory_shipping_fee: 0,
          last_mile_fee: 0,
          cj_product_id: ext.numericId || null,
          shipping_from: null,
          is_active: false,
        };

        // Omit cj_product_id if column missing
        try {
          const probeCj = await supabase.from('products').select('cj_product_id').limit(1);
          if (probeCj.error) {
            delete productPayload.cj_product_id;
          }
        } catch {
          delete productPayload.cj_product_id;
        }

        // Omit is_active if column missing
        try {
          const probeActive = await supabase.from('products').select('is_active').limit(1);
          if (probeActive.error) {
            const { is_active, ...rest } = productPayload;
            Object.assign(productPayload, rest);
            delete productPayload.is_active;
          }
        } catch {
          const { is_active, ...rest } = productPayload;
          Object.assign(productPayload, rest);
          delete productPayload.is_active;
        }

        // Insert product
        const { data: ins, error: insErr } = await supabase
          .from('products')
          .insert(productPayload)
          .select('id')
          .single();
        if (insErr || !ins) throw insErr || new Error('Failed to insert product');
        const productId = ins.id as number;

        // One default variant placeholder; will be enriched later by API
        const { error: vErr } = await supabase
          .from('product_variants')
          .insert([{ product_id: productId, option_name: 'Size', option_value: '-', cj_sku: null, price: null, stock: 0 }]);
        if (vErr) throw vErr;

        results.push({ ok: true, productId, url: u, title: ext.title, images: ext.images.length });
      } catch (e: any) {
        results.push({ ok: false, url: u, error: e?.message || String(e) });
      }
    }

    return NextResponse.json({ ok: true, imported: results.filter(r => r.ok).length, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Scrape import failed' }, { status: 500 });
  }
}
