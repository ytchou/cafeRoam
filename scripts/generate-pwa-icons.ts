/**
 * One-shot PWA icon generator.
 * Run: npx tsx scripts/generate-pwa-icons.ts
 * Output: public/icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png, favicon.ico
 */
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BG_COLOR = '#6F4E37';
const TEXT_COLOR = '#FFFFFF';
const CHARACTER = '啡';
const PUBLIC_DIR = join(import.meta.dirname, '..', 'public');

interface IconSpec {
  filename: string;
  size: number;
  maskable: boolean;
}

const icons: IconSpec[] = [
  { filename: 'icon-192.png', size: 192, maskable: false },
  { filename: 'icon-512.png', size: 512, maskable: false },
  { filename: 'icon-512-maskable.png', size: 512, maskable: true },
  { filename: 'apple-touch-icon.png', size: 180, maskable: false },
];

function generateIcon({ filename, size, maskable }: IconSpec): void {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, size, size);

  // For maskable icons, the safe zone is the center 80% circle.
  // Scale character down to fit within that zone.
  const fontScale = maskable ? 0.5 : 0.7;
  const fontSize = Math.round(size * fontScale);

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(CHARACTER, size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(PUBLIC_DIR, filename), buffer);
  console.log(`  ✓ ${filename} (${size}×${size}${maskable ? ' maskable' : ''})`);
}

function generateFavicon(): void {
  const size = 32;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, size, size);

  const fontSize = Math.round(size * 0.7);
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(CHARACTER, size / 2, size / 2);

  // Write as PNG (browsers accept PNG favicons; .ico is legacy but PNG works)
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(PUBLIC_DIR, 'favicon.ico'), buffer);
  console.log(`  ✓ favicon.ico (${size}×${size})`);
}

// Main
if (!existsSync(PUBLIC_DIR)) {
  mkdirSync(PUBLIC_DIR, { recursive: true });
}

console.log('Generating PWA icons...');
for (const spec of icons) {
  generateIcon(spec);
}
generateFavicon();
console.log('Done. Icons written to public/');
