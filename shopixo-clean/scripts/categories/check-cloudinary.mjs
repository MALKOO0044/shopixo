import fs from 'fs-extra';
import path from 'path';

function extractFullCategories(tsSource) {
  const start = tsSource.indexOf('export const FULL_CATEGORIES');
  if (start === -1) throw new Error('FULL_CATEGORIES not found');
  const openBracket = tsSource.indexOf('[', start);
  if (openBracket === -1) throw new Error('FULL_CATEGORIES array start not found');
  let depth = 0;
  let end = -1;
  for (let i = openBracket; i < tsSource.length; i++) {
    const ch = tsSource[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new Error('FULL_CATEGORIES array end not found');
  const jsonish = tsSource.slice(openBracket, end + 1)
    .replace(/\,(\s*[\]\}])/g, '$1')
    .replace(/(['`])/g, '"')
    .replace(/(\{|\,)(\s*)(slug|label|image|children)(\s*):/g, '$1$2"$3"$4:');
  return JSON.parse(jsonish);
}

async function head(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function main() {
  const cloud = process.argv[2] || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const parentFilter = process.argv[3]; // optional slug e.g. women
  const ext = process.argv[4] || 'jpg';
  if (!cloud) {
    console.error('Usage: node scripts/categories/check-cloudinary.mjs <cloud_name> [parentSlug] [ext]');
    process.exit(1);
  }

  const root = process.cwd();
  const categoriesTs = path.join(root, 'src', 'lib', 'categories.ts');
  const ts = await fs.readFile(categoriesTs, 'utf8');
  const cats = extractFullCategories(ts);

  let missing = 0;
  let ok = 0;
  for (const cat of cats) {
    if (parentFilter && cat.slug !== parentFilter) continue;
    const parent = cat.slug;
    const children = Array.isArray(cat.children) ? cat.children : [];
    for (const child of children) {
      const slug = child.slug;
      const url = `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,c_fill,g_auto,w_560,h_560/categories/${parent}/${slug}.${ext}`;
      const exists = await head(url);
      if (exists) {
        ok++;
      } else {
        missing++;
        console.log(`- MISSING on Cloudinary: ${parent}/${slug}.${ext}`);
      }
    }
  }
  console.log(`\nCloudinary check complete. ok=${ok}, missing=${missing}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
