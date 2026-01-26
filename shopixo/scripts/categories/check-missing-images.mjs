import fs from 'fs-extra';
import path from 'path';
import url from 'url';

// ESM import of TS transpiled at runtime is not possible. We will read the TS file as text and do a minimal parse
// by searching for `FULL_CATEGORIES` JSON-like export using a brittle but workable approach.
const root = process.cwd();
const categoriesTs = path.join(root, 'src', 'lib', 'categories.ts');
const publicDir = path.join(root, 'public');

function extractFullCategories(tsSource) {
  const start = tsSource.indexOf('export const FULL_CATEGORIES');
  if (start === -1) throw new Error('FULL_CATEGORIES not found');
  const openBracket = tsSource.indexOf('[', start);
  if (openBracket === -1) throw new Error('FULL_CATEGORIES array start not found');
  // naive bracket match
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
    // Convert TS trailing commas safely
    .replace(/\,(\s*[\]\}])/g, '$1')
    // Convert single quotes to double quotes where safe
    .replace(/(['`])/g, '"')
    // Add quotes around object keys if missing (best-effort)
    .replace(/(\{|\,)(\s*)(slug|label|image|children)(\s*):/g, '$1$2"$3"$4:');
  try {
    const parsed = JSON.parse(jsonish);
    return parsed;
  } catch (e) {
    console.error('Failed to parse FULL_CATEGORIES JSON-ish:', e.message);
    throw e;
  }
}

async function main() {
  const src = await fs.readFile(categoriesTs, 'utf8');
  const cats = extractFullCategories(src);
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  let missing = 0;
  for (const cat of cats) {
    const parent = cat.slug;
    const children = Array.isArray(cat.children) ? cat.children : [];
    for (const child of children) {
      const slug = child.slug;
      const localJpg = path.join(publicDir, 'categories', parent, `${slug}.jpg`);
      const localPng = path.join(publicDir, 'categories', parent, `${slug}.png`);
      const haveLocal = (await fs.pathExists(localJpg)) || (await fs.pathExists(localPng));
      const hasImageField = !!child.image;
      const cloudUrl = cloud ? `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,c_fill,g_auto,w_560,h_560/categories/${parent}/${slug}.jpg` : null;

      if (!haveLocal && !hasImageField) {
        missing++;
        console.log(`- MISSING: ${parent}/${slug}`);
        if (cloudUrl) console.log(`  Cloudinary path: ${cloudUrl}`);
        console.log(`  Place one of:\n    public/categories/${parent}/${slug}.jpg\n    public/categories/${parent}/${slug}.png`);
      }
    }
  }

  if (missing === 0) {
    console.log('\nAll subcategory images are present (either via child.image or local public/ files).\n');
  } else {
    console.log(`\nTotal missing: ${missing}.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
