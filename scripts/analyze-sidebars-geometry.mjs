/*
 * Анализ контуров боковых панелей в user-background.png.
 * Без зависимостей — декодирует PNG через встроенный zlib.
 * Сохраняет luminance profile по строкам и столбцам,
 * чтобы определить границы тёмных проёмов боковых панелей.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

const SRC = 'public/dashboard/assets/backgrounds/user-background.png';
const OUT = 'artifacts/ui-audit/after/sidebar-measurements.json';

function readPng(bytes) {
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50) throw new Error('not a PNG');
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < bytes.length) {
    const len = bytes.readUInt32BE(pos); pos += 4;
    const type = bytes.toString('ascii', pos, pos + 4);
    const data = bytes.subarray(pos + 4, pos + 4 + len);
    pos += 4 + len + 4; // skip type + data + crc
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
  }
  return { width, height, bitDepth, colorType, raw: Buffer.concat(idat) };
}

function inflateScanlines(buf, width, height, bitDepth, colorType) {
  // Поддерживаем только 8-bit RGBA/RGB/gray для простоты (наш фон подходит)
  const inflated = zlib.inflateSync(buf);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 4;
  const bpp = (bitDepth * channels) / 8 | 0;
  const rowLen = width * bpp;
  const lines = [];
  let src = 0;
  let prev = Buffer.alloc(rowLen);
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
    lines.push(out);
    prev = out;
  }
  return { lines, channels, bpp };
}

function luminance(lines, channels, x, y, width) {
  const i = x * channels;
  const row = lines[y];
  if (channels >= 3) {
    return (0.299 * row[i] + 0.587 * row[i + 1] + 0.114 * row[i + 2]);
  }
  return row[i];
}

const buf = fs.readFileSync(SRC);
const png = readPng(buf);
console.log(`PNG ${png.width}x${png.height} depth=${png.bitDepth} ct=${png.colorType}`);
const { lines, channels } = inflateScanlines(png.raw, png.width, png.height, png.bitDepth, png.colorType);

// Масштаб к 1920×1080
const SX = 1920 / png.width;
const SY = 1080 / png.height;

// Luminance profile по горизонтальной полосе y=540 (центр) для нахождения
// границ тёмных проёмов левой/правой панелей.
const yC = Math.round(540 / SY);
const rowProfile = [];
for (let x = 0; x < png.width; x++) rowProfile.push(luminance(lines, channels, x, yC, png.width));

// Найти самые тёмные регионы слева и справа
function findDarkRange(profile, from, to) {
  let bestStart = from, bestEnd = from, bestLen = 0;
  let curStart = -1;
  const threshold = 45; // тёмные пиксели (проём)
  for (let i = from; i < to; i++) {
    if (profile[i] < threshold) {
      if (curStart === -1) curStart = i;
    } else {
      if (curStart !== -1 && i - curStart > bestLen) {
        bestLen = i - curStart;
        bestStart = curStart;
        bestEnd = i;
      }
      curStart = -1;
    }
  }
  if (curStart !== -1 && to - curStart > bestLen) {
    bestLen = to - curStart; bestStart = curStart; bestEnd = to;
  }
  return { start: bestStart, end: bestEnd, len: bestLen };
}

// Сканируем по Y — для каждой строки ищем тёмный диапазон в левой и правой половине
const scanLines = [];
for (let py = 0; py < png.height; py++) {
  const left = findDarkRange(
    Array.from({ length: Math.floor(png.width / 2) }, (_, i) => luminance(lines, channels, i, py, png.width)),
    0, Math.floor(png.width / 2)
  );
  const right = findDarkRange(
    Array.from({ length: png.width - Math.floor(png.width / 2) }, (_, i) => luminance(lines, channels, i + Math.floor(png.width / 2), py, png.width)),
    0, png.width - Math.floor(png.width / 2)
  );
  scanLines.push({
    y: py,
    leftDark: { x0: left.start, x1: left.end, len: left.len },
    rightDark: { x0: left ? Math.floor(png.width / 2) + right.start : 0, x1: Math.floor(png.width / 2) + right.end, len: right.len }
  });
}

// Найти вертикальный диапазон, где левая/правая панель реально существуют (длинные тёмные зоны)
const leftRanges = scanLines.filter((s) => s.leftDark.len > 50);
const rightRanges = scanLines.filter((s) => s.rightDark.len > 50);
const yTop = Math.min(leftRanges[0]?.y ?? 0, rightRanges[0]?.y ?? 0);
const yBot = Math.max(leftRanges[leftRanges.length - 1]?.y ?? png.height, rightRanges[rightRanges.length - 1]?.y ?? png.height);

// Внешние и внутренние границы проёмов на нескольких Y
function sampleAt(ys, side) {
  return ys.map((y) => {
    const s = scanLines[y];
    return side === 'left'
      ? { y, outer: s.leftDark.x0, inner: s.leftDark.x1, len: s.leftDark.len }
      : { y, outer: s.rightDark.x0, inner: s.rightDark.x1, len: s.rightDark.len };
  });
}

const sampleY = [Math.round(yTop), Math.round(yTop + (yBot - yTop) * 0.1), Math.round(yTop + (yBot - yTop) * 0.3), Math.round(yTop + (yBot - yTop) * 0.5), Math.round(yTop + (yBot - yTop) * 0.7), Math.round(yTop + (yBot - yTop) * 0.9), Math.round(yBot - 1)];
const leftSamples = sampleAt(sampleY, 'left');
const rightSamples = sampleAt(sampleY, 'right');

const result = {
  source: SRC,
  sourceSize: [png.width, png.height],
  stageSize: [1920, 1080],
  scale: { x: SX, y: SY },
  detected: {
    yTopRaw: yTop,
    yBottomRaw: yBot,
    yTopStage: Math.round(yTop * SY),
    yBottomStage: Math.round(yBot * SY),
    leftRawSamples: leftSamples,
    rightRawSamples: rightSamples,
    leftStageSamples: leftSamples.map((s) => ({ y: Math.round(s.y * SY), outer: Math.round(s.outer * SX), inner: Math.round(s.inner * SX), len: Math.round(s.len * SX) })),
    rightStageSamples: rightSamples.map((s) => ({ y: Math.round(s.y * SY), outer: Math.round(s.outer * SX), inner: Math.round(s.inner * SX), len: Math.round(s.len * SX) })),
  },
  note: 'Измерения сделаны по luminance-profile threshold=45. Это стартовые точки; финальные контуры нужно уточнить визуально по reference-sidebars.png.',
};

fs.mkdirSync('artifacts/ui-audit/after', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`saved ${OUT}`);
console.log(JSON.stringify({ leftStage: result.detected.leftStageSamples, rightStage: result.detected.rightStageSamples, yTopStage: result.detected.yTopStage, yBottomStage: result.detected.yBottomStage }, null, 2));