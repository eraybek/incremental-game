import type { BoardObject, ItemDef, Rarity, Vec2 } from './types';
import type { ArenaRect } from './magnet';
import { ITEMS_BY_RARITY } from './content';

let uidCounter = 1;

/** Rolled from the rarest tier down, so each band is checked against the slice
 *  of the roll below it. Loot Quality widens every band, but the top two stay
 *  rare enough that pulling one is the story of the shift rather than a
 *  routine pickup. */
function pickRarity(qualityLevel: number): Rarity {
  const legendaryChance = 0.0015 + qualityLevel * 0.0011;
  const epicChance = 0.005 + qualityLevel * 0.003;
  const rareChance = 0.01 + qualityLevel * 0.01;
  const uncommonChance = 0.14 + qualityLevel * 0.012;

  const roll = Math.random();
  if (roll < legendaryChance) return 'legendary';
  if (roll < legendaryChance + epicChance) return 'epic';
  if (roll < legendaryChance + epicChance + rareChance) return 'rare';
  if (roll < legendaryChance + epicChance + rareChance + uncommonChance) return 'uncommon';
  return 'common';
}

function pickItem(qualityLevel: number): ItemDef {
  const rarity = pickRarity(qualityLevel);
  const pool = ITEMS_BY_RARITY[rarity];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateBoard(
  rect: ArenaRect,
  scaleRef: number,
  magnetStart: Vec2,
  magnetRadius: number,
  qualityLevel: number,
): BoardObject[] {
  const width = rect.maxX - rect.minX;
  const height = rect.maxY - rect.minY;
  const radius = scaleRef * 0.058;

  // Scale the count by area rather than by a single axis, so the board reads the
  // same whether the arena is a tall portrait column or a wide desktop window.
  const density = (width * height) / (scaleRef * scaleRef);
  const count = Math.round(Math.min(22, Math.max(12, density * 7.5)));

  const objects: BoardObject[] = [];
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
      item: pickItem(qualityLevel),
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
