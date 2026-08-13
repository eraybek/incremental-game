/**
 * Cuts a sprite sheet into individual PNGs by finding the gaps between sprites.
 *
 * The existing `public/assets` set was cut on a fixed grid, which is why a
 * handful of files are header text, blank slivers, or two items mashed into
 * one frame. A fixed grid cannot work here: the sheets have ragged rows, and
 * sprites within a row are neither the same width nor evenly spaced.
 *
 * So this walks the alpha channel instead. Rows of fully-transparent pixels
 * separate bands; columns of fully-transparent pixels separate sprites within
 * a band. Every sprite then gets tight-cropped to its own ink. Naming stays
 * `r<band>c<index>` so it lines up with how the code already refers to slices.
 *
 * Zero dependencies — PNG in, PNG out, using node:zlib. Usage:
 *
 *   node scripts/slice-sheet.mjs <sheet.png> <out-dir> [--gap=8] [--min=12]
 *
 * Writes the slices, a `manifest.json` describing each one, and `_contact.png`
 * — every slice on a labelled grid, so the cut can be eyeballed before the
 * names get wired into the game.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync, deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- PNG codec

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** Paeth predictor, straight from the PNG spec. */
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Decodes 8-bit non-interlaced RGB/RGBA PNGs to a flat RGBA buffer. */
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');

  let width = 0;
  let height = 0;
  let colorType = 6;
  const idat = [];

  for (let off = 8; off < buf.length; ) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const depth = data[8];
      colorType = data[9];
      if (depth !== 8) throw new Error(`unsupported bit depth ${depth}, need 8`);
      if (colorType !== 6 && colorType !== 2) {
        throw new Error(`unsupported color type ${colorType}, need 2 (RGB) or 6 (RGBA)`);
      }
      if (data[12] !== 0) throw new Error('interlaced PNGs are not supported');
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(width * height * 4);
  const line = Buffer.alloc(stride);
  const prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    raw.copy(line, 0, y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);

    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      line[i] = v & 0xff;
    }

    for (let x = 0; x < width; x++) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      out[d] = line[s];
      out[d + 1] = line[s + 1];
      out[d + 2] = line[s + 2];
      out[d + 3] = channels === 4 ? line[s + 3] : 255;
    }

    line.copy(prev);
  }

  return { width, height, data: out };
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Encodes RGBA with filter 0 on every scanline — simple and small enough here. */
function encodePng({ width, height, data }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// -------------------------------------------------------------- segmenting

const ALPHA_FLOOR = 8;

/**
 * Splits a projection of "does this line hold any ink" into runs, ignoring
 * gaps shorter than `gap`. A sprite is rarely one solid mass — a magnet's
 * glow dots and a barrier's stripes sit apart from the body — so small gaps
 * have to survive as part of a single sprite.
 */
function runs(occupied, gap, min) {
  const spans = [];
  let start = -1;
  let blank = 0;
  for (let i = 0; i < occupied.length; i++) {
    if (occupied[i]) {
      if (start < 0) start = i;
      blank = 0;
    } else if (start >= 0) {
      blank++;
      if (blank >= gap) {
        const end = i - blank;
        if (end - start + 1 >= min) spans.push([start, end]);
        start = -1;
        blank = 0;
      }
    }
  }
  if (start >= 0 && occupied.length - blank - start >= min) {
    spans.push([start, occupied.length - blank - 1]);
  }
  return spans;
}

function alphaAt(img, x, y) {
  return img.data[(y * img.width + x) * 4 + 3];
}

/** Shrinks a box to the pixels that actually carry ink. */
function tighten(img, box) {
  let { x0, y0, x1, y1 } = box;
  const empty = (fixed, horizontal) => {
    if (horizontal) {
      for (let x = x0; x <= x1; x++) if (alphaAt(img, x, fixed) >= ALPHA_FLOOR) return false;
    } else {
      for (let y = y0; y <= y1; y++) if (alphaAt(img, fixed, y) >= ALPHA_FLOOR) return false;
    }
    return true;
  };
  while (y0 < y1 && empty(y0, true)) y0++;
  while (y1 > y0 && empty(y1, true)) y1--;
  while (x0 < x1 && empty(x0, false)) x0++;
  while (x1 > x0 && empty(x1, false)) x1--;
  return { x0, y0, x1, y1 };
}

function crop(img, { x0, y0, x1, y1 }) {
  const width = x1 - x0 + 1;
  const height = y1 - y0 + 1;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    img.data.copy(
      data,
      y * width * 4,
      ((y0 + y) * img.width + x0) * 4,
      ((y0 + y) * img.width + x1 + 1) * 4,
    );
  }
  return { width, height, data };
}

function slice(img, gap, min) {
  const rowInk = new Uint8Array(img.height);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (alphaAt(img, x, y) >= ALPHA_FLOOR) {
        rowInk[y] = 1;
        break;
      }
    }
  }

  const sprites = [];
  const bands = runs(rowInk, gap, min);

  bands.forEach(([y0, y1], bandIndex) => {
    const colInk = new Uint8Array(img.width);
    for (let x = 0; x < img.width; x++) {
      for (let y = y0; y <= y1; y++) {
        if (alphaAt(img, x, y) >= ALPHA_FLOOR) {
          colInk[x] = 1;
          break;
        }
      }
    }
    runs(colInk, gap, min).forEach(([x0, x1], colIndex) => {
      const box = tighten(img, { x0, y0, x1, y1 });
      if (box.x1 - box.x0 + 1 < min || box.y1 - box.y0 + 1 < min) return;
      sprites.push({ name: `r${bandIndex + 1}c${colIndex + 1}`, box });
    });
  });

  return sprites;
}

/** Every slice on one grid, scaled to a common cell, for a visual check. */
function contactSheet(img, sprites, cell = 96) {
  const cols = Math.min(10, Math.max(1, Math.ceil(Math.sqrt(sprites.length))));
  const rows = Math.ceil(sprites.length / cols);
  const width = cols * cell;
  const height = rows * cell;
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 34;
    data[i + 1] = 36;
    data[i + 2] = 46;
    data[i + 3] = 255;
  }

  sprites.forEach((s, i) => {
    const sw = s.box.x1 - s.box.x0 + 1;
    const sh = s.box.y1 - s.box.y0 + 1;
    const scale = Math.min((cell - 8) / sw, (cell - 8) / sh, 1);
    const dw = Math.max(1, Math.round(sw * scale));
    const dh = Math.max(1, Math.round(sh * scale));
    const ox = (i % cols) * cell + Math.floor((cell - dw) / 2);
    const oy = Math.floor(i / cols) * cell + Math.floor((cell - dh) / 2);

    for (let y = 0; y < dh; y++) {
      for (let x = 0; x < dw; x++) {
        const sx = s.box.x0 + Math.min(sw - 1, Math.floor(x / scale));
        const sy = s.box.y0 + Math.min(sh - 1, Math.floor(y / scale));
        const si = (sy * img.width + sx) * 4;
        const di = ((oy + y) * width + ox + x) * 4;
        const a = img.data[si + 3] / 255;
        for (let c = 0; c < 3; c++) {
          data[di + c] = Math.round(img.data[si + c] * a + data[di + c] * (1 - a));
        }
      }
    }
  });

  return { width, height, data };
}

// ------------------------------------------------------------------- main

const [sheetPath, outDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!sheetPath || !outDir) {
  console.error('usage: node scripts/slice-sheet.mjs <sheet.png> <out-dir> [--gap=8] [--min=12]');
  process.exit(1);
}

const flag = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};

const sheet = decodePng(readFileSync(sheetPath));
const sprites = slice(sheet, flag('gap', 8), flag('min', 12));

mkdirSync(outDir, { recursive: true });
const manifest = sprites.map((s) => {
  const img = crop(sheet, s.box);
  writeFileSync(join(outDir, `${s.name}.png`), encodePng(img));
  return { name: s.name, x: s.box.x0, y: s.box.y0, width: img.width, height: img.height };
});

writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(outDir, '_contact.png'), encodePng(contactSheet(sheet, sprites)));

console.log(`${sheet.width}x${sheet.height} -> ${sprites.length} sprites in ${outDir}`);
