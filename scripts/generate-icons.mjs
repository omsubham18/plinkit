import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Creates a raw PNG buffer from RGBA pixel data.
 */
function createPng(width, height, getPixel) {
  const bytesPerPixel = 4;
  const scanlineLength = width * bytesPerPixel;
  const rawData = Buffer.alloc(height * (scanlineLength + 1));

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    // CRC calculation
    const crc = calcCrc(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const chunks = [
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflated),
    makeChunk('IEND', Buffer.alloc(0)),
  ];

  return Buffer.concat(chunks);
}

// Table of CRCs
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function calcCrc(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Draw brand icon: rounded squircle with lightning bolt
function iconPixel(x, y, w, h, isMaskable = false) {
  const normX = (x / w) * 2 - 1;
  const normY = (y / h) * 2 - 1;
  const dist = Math.hypot(normX, normY);

  const radius = isMaskable ? 1.4 : 0.88;
  const inBackground = isMaskable || (Math.abs(normX) < radius && Math.abs(normY) < radius);

  // Lightning bolt shape
  const scale = isMaskable ? 0.6 : 0.75;
  const bx = normX / scale;
  const by = normY / scale;

  // Bolt geometry: 3 segments
  let inBolt = false;
  // Segment 1: top to center
  if (by >= -0.75 && by <= 0.05 && bx >= -0.25 - (by + 0.75) * 0.15 && bx <= 0.35 - (by + 0.75) * 0.15) {
    inBolt = true;
  }
  // Segment 2: horizontal step
  if (by >= -0.15 && by <= 0.15 && bx >= -0.35 && bx <= 0.35) {
    inBolt = true;
  }
  // Segment 3: center to bottom tip
  if (by >= 0.0 && by <= 0.75 && bx >= -0.35 + (by) * 0.4 && bx <= 0.25 - (by) * 0.1) {
    inBolt = true;
  }

  if (inBolt) {
    return [255, 255, 255, 255]; // Pure white bolt
  }

  if (inBackground) {
    // Brand blue #2451E6
    return [36, 81, 230, 255];
  }

  return [0, 0, 0, 0]; // Transparent outside squircle
}

// Open Graph sharing image: 1200x630
function ogPixel(x, y, w, h) {
  // Brand gradient / clean canvas
  const normX = x / w;
  const normY = y / h;

  // Left card with logo & text, right with delivery visual
  // Top header bar in brand blue
  if (y < 12) {
    return [36, 81, 230, 255];
  }

  // Left side icon badge
  const iconSize = 140;
  const iconLeft = 80;
  const iconTop = 80;

  if (x >= iconLeft && x < iconLeft + iconSize && y >= iconTop && y < iconTop + iconSize) {
    return iconPixel(x - iconLeft, y - iconTop, iconSize, iconSize, false);
  }

  // Card background #FFFFFF with line #E6E8EC
  if (y >= 600) {
    return [36, 81, 230, 255]; // Bottom brand accent line
  }

  // Clean soft canvas #F8FAFC
  const bg = [248, 250, 252, 255];
  return bg;
}

const publicDir = path.resolve(process.cwd(), 'public');

// 1. Generate favicon.svg
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#2451E6"/>
  <path d="M296 64L152 288h120l-32 160 176-240H280l48-144z" fill="#FFFFFF"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg, 'utf-8');
console.log('✓ Created public/favicon.svg');

// 2. Generate 192x192 PNG
const pwa192 = createPng(192, 192, (x, y, w, h) => iconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
console.log('✓ Created public/pwa-192x192.png');

// 3. Generate 512x512 PNG
const pwa512 = createPng(512, 512, (x, y, w, h) => iconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
console.log('✓ Created public/pwa-512x512.png');

// 4. Generate maskable 512x512 PNG
const maskable512 = createPng(512, 512, (x, y, w, h) => iconPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'maskable-icon-512x512.png'), maskable512);
console.log('✓ Created public/maskable-icon-512x512.png');

// 5. Generate apple-touch-icon.png (180x180)
const appleIcon = createPng(180, 180, (x, y, w, h) => iconPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
console.log('✓ Created public/apple-touch-icon.png');

// 6. Generate og-image.png (1200x630)
const ogImage = createPng(1200, 630, (x, y, w, h) => ogPixel(x, y, w, h));
fs.writeFileSync(path.join(publicDir, 'og-image.png'), ogImage);
console.log('✓ Created public/og-image.png');
console.log('All icons generated successfully!');
