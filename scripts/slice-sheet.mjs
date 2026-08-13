/**
 * Cuts a sprite sheet into individual PNGs by finding each sprite's own pixels.
 *
 * The old `public/assets` set was cut on a fixed grid, which is why a handful
 * of files were header text, blank slivers, or several items mashed into one
 * frame. A grid cannot work on these sheets: rows are ragged, sprites in a row
 * are neither the same width nor evenly spaced, and the columns down the right
 * edge do not line up with the ones on the left. Row/column projections fail
 * for the same reason — no horizontal line crosses the sheet without touching
 * something, so the whole image comes back as a single band.
 *
 * So this labels connected regions instead. Every blob of non-background pixel
 * becomes a candidate; blobs closer than `--pad` are merged, so a sprite made
 * of separate pieces (a magnet and its glow dots) stays one sprite. Results are
 * emitted in reading order as `r<row>c<column>`.
 *
 * Background: exported sheets often bake the transparency checkerboard in as
 * real pixels. Passing `--checker` reconstructs that pattern and treats only
 * pixels matching it as background, which matters because the sprites are drawn
 * with black outlines that a plain brightness threshold would eat. Enclosed
 * dark areas are protected by flood-filling background inward from the border,
 * and the outline is restored by regrowing the mask a couple of pixels.
 *
 * Zero dependencies — PNG in, PNG out, using node:zlib. Usage:
 *
 *   node scripts/slice-sheet.mjs <sheet.png> <out-dir> [--pad=0] [--min=16] [--checker]
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
export function decodePng(buf) {
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
export function encodePng({ width, height, data }) {
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

// -------------------------------------------------------------- background

const ALPHA_FLOOR = 8;

/**
 * Finds the baked-in transparency checkerboard: its cell size and two shades.
 * Reads along a row near the top edge, which on these sheets is clear of art.
 */
export function detectChecker(img) {
  const at = (x, y) => img.data[(y * img.width + x) * 4];
  const probeY = 2;
  let first = -1;
  for (let x = 1; x < Math.min(img.width, 400); x++) {
    if (Math.abs(at(x, probeY) - at(x - 1, probeY)) > 10) {
      first = x;
      break;
    }
  }
  if (first <= 0) return null;

  // Confirm the spacing repeats before trusting it as a cell size.
  for (let k = 2; k <= 4; k++) {
    const x = first * k;
    if (x >= img.width) break;
    if (Math.abs(at(x, probeY) - at(x - 1, probeY)) <= 10) return null;
  }

  const px = (x, y) => {
    const i = (y * img.width + x) * 4;
    return [img.data[i], img.data[i + 1], img.data[i + 2]];
  };
  return { cell: first, c0: px(0, 0), c1: px(first + 2, 0) };
}

/** Rewrites alpha so only true background is transparent. */
export function applyCheckerAlpha(img, checker, regrow = 2) {
  const { cell, c0, c1 } = checker;
  const { width: w, height: h } = img;
  const isBg = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const exp = (((x / cell) | 0) + ((y / cell) | 0)) % 2 === 0 ? c0 : c1;
      const i = (y * w + x) * 4;
      const d =
        Math.max(
          Math.abs(img.data[i] - exp[0]),
          Math.abs(img.data[i + 1] - exp[1]),
        ) > Math.abs(img.data[i + 2] - exp[2])
          ? Math.max(Math.abs(img.data[i] - exp[0]), Math.abs(img.data[i + 1] - exp[1]))
          : Math.abs(img.data[i + 2] - exp[2]);
      if (d <= 6) isBg[y * w + x] = 1;
    }
  }

  // Only background reachable from the border is really outside a sprite; a
  // dark patch enclosed by art (a screen, a shadow) must stay opaque.
  const outside = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const k = y * w + x;
    if (isBg[k] && !outside[k]) {
      outside[k] = 1;
      stack.push(k);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length > 0) {
    const k = stack.pop();
    const x = k % w;
    const y = (k / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  // The sprites' black outlines match the checker's black squares exactly, so
  // the pass above eats about half of every outline. Regrowing the kept pixels
  // by two puts it back without reaching into open background.
  let keep = new Uint8Array(w * h);
  for (let i = 0; i < keep.length; i++) keep[i] = outside[i] ? 0 : 1;
  for (let pass = 0; pass < regrow; pass++) {
    const grown = Uint8Array.from(keep);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!keep[y * w + x]) continue;
        if (x > 0) grown[y * w + x - 1] = 1;
        if (x < w - 1) grown[y * w + x + 1] = 1;
        if (y > 0) grown[(y - 1) * w + x] = 1;
        if (y < h - 1) grown[(y + 1) * w + x] = 1;
      }
    }
    keep = grown;
  }

  for (let i = 0; i < keep.length; i++) img.data[i * 4 + 3] = keep[i] ? 255 : 0;
}

// -------------------------------------------------------------- segmenting

function alphaAt(img, x, y) {
  return img.data[(y * img.width + x) * 4 + 3];
}

/** Bounding boxes of 8-connected runs of opaque pixel. */
function components(img) {
  const { width: w, height: h } = img;
  const seen = new Uint8Array(w * h);
  const boxes = [];
  const stack = [];

  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      const start = sy * w + sx;
      if (seen[start] || alphaAt(img, sx, sy) < ALPHA_FLOOR) continue;

      seen[start] = 1;
      stack.push(start);
      let x0 = sx;
      let x1 = sx;
      let y0 = sy;
      let y1 = sy;

      while (stack.length > 0) {
        const k = stack.pop();
        const x = k % w;
        const y = (k / w) | 0;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nk = ny * w + nx;
            if (seen[nk] || alphaAt(img, nx, ny) < ALPHA_FLOOR) continue;
            seen[nk] = 1;
            stack.push(nk);
          }
        }
      }

      boxes.push({ x0, y0, x1, y1 });
    }
  }

  return boxes;
}

/**
 * Unions boxes lying within `pad` of each other. Pairs are tested on the
 * ORIGINAL boxes, never on the growing union: a merged box spans the gap
 * between its parts, and testing against that instead cascades until the whole
 * sheet collapses into one sprite.
 */
function mergeNear(boxes, pad) {
  const parent = boxes.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const apart =
        a.x1 + pad < b.x0 || b.x1 + pad < a.x0 || a.y1 + pad < b.y0 || b.y1 + pad < a.y0;
      if (apart) continue;
      const ra = find(i);
      const rb = find(j);
      if (ra !== rb) parent[rb] = ra;
    }
  }

  const merged = new Map();
  boxes.forEach((b, i) => {
    const r = find(i);
    const m = merged.get(r);
    if (!m) {
      merged.set(r, { ...b });
      return;
    }
    m.x0 = Math.min(m.x0, b.x0);
    m.y0 = Math.min(m.y0, b.y0);
    m.x1 = Math.max(m.x1, b.x1);
    m.y1 = Math.max(m.y1, b.y1);
  });

  return [...merged.values()];
}

/** Reading order: group boxes into rows by vertical centre, then left to right. */
function nameInReadingOrder(boxes) {
  const sorted = [...boxes].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const rows = [];
  for (const box of sorted) {
    const cy = (box.y0 + box.y1) / 2;
    const row = rows.find((r) => Math.abs(r.cy - cy) < 45);
    if (row) row.items.push(box);
    else rows.push({ cy, items: [box] });
  }
  rows.sort((a, b) => a.cy - b.cy);

  const out = [];
  rows.forEach((row, ri) => {
    row.items.sort((a, b) => a.x0 - b.x0);
    row.items.forEach((box, ci) => out.push({ name: `r${ri + 1}c${ci + 1}`, box }));
  });
  return out;
}

export function slice(img, pad, min) {
  const kept = components(img).filter(
    (b) => b.x1 - b.x0 + 1 >= min && b.y1 - b.y0 + 1 >= min,
  );
  return nameInReadingOrder(mergeNear(kept, pad));
}

/** Shrinks a box to the pixels that actually carry ink. */
export function tighten(img, box) {
  let { x0, y0, x1, y1 } = box;
  const blank = (fixed, horizontal) => {
    if (horizontal) {
      for (let x = x0; x <= x1; x++) if (alphaAt(img, x, fixed) >= ALPHA_FLOOR) return false;
    } else {
      for (let y = y0; y <= y1; y++) if (alphaAt(img, fixed, y) >= ALPHA_FLOOR) return false;
    }
    return true;
  };
  while (y0 < y1 && blank(y0, true)) y0++;
  while (y1 > y0 && blank(y1, true)) y1--;
  while (x0 < x1 && blank(x0, false)) x0++;
  while (x1 > x0 && blank(x1, false)) x1--;
  return { x0, y0, x1, y1 };
}

/**
 * Splits an already-isolated crop along one axis wherever a clear line of
 * transparency crosses it. Connected-component labelling cannot separate the
 * sheet's stacked UI — the rarity chips and the menu buttons have overlapping
 * glows, so they come back as one blob — but inside a single cluster a
 * projection works, because there the gaps really do span the whole crop.
 */
export function projectionSplit(img, axis = 'rows', gap = 3, min = 8) {
  const rows = axis === 'rows';
  const outer = rows ? img.height : img.width;
  const inner = rows ? img.width : img.height;

  const ink = new Uint8Array(outer);
  for (let a = 0; a < outer; a++) {
    for (let b = 0; b < inner; b++) {
      const x = rows ? b : a;
      const y = rows ? a : b;
      if (alphaAt(img, x, y) >= ALPHA_FLOOR) {
        ink[a] = 1;
        break;
      }
    }
  }

  const spans = [];
  let start = -1;
  let run = 0;
  for (let i = 0; i < outer; i++) {
    if (ink[i]) {
      if (start < 0) start = i;
      run = 0;
    } else if (start >= 0 && ++run >= gap) {
      if (i - run - start + 1 >= min) spans.push([start, i - run]);
      start = -1;
      run = 0;
    }
  }
  if (start >= 0 && outer - run - start >= min) spans.push([start, outer - run - 1]);

  return spans.map(([a0, a1]) =>
    tighten(img, {
      x0: rows ? 0 : a0,
      y0: rows ? a0 : 0,
      x1: rows ? img.width - 1 : a1,
      y1: rows ? a1 : img.height - 1,
    }),
  );
}

export function crop(img, { x0, y0, x1, y1 }) {
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

/** Every slice on one grid, scaled to a common cell, for a visual check. */
export function contactSheet(img, sprites, cell = 96) {
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

/** Decode + de-checker in one step, for callers that build on this module. */
export function loadSheet(path, { checker = true } = {}) {
  const img = decodePng(readFileSync(path));
  if (!checker) return img;
  const found = detectChecker(img);
  if (found) applyCheckerAlpha(img, found);
  return img;
}

// ------------------------------------------------------------------- main

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('slice-sheet.mjs');

const [sheetPath, outDir] = invokedDirectly
  ? process.argv.slice(2).filter((a) => !a.startsWith('--'))
  : [null, null];

if (invokedDirectly) {
if (!sheetPath || !outDir) {
  console.error(
    'usage: node scripts/slice-sheet.mjs <sheet.png> <out-dir> [--pad=0] [--min=16] [--checker]',
  );
  process.exit(1);
}

const flag = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};

const sheet = decodePng(readFileSync(sheetPath));

if (process.argv.includes('--checker')) {
  const checker = detectChecker(sheet);
  if (!checker) {
    console.error('no checkerboard found — drop --checker if the sheet has real alpha');
    process.exit(1);
  }
  console.log(`checker: ${checker.cell}px cells, ${checker.c0} / ${checker.c1}`);
  applyCheckerAlpha(sheet, checker);
}

const sprites = slice(sheet, flag('pad', 0), flag('min', 16));

mkdirSync(outDir, { recursive: true });
const manifest = sprites.map((s) => {
  const img = crop(sheet, s.box);
  writeFileSync(join(outDir, `${s.name}.png`), encodePng(img));
  return { name: s.name, x: s.box.x0, y: s.box.y0, width: img.width, height: img.height };
});

writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(outDir, '_contact.png'), encodePng(contactSheet(sheet, sprites)));

console.log(`${sheet.width}x${sheet.height} -> ${sprites.length} sprites in ${outDir}`);
}
