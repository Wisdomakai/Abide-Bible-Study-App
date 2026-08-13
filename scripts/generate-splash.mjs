// Generates iOS PWA launch images (apple-touch-startup-image).
//
// iOS shows a blank screen while an installed PWA boots unless a startup image
// matches the device exactly, so every supported size is rendered here. The
// artwork mirrors src/screens/LaunchScreen.jsx: the app's own launch screen
// takes over from an identical-looking frame.
//
//   node scripts/generate-splash.mjs
//
// Re-run when the launch screen design changes, then paste the printed <link>
// tags into index.html.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'public', 'splash');

// Logical CSS size + device pixel ratio, portrait. Devices sharing a logical
// size and ratio share one image.
const DEVICES = [
  [375, 667, 2], [414, 736, 3], [375, 812, 3], [414, 896, 2], [414, 896, 3],
  [390, 844, 3], [428, 926, 3], [393, 852, 3], [430, 932, 3], [402, 874, 3],
  [440, 956, 3], [768, 1024, 2], [810, 1080, 2], [834, 1112, 2], [820, 1180, 2],
  [834, 1194, 2], [1024, 1366, 2],
];

const BG = '#4B3F9E';
const GOLD = '#C98A3C';
const BOOK = 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20';

function svg(w, h) {
  const cx = w / 2;
  // The stack (ring, wordmark, tagline) is centred as a group, matching the
  // launch screen's flex centring.
  const stackTop = h / 2 - 104;
  const ring = { size: 116, r: 34, y: stackTop };
  const logo = { size: 84, r: 26, y: ring.y + 16 };
  const glyph = 44;
  const glyphScale = glyph / 24;
  const wordmarkY = ring.y + ring.size + 24 + 38;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <circle cx="${cx}" cy="60" r="180" fill="#5B4FB0"/>
  <circle cx="${w - 70}" cy="${h - 10}" r="150" fill="#3A3180"/>
  <rect x="${cx - ring.size / 2}" y="${ring.y}" width="${ring.size}" height="${ring.size}" rx="${ring.r}"
        fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
  <rect x="${cx - logo.size / 2}" y="${logo.y}" width="${logo.size}" height="${logo.size}" rx="${logo.r}" fill="${GOLD}"/>
  <g transform="translate(${cx - glyph / 2} ${logo.y + (logo.size - glyph) / 2}) scale(${glyphScale})">
    <path d="${BOOK}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="${cx}" y="${wordmarkY}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="48" fill="#FFFFFF" letter-spacing="0.5">Ardent</text>
  <text x="${cx}" y="${wordmarkY + 30}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="14" fill="#C9C2F0" letter-spacing="1">Study · Reflect · Pray · Together</text>
  <text x="${cx}" y="${h - 96}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="15" font-style="italic" fill="rgba(255,255,255,0.7)">“Never be lacking in zeal,</text>
  <text x="${cx}" y="${h - 72}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="15" font-style="italic" fill="rgba(255,255,255,0.7)">but keep your spiritual fervor.”</text>
  <text x="${cx}" y="${h - 44}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="15" font-style="italic" fill="rgba(255,255,255,0.7)">Romans 12:11</text>
</svg>`;
}

await fs.mkdir(outDir, { recursive: true });
const tags = [];

for (const [w, h, scale] of DEVICES) {
  const file = `splash-${w}x${h}@${scale}x.png`;
  await sharp(Buffer.from(svg(w, h)), { density: 72 * scale })
    .resize(w * scale, h * scale)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, file));
  tags.push(
    `    <link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${scale}) and (orientation: portrait)" href="/splash/${file}" />`
  );
}

console.log(`Wrote ${DEVICES.length} splash images to public/splash/\n`);
console.log(tags.join('\n'));
