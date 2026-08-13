import type { BoardObject, ItemDef, Rarity, Vec2, ZoneDef } from './types';
import type { ArenaRect } from './magnet';
import { ITEMS_BY_RARITY } from './content';

let uidCounter = 1;

/**
 * How much one level of Loot Quality lifts a tier's share. Common gets nothing,
 * so every level moves mass out of junk and into the tiers above it; the higher
 * the tier, the harder it climbs.
 */
const QUALITY_LIFT: Record<Rarity, number> = {
  common: 0,
  uncommon: 0.03,
  rare: 0.08,
  epic: 0.1,
  legendary: 0.12,
};

/**
 * The zone states the mix it wants as relative shares, and this normalises them
 * into a roll.
 *
 * The earlier version rolled each tier against a fixed base rate and scaled it
 * by the zone's weight, letting `common` absorb whatever was left. That made
 * `pool.common` dead weight — the vault zone asked for 0.15 common and still
 * dealt 86% common, because "everything else" is not something a weight can
 * shrink. Sharing out the whole distribution instead is what lets a zone
 * actually suppress junk.
 */
function pickRarity(qualityLevel: number, zone: ZoneDef): Rarity {
  const tiers = Object.keys(zone.pool) as Rarity[];

  let total = 0;
  const weights = tiers.map((tier) => {
    const w = zone.pool[tier] * (1 + qualityLevel * QUALITY_LIFT[tier]);
    total += w;
    return w;
  });

  let roll = Math.random() * total;
  for (let i = 0; i < tiers.length; i++) {
    roll -= weights[i];
    if (roll < 0) return tiers[i];
  }
  return 'common';
}

/**
 * How much a piece's chance drops for each copy already on the board. Drawing
 * eighteen pieces with replacement from a two-dozen pool throws up duplicates
 * often, and four identical cans in one board reads as a bug even though it is
 * ordinary luck. At 0.35 a second copy is uncommon and a fourth is close to
 * impossible, without ever forbidding a repeat outright.
 */
const REPEAT_FALLOFF = 0.35;

/** Weighted draw within a tier, honouring `spawn` and what is already placed. */
function pickFrom(pool: ItemDef[], placed: Map<string, number>): ItemDef {
  const weightOf = (item: ItemDef): number =>
    (item.spawn ?? 1) * Math.pow(REPEAT_FALLOFF, placed.get(item.id) ?? 0);

  let total = 0;
  for (const item of pool) total += weightOf(item);

  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= weightOf(item);
    if (roll < 0) return item;
  }
  return pool[pool.length - 1];
}

function pickItem(qualityLevel: number, zone: ZoneDef, placed: Map<string, number>): ItemDef {
  const rarity = pickRarity(qualityLevel, zone);
  const pool = ITEMS_BY_RARITY[rarity];
  // A zone that weights `common` down can still land on it when every richer
  // band misses; falling back keeps the board full rather than short.
  const item = pickFrom(pool.length === 0 ? ITEMS_BY_RARITY.common : pool, placed);
  placed.set(item.id, (placed.get(item.id) ?? 0) + 1);
  return item;
}

export function generateBoard(
  rect: ArenaRect,
  scaleRef: number,
  magnetStart: Vec2,
  magnetRadius: number,
  qualityLevel: number,
  zone: ZoneDef,
): BoardObject[] {
  const width = rect.maxX - rect.minX;
  const height = rect.maxY - rect.minY;
  const radius = scaleRef * 0.058;

  // Scale the count by area rather than by a single axis, so the board reads the
  // same whether the arena is a tall portrait column or a wide desktop window.
  //
  // The multiplier used to be 7.5, which in portrait worked out to 12.2 — under
  // the floor of 12. So every shift on a phone got exactly the minimum board no
  // matter what, and the ceiling of 22 was unreachable. At 11 a portrait arena
  // holds about 18, which fills the space without crowding: the pieces need
  // `radius * 2.25` between them and the arena has room for roughly a hundred
  // at that spacing.
  const density = (width * height) / (scaleRef * scaleRef);
  const count = Math.round(Math.min(26, Math.max(14, density * 11)));

  const objects: BoardObject[] = [];
  // Copies already placed, so repeats can be damped as the board fills.
  const placed = new Map<string, number>();
  const margin = radius * 1.6;
  const keepout = magnetRadius + radius + scaleRef * 0.1;
  const minSpacing = radius * 2.25;

  let attempts = 0;
  while (objects.length < count && attempts < count * 60) {
    attempts++;
    const x = rect.minX + margin + Math.random() * (width - margin * 2);
    const y = rect.minY + margin + Math.random() * (height - margin * 2);

    if (Math.hypot(x - magnetStart.x, y - magnetStart.y) < keepout) continue;

    let tooClose = false;
    for (const o of objects) {
      if (Math.hypot(o.targetPos.x - x, o.targetPos.y - y) < minSpacing) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    objects.push({
      uid: uidCounter++,
      item: pickItem(qualityLevel, zone, placed),
      pos: { x, y: rect.minY - radius * 2 - Math.random() * height },
      targetPos: { x, y },
      radius,
      carried: false,
      spawnDelay: Math.random() * 0.3,
      settled: false,
      beingPulled: false,
    });
  }

  return objects;
}

/** Random launch spot with enough room around it to read the board. */
export function randomMagnetStart(rect: ArenaRect, magnetRadius: number): Vec2 {
  const inset = magnetRadius * 2.2;
  return {
    x: rect.minX + inset + Math.random() * (rect.maxX - rect.minX - inset * 2),
    y: rect.minY + inset + Math.random() * (rect.maxY - rect.minY - inset * 2),
  };
}
