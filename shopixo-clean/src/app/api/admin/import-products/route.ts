import { NextRequest, NextResponse } from 'next/server';
import { productSchema } from '@/lib/schemas/product';
import { calculateRetailSar, usdToSar, computeVolumetricWeightKg, detectPricingAnomalies } from '@/lib/pricing';
import { slugify } from '@/lib/utils/slug';
import { generateTitle, generateDescription, translateAr } from '@/lib/ai/enrich';
import { mapCategory } from '@/lib/ai/category-map';
import { hasColumn } from '@/lib/db-features';
import { loggerForRequest } from '@/lib/log';
import { isKillSwitchOn } from '@/lib/settings';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { getSupabaseAdmin } from '@/app/admin/products/actions';

export const runtime = 'nodejs';

type ImportItem = {
  name: string;
  supplierCost: number;        // numeric in SAR or USD (see currency)
  currency?: 'SAR' | 'USD';
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightKg?: number;
  imagesCsv?: string;          // comma-separated URLs (required by schema)
  videoUrl?: string;           // optional single video URL if available from CJ
  category?: string;           // optional
  stock?: number;              // default 100
  margin?: number;             // default 0.35
};

export async function POST(req: NextRequest) {
  const log = loggerForRequest(req);
  // Require admin user via centralized guard
  {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      const r = NextResponse.json({ error: 'Not authorized' }, { status: 401 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
  }

  const supabase = await getSupabaseAdmin();
  if (!supabase) {
    const r = NextResponse.json({ error: 'Server misconfiguration: missing Supabase envs' }, { status: 500 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }

  // Global kill-switch enforcement: block write operations
  if (await isKillSwitchOn()) {
    const r = NextResponse.json({ error: 'Kill switch is ON. Import is temporarily disabled.' }, { status: 423 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }

  // Probe optional columns once (e.g., products.video_url) using centralized db-features
  const hasVideoColumn = await hasColumn('products', 'video_url');

  let body: { items: ImportItem[]; preview?: boolean; draftOnAnomalies?: boolean };
  try { body = await req.json(); } catch {
    const r = NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const preview = !!body.preview;
  const draftOnAnomalies = !!body.draftOnAnomalies;
  if (items.length === 0) {
    const r = NextResponse.json({ error: 'No items provided' }, { status: 400 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }

  const results: any[] = [];
  const toInsert: any[] = [];

  for (const it of items) {
    const currency = it.currency || 'SAR';
    const supplierSar = currency === 'USD' ? usdToSar(it.supplierCost) : it.supplierCost;
    const lengthCm = it.lengthCm ?? 25;
    const widthCm = it.widthCm ?? 20;
    const heightCm = it.heightCm ?? 3;
    const weightKg = it.weightKg ?? 0.4;

    const retailCalc = calculateRetailSar(supplierSar, {
      actualKg: weightKg,
      lengthCm,
      widthCm,
      heightCm,
    }, { margin: it.margin ?? 0.35 });
    const volumetricKg = computeVolumetricWeightKg({ actualKg: weightKg, lengthCm, widthCm, heightCm });
    const anomalies = detectPricingAnomalies({
      actualKg: weightKg,
      volumetricKg,
      billedKg: retailCalc.billedWeightKg,
      ddpShippingSar: retailCalc.ddpShippingSar,
      landedCostSar: retailCalc.landedCostSar,
      retailSar: retailCalc.retailSar,
    });

    let title = it.name?.trim() || 'Untitled Product';
    // AI enrichment (optional)
    try {
      title = await generateTitle(title);
    } catch {}
    const slug = slugify(title);
    // Require real product media; do NOT fallback to placeholder
    if (!it.imagesCsv || it.imagesCsv.trim().length === 0) {
      results.push({
        title,
        ok: false,
        errors: { images: ['Images are required. Provide at least one image URL from your source (e.g., CJ).'] },
      });
      continue;
    }
    const images = it.imagesCsv;
    let desc = `${title} — auto-imported. Landed SAR: ${retailCalc.landedCostSar}.`;
    try {
      const gen = await generateDescription(title);
      if (gen) desc = gen;
    } catch {}
    let descAr = '';
    try { descAr = await translateAr(desc); } catch {}

    // Category mapping with confidence; honor provided category when present
    let finalCategory = (it.category && it.category.trim().length > 0) ? it.category.trim() : '';
    if (!finalCategory || finalCategory.toLowerCase() === 'general') {
      const mapped = mapCategory({ cjCategory: it.category, title, description: desc });
      finalCategory = mapped.category;
    }

    const formLike = {
      title,
      slug,
      description: desc,
      price: retailCalc.retailSar,
      stock: it.stock ?? 100,
      category: finalCategory || 'General',
      images,
      ...(draftOnAnomalies && anomalies.length > 0 ? { is_active: false } : {}),
    } as Record<string, any>;

    const validated = productSchema.safeParse(formLike);
    if (!validated.success) {
      results.push({ title, ok: false, errors: validated.error.flatten().fieldErrors });
      continue;
    }

    // Include optional video_url in insertion only if the DB column exists
    const insertRow = hasVideoColumn && it.videoUrl
      ? { ...validated.data, video_url: it.videoUrl }
      : validated.data;
    toInsert.push(insertRow);
    results.push({
      title,
      slug,
      ok: true,
      pricing: retailCalc,
      volumetricKg,
      anomalies,
      category: finalCategory || 'General',
      description: desc,
      description_ar: descAr,
      images: images.split(',').map((s) => s.trim()).filter(Boolean),
      ...(it.videoUrl ? { videoUrl: it.videoUrl } : {}),
    });
  }

  if (!preview && toInsert.length > 0) {
    const { error } = await supabase.from('products').insert(toInsert);
    if (error) {
      const r = NextResponse.json({ error: error.message, results }, { status: 500 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
  }

  const r = NextResponse.json({ inserted: preview ? 0 : toInsert.length, preview, results });
  r.headers.set('x-request-id', log.requestId);
  return r;
}
