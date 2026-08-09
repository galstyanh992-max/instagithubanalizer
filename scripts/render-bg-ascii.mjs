/*
 * ASCII-визуализация PNG — чтобы буквально увидеть форму кокпита и боковых проёмов.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

function readPng(bytes) {
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < bytes.length) {
    const len = bytes.readUInt32BE(pos); pos += 4;
    const type = bytes.toString('ascii', pos, pos + 4);
    const data = bytes.subarray(pos + 4, pos + 4 + len);
    pos += 4 + len + 4;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  return { width, height, bitDepth, colorType, raw: Buffer.concat(idat) };
}

function inflateScanlines(buf, width, height, bitDepth, colorType) {
  const inflated = zlib.inflateSync(buf);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 4;
  const bpp = (bitDepth * channels) / 8 | 0;
  const rowLen = width * bpp;
  const lines = [];
  let src = 0; let prev = Buffer.alloc(rowLen);
  for (let y = 0; y < height; y++) {
    const f = inflated[src++];
    const row = inflated.subarray(src, src + rowLen); src += rowLen;
    const out = Buffer.alloc(rowLen);
    for (let i = 0; i < rowLen; i++) {
      const x = row[i];
      const a = i >= bpp ? out[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v;
      switch (f) {
        case 0: v = x; break;
        case 1: v = (x + a) & 0xff; break;
        case 2: v = (x + b) & 0xff; break;
        case 3: v = (x + ((a + b) >> 1)) & 0xff; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          const pp = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          v = (x + pp) & 0xff; break;
        }
        default: v = x;
      }
      out[i] = v;
    }
    lines.push(out); prev = out;
  }
  return { lines, channels };
}

function luminanceAt(lines, channels, x, y) {
  const i = x * channels;
  const row = lines[y];
  if (channels >= 3) return 0.299 * row[i] + 0.587 * row[i + 1] + 0.114 * row[i + 2];
  return row[i];
}

const CH = ' .:-=+*#%@';
function toChar(l) {
  const i = Math.min(CH.length - 1, Math.floor(l / 256 * CH.length));
  return CH[i];
}

function render(file, outTxt, cols = 200, rows = 56) {
  const buf = fs.readFileSync(file);
  const png = readPng(buf);
  const { lines, channels } = inflateScanlines(png.raw, png.width, png.height, png.bitDepth, png.colorType);
  let out = `${file} (${png.width}x${png.height}) → ${cols}x${rows}\n`;
  for (let r = 0; r < rows; r++) {
    const py = Math.floor(r * png.height / rows);
    let line = '';
    for (let c = 0; c < cols; c++) {
      const px = Math.floor(c * png.width / cols);
      line += toChar(luminanceAt(lines, channels, px, py));
    }
    out += line + '\n';
  }
  fs.writeFileSync(outTxt, out);
  console.log(`wrote ${outTxt}`);
}

fs.mkdirSync('artifacts/ui-audit/after', { recursive: true });
render('public/dashboard/assets/backgrounds/user-background.png', 'artifacts/ui-audit/after/bg-ascii.txt');
render('artifacts/ui-audit/reference/reference-b.png', 'artifacts/ui-audit/after/ref-b-ascii.txt');
render('artifacts/ui-audit/reference/current.png', 'artifacts/ui-audit/after/current-ascii.txt');