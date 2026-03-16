/**
 * One-shot PWA icon generator.
 * Run: npx tsx scripts/generate-pwa-icons.ts
 * Output: public/icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png, favicon.png
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
  maskable?: boolean;
  fontScale?: number;
}

const ICON_SPECS: IconSpec[] = [
  { filename: 'icon-192.png', size: 192 },
  { filename: 'icon-512.png', size: 512 },
  { filename: 'icon-512-maskable.png', size: 512, maskable: true },
  { filename: 'apple-touch-icon.png', size: 180 },
  { filename: 'favicon.png', size: 32 },
];

function generateIcon({ filename, size, maskable, fontScale }: IconSpec): void {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, size, size);

  const scale = fontScale ?? (maskable ? 0.5 : 0.7);
  const fontSize = Math.round(size * scale);

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(CHARACTER, size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(PUBLIC_DIR, filename), buffer);
  const suffix = maskable ? ' maskable' : '';
  console.log(`  ${filename} (${size}x${size}${suffix})`);
}

// Main
if (!existsSync(PUBLIC_DIR)) {
  mkdirSync(PUBLIC_DIR, { recursive: true });
}

console.log('Generating PWA icons...');
for (const spec of ICON_SPECS) {
  generateIcon(spec);
}
console.log('Done. Icons written to public/');
