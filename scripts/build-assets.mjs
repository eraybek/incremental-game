/**
 * Rebuilds `public/assets` from `assets-src/sheet.png`.
 *
 * `slice-sheet.mjs` finds the sprites and emits them in reading order; this
 * gives the ones the game uses a name. The map below is the whole point of the
 * file — an index on its own says nothing, and the previous asset set went
 * wrong precisely because nobody checked that `item_r5c5` was a frying pan and
 * not the tyre its id claimed.
 *
 * Sprites left unnamed are simply not copied. The sheet carries UI chrome the
 * game cannot use — pills and chips with English text baked into the artwork,
 * next to a Turkish interface — plus stacked clusters whose parts overlap and
 * so come back as a single blob. Those are skipped on purpose rather than
 * shipped as dead weight.
 *
 *   node scripts/build-assets.mjs
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSheet, slice, crop, encodePng } from './slice-sheet.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Sprite index in reading order -> path under `public/assets`. */
const NAMES = {
  // The magnet, by state. All four point their poles up, which is the
  // orientation the scene rotates from.
  1: 'magnet/idle',
  3: 'magnet/moving',
  4: 'magnet/pulse',
  7: 'magnet/loaded',

  // Rarity gems, cool to warm as the tiers climb.
  8: 'rarity/common',
  9: 'rarity/uncommon',
  10: 'rarity/rare',
  11: 'rarity/epic',
  12: 'rarity/legendary',

  // HUD. The sheet's ready-made pills have their numbers painted on, so the
  // icons are taken from standalone art and the values stay live text.
  13: 'hud/coin',
  41: 'hud/charge',
  144: 'hud/range',
  138: 'hud/magnet',

  // Buttons. `back` is the red arrow, turned to point left in CSS.
  107: 'buttons/play',
  127: 'buttons/upgrade',
  114: 'buttons/collection',
  113: 'buttons/lock',
  105: 'buttons/settings',
  136: 'buttons/back',
  108: 'buttons/help',
  106: 'buttons/pause',

  // Effects.
  90: 'fx/spark_small',
  92: 'fx/spark_blue',
  94: 'fx/spark_gold',
  124: 'fx/dust',
  126: 'fx/debris',
  133: 'fx/burst',
  137: 'fx/comet',
  147: 'fx/glow',

  // Arena dressing.
  64: 'environment/wood',
  65: 'environment/grate',
  66: 'environment/stone',
  79: 'environment/grass',
  80: 'environment/metal',
  103: 'environment/hazard',
  97: 'environment/platform',
  48: 'environment/crate',
  49: 'environment/barrel',
  63: 'environment/drum',

  // Loot. Names here must match what the sprite actually shows.
  18: 'collectibles/paperclip',
  19: 'collectibles/screw',
  20: 'collectibles/bolt',
  21: 'collectibles/washer',
  22: 'collectibles/nut',
  23: 'collectibles/nail',
  25: 'collectibles/bottlecap',
  26: 'collectibles/can_red',
  27: 'collectibles/can_blue',
  29: 'collectibles/wrench',
  30: 'collectibles/spanner',
  34: 'collectibles/screwdriver',
  35: 'collectibles/spoon',
  38: 'collectibles/gear',
  39: 'collectibles/spring',
  42: 'collectibles/bulb',
  51: 'collectibles/chain',
  76: 'collectibles/ladle',
  84: 'collectibles/disc',
  85: 'collectibles/tyre',
  86: 'collectibles/pan',
  87: 'collectibles/mallet',
  88: 'collectibles/floppy',
  89: 'collectibles/socket',

  28: 'collectibles/key',
  37: 'collectibles/padlock',
  43: 'collectibles/phone',
  44: 'collectibles/camera',
  45: 'collectibles/sunglasses',
  52: 'collectibles/ring',
  53: 'collectibles/necklace',
  54: 'collectibles/pendant',
  56: 'collectibles/book',
  61: 'collectibles/vase',
  68: 'collectibles/potion',
  70: 'collectibles/egg',
  71: 'collectibles/safe',
  72: 'collectibles/toolbox',
  73: 'collectibles/briefcase',
  74: 'collectibles/card_blue',
  75: 'collectibles/card_green',
  77: 'collectibles/hammer',
  78: 'collectibles/axe',
  83: 'collectibles/laptop',

  14: 'collectibles/gold_bar',
  31: 'collectibles/trophy',
  32: 'collectibles/chest_wood',
  60: 'collectibles/goblet',

  15: 'collectibles/diamond',
  16: 'collectibles/chest_red',
  69: 'collectibles/crystal',

  17: 'collectibles/crown',
  33: 'collectibles/golden_horse',
};

const sheet = loadSheet(join(root, 'assets-src/sheet.png'));
const sprites = slice(sheet, 0, 16);

const outRoot = join(root, 'public/assets');
rmSync(outRoot, { recursive: true, force: true });

const manifest = [];
for (const [index, name] of Object.entries(NAMES)) {
  const sprite = sprites[Number(index)];
  if (!sprite) throw new Error(`sprite ${index} (${name}) is out of range — did the sheet change?`);
  const img = crop(sheet, sprite.box);
  const file = join(outRoot, `${name}.png`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, encodePng(img));
  manifest.push({ name, index: Number(index), width: img.width, height: img.height });
}

writeFileSync(join(outRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${sprites.length} sprites found, ${manifest.length} named and written to public/assets`);
