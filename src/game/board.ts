import type { BoardObject, ItemDef, Rarity } from './types';
import { ITEMS_BY_RARITY } from './content';

let uidCounter = 1;

function pickRarity(qualityLevel: number): Rarity {
  const uncommonChance = 0.14 + qualityLevel * 0.012;
  const rareChance = 0.01 + qualityLevel * 0.01;
  const roll = Math.random();
  if (roll < rareChance) return 'rare';
  if (roll < rareChance + uncommonChance) return 'uncommon';
  return 'common';
}

function pickItem(qualityLevel: number): ItemDef {
  const rarity = pickRarity(qualityLevel);
  const pool = ITEMS_BY_RARITY[rarity];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateBoard(
  arenaW: number,
  arenaH: number,
  magnetStart: { x: number; y: number },
  qualityLevel: number,
): BoardObject[] {
  const count = 10 + Math.floor(Math.random() * 4);
  const objects: BoardObject[] = [];
  const margin = arenaW * 0.11;
  const keepoutRadius = arenaW * 0.22;

  let attempts = 0;
  while (objects.length < count && attempts < count * 40) {
    attempts++;
    const x = margin + Math.random() * (arenaW - margin * 2);
    const y = margin + Math.random() * (arenaH * 0.72 - margin);
    const dx = x - magnetStart.x;
    const dy = y - magnetStart.y;
    if (Math.sqrt(dx * dx + dy * dy) < keepoutRadius) continue;

    let tooClose = false;
    for (const o of objects) {
      const ddx = o.targetPos.x - x;
      const ddy = o.targetPos.y - y;
      if (Math.sqrt(ddx * ddx + ddy * ddy) < arenaW * 0.1) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const item = pickItem(qualityLevel);
    objects.push({
      uid: uidCounter++,
      item,
      pos: { x, y: y - arenaH * 0.5 - Math.random() * 200 },
      targetPos: { x, y },
      radius: arenaW * 0.052,
      pulsesReceived: 0,
      carried: false,
      spawnDelay: Math.random() * 0.35,
      settled: false,
    });
  }

  return objects;
}
