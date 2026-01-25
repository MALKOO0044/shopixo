import fs from 'fs-extra';
import path from 'path';

const root = process.cwd();
const categoriesTs = path.join(root, 'src', 'lib', 'categories.ts');
const publicDir = path.join(root, 'public');

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

async function download(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.ensureDir(path.dirname(destPath));
  await fs.writeFile(destPath, buf);
}

async function main() {
  const ts = await fs.readFile(categoriesTs, 'utf8');
  const cats = extractFullCategories(ts);

  let ok = 0, skipped = 0, failed = 0;

  for (const cat of cats) {
    const parent = cat.slug;
    const children = Array.isArray(cat.children) ? cat.children : [];
    for (const child of children) {
      const slug = child.slug;
      const localJpg = path.join(publicDir, 'categories', parent, `${slug}.jpg`);
      const localPng = path.join(publicDir, 'categories', parent, `${slug}.png`);

      if (await fs.pathExists(localJpg) || await fs.pathExists(localPng)) {
        skipped++;
        continue;
      }
      const src = child.image;
      if (!src || !/^https?:\/\//i.test(src)) {
        skipped++;
        continue;
      }
      try {
        await download(src, localJpg);
        console.log(`✔ downloaded: ${parent}/${slug}.jpg`);
        ok++;
      } catch (e) {
        console.warn(`✖ failed: ${parent}/${slug} -> ${e.message}`);
        failed++;
      }
    }
  }

  console.log(`\nDone. ok=${ok}, skipped=${skipped}, failed=${failed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
