export type ImageQualityPreset = 'thumbnail' | 'card' | 'gallery' | 'zoom';

const MIN_WIDTH_BY_PRESET: Record<ImageQualityPreset, number> = {
  thumbnail: 960,
  card: 1280,
  gallery: 2560,
  zoom: 4096,
};

const LOW_RES_QUERY_KEYS = ['w', 'width', 'h', 'height'];
const SIGNED_QUERY_KEY_RE = /^(x-amz-|x-goog-|signature|sig|token|expires|policy|googleaccessid|credential)/i;
const OSS_RESIZE_RE = /w_(\d{2,5})/i;

function shouldSkipQueryRewrite(params: URLSearchParams): boolean {
  for (const key of params.keys()) {
    if (SIGNED_QUERY_KEY_RE.test(key)) return true;
  }
  return false;
}

function cleanLowResQueryParams(parsed: URL, minWidth: number): void {
  for (const key of LOW_RES_QUERY_KEYS) {
    const raw = parsed.searchParams.get(key);
    if (!raw) continue;
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric > 0 && numeric < minWidth) {
      parsed.searchParams.delete(key);
    }
  }

  const ossProcess = parsed.searchParams.get('x-oss-process');
  if (ossProcess) {
    const match = ossProcess.match(OSS_RESIZE_RE);
    const width = match ? Number(match[1]) : NaN;
    if (Number.isFinite(width) && width > 0 && width < minWidth) {
      parsed.searchParams.delete('x-oss-process');
    }
  }
}

function injectCloudinaryTransform(url: string, minWidth: number): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/')) return url;

  const marker = url.includes('/image/upload/')
    ? '/image/upload/'
    : url.includes('/image/fetch/')
      ? '/image/fetch/'
      : null;
  if (!marker) return url;

  const idx = url.indexOf(marker);
  if (idx < 0) return url;

  const before = url.slice(0, idx + marker.length);
  const after = url.slice(idx + marker.length);
  const slashIndex = after.indexOf('/');
  const firstSegment = slashIndex >= 0 ? after.slice(0, slashIndex) : after;
  const rest = slashIndex >= 0 ? after.slice(slashIndex + 1) : '';

  const hasVersionFirst = /^v\d+$/i.test(firstSegment);
  const transformParts = ['f_auto', 'q_auto:best', 'dpr_auto', `w_${minWidth}`, 'c_limit'];

  if (hasVersionFirst || !firstSegment) {
    const versionAndRest = hasVersionFirst
      ? `${firstSegment}/${rest}`
      : rest;
    return `${before}${transformParts.join(',')}/${versionAndRest}`;
  }

  const currentTransforms = firstSegment;
  const normalized = currentTransforms.toLowerCase();
  const merged = [...currentTransforms.split(',').filter(Boolean)];

  if (!/\bf_auto\b/.test(normalized)) merged.push('f_auto');
  if (!/\bq_auto(?::[a-z0-9_]+)?\b/.test(normalized)) merged.push('q_auto:best');
  if (!/\bdpr_auto\b/.test(normalized)) merged.push('dpr_auto');

  const widthMatch = normalized.match(/\bw_(\d{2,5})\b/);
  const width = widthMatch ? Number(widthMatch[1]) : NaN;
  if (!Number.isFinite(width) || width < minWidth) {
    merged.push(`w_${minWidth}`);
    if (!/\bc_(limit|fit|fill|lfill|mfit)\b/.test(normalized)) merged.push('c_limit');
  }

  return `${before}${merged.join(',')}/${rest}`;
}

export function enhanceProductImageUrl(rawUrl: string, preset: ImageQualityPreset = 'gallery'): string {
  const raw = String(rawUrl || '').trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('/')) return raw;

  const minWidth = MIN_WIDTH_BY_PRESET[preset] || MIN_WIDTH_BY_PRESET.gallery;
  const httpsNormalized = raw.startsWith('http://') ? `https://${raw.slice('http://'.length)}` : raw;

  try {
    const parsed = new URL(httpsNormalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return httpsNormalized;
    }

    parsed.hash = '';

    if (!shouldSkipQueryRewrite(parsed.searchParams)) {
      cleanLowResQueryParams(parsed, minWidth);
    }

    return injectCloudinaryTransform(parsed.toString(), minWidth);
  } catch {
    return httpsNormalized;
  }
}

export function enhanceProductImageUrls(urls: string[], preset: ImageQualityPreset = 'gallery'): string[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
    .map((url) => enhanceProductImageUrl(url, preset));
}
