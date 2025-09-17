import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const srcSvg = path.join(publicDir, 'logo-icon.svg');
const srcPng = path.join(publicDir, 'logo-icon.png');

const sizes = [
  { size: 16, file: 'favicon-16x16.png' },
  { size: 32, file: 'favicon-32x32.png' },
  { size: 48, file: 'favicon-48x48.png' },
  { size: 180, file: 'apple-touch-icon.png' },
  { size: 192, file: 'android-chrome-192x192.png' },
  { size: 256, file: 'android-chrome-256x256.png' },
  { size: 384, file: 'android-chrome-384x384.png' },
  { size: 512, file: 'android-chrome-512x512.png' }
];

async function main() {
  await fs.ensureDir(publicDir);
  const hasPng = await fs.pathExists(srcPng);
  const hasSvg = await fs.pathExists(srcSvg);
  if (!hasPng && !hasSvg) {
    throw new Error(`Missing ${srcSvg} or ${srcPng}.`);
  }

  const isPng = hasPng;
  const baseInput = isPng
    ? await sharp(srcPng).ensureAlpha().toBuffer()
    : await fs.readFile(srcSvg);

  async function renderWithMask(size) {
    const inputOpts = isPng ? {} : { density: 560 };
    const resized = await sharp(baseInput, inputOpts)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    // Apply rounded-rectangle alpha mask to clear any white corners from source PNG
    const radius = Math.round(size * (96 / 512));
    const maskSvg = Buffer.from(
      `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>\n` +
      `  <rect x='0' y='0' width='${size}' height='${size}' rx='${radius}' ry='${radius}' fill='#fff'/>\n` +
      `</svg>`
    );
    const masked = await sharp(resized)
      .composite([{ input: maskSvg, blend: 'dest-in' }])
      .png({ compressionLevel: 9 })
      .toBuffer();
    return masked;
  }
  const generatedIcoPngs = [];

  for (const { size, file } of sizes) {
    const out = path.join(publicDir, file);
    const buf = await renderWithMask(size);
    await sharp(buf).png({ compressionLevel: 9 }).toFile(out);

    if (size <= 48) generatedIcoPngs.push(out);
    console.log(`✔️  ${file}`);
  }

  // favicon.ico (16, 32, 48) — pass Buffers for robust compatibility
  const ico = await pngToIco(await Promise.all(generatedIcoPngs.map(p => fs.readFile(p))));
  await fs.writeFile(path.join(publicDir, 'favicon.ico'), ico);
  console.log('✔️  favicon.ico');

  // maskable 512: لوضع أي هوامش آمنة
  const safe = Math.round(512 * 0.86);
  const centered = await renderWithMask(safe);

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 17, g: 60, b: 107, alpha: 1 }
    }
  })
    .composite([
      { input: centered, left: Math.round((512 - safe) / 2), top: Math.round((512 - safe) / 2) }
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'maskable-icon-512.png'));

  console.log('\n✅ جميع الأيقونات تم توليدها داخل public/.\n');
}

main().catch((e) => {
  console.error('❌ Icon generation failed:', e);
  process.exit(1);
});
