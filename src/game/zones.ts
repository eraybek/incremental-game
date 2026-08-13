import type { ItemDef, Rarity, ZoneDef, ZoneId } from './types';
import { ITEMS } from './content';
import { asset } from '../assetPath';

const A = asset('assets');

/**
 * Quotas were first set by eye at 1200 / 9000 / 45000 and then measured: an
 * automated run of 41 shifts with random aim — the floor of what a player
 * manages, since aiming at clusters beats it several times over — banked 774 in
 * Hurdalık, holding around 21 per shift. That puts the opening zone at roughly
 * 60 shifts at the floor and far fewer in real hands, which is about right.
 *
 * The zones after it were not. Earnings do not compound nearly as fast as the
 * quotas climbed, so 9000 and 45000 worked out to ~180 and ~500 shifts. They
 * are now 5000 and 18000, aimed at each zone taking somewhat longer than the
 * one before it rather than several times longer. Richer pools carry part of
 * the increase on their own: a rare pull is worth ten commons, so the same
 * board pays far more in Liman than in Hurdalık.
 *
 * Zones are the game's spine. Before them a shift was "Vardiya 41" on the same
 * arena with a random board — the number went up but nothing in the world
 * changed, so there was nowhere to be going.
 *
 * A zone is deliberately cheap: it does not author boards, it re-weights them.
 * Each one owns a floor, a frame, an accent colour and a slice of the item
 * list, so the boards stay procedural while the place you are standing in
 * changes. That buys a sense of destination without a content treadmill.
 *
 * `quota` is the total scrap value the zone wants before the next one opens.
 * Progress is per-zone and never resets, so a zone can be replayed for money
 * long after it has been cleared.
 */
export const ZONES: ZoneDef[] = [
  {
    id: 'hurdalik',
    name: 'Hurdalık',
    subtitle: 'Vidalar, somunlar ve unutulmuş takımlar.',
    accent: '#6fd36f',
    floorTile: `${A}/environment/stone.png`,
    frameTile: `${A}/environment/hazard.png`,
    quota: 1200,
    // The opening zone stays honest junk: no jewellery, no treasure. A rare
    // pull here is a trophy or a gold bar, not a crown.
    pool: {
      common: 1,
      uncommon: 0.55,
      rare: 0.35,
      epic: 0,
      legendary: 0,
    },
  },
  {
    id: 'atolye',
    name: 'Atölye',
    subtitle: 'Aletler, elektronik ve kasadan artakalanlar.',
    accent: '#4bb4ff',
    floorTile: `${A}/environment/metal.png`,
    frameTile: `${A}/environment/hazard.png`,
    quota: 5000,
    pool: {
      common: 0.8,
      uncommon: 1,
      rare: 0.8,
      epic: 0.4,
      legendary: 0,
    },
  },
  {
    id: 'liman',
    name: 'Liman Deposu',
    subtitle: 'Konteynerlerden düşenler. Ağır ve değerli.',
    accent: '#c07cff',
    floorTile: `${A}/environment/grate.png`,
    frameTile: `${A}/environment/hazard.png`,
    quota: 18000,
    pool: {
      common: 0.5,
      uncommon: 0.9,
      rare: 1,
      epic: 0.9,
      legendary: 0.5,
    },
  },
  {
    id: 'kasa',
    name: 'Kasa Dairesi',
    subtitle: 'Sadece kıymetli olan. Hurda burada bulunmaz.',
    accent: '#ffc837',
    floorTile: `${A}/environment/wood.png`,
    frameTile: `${A}/environment/hazard.png`,
    // The last zone has no quota — nothing comes after it, so it is where the
    // long game lives.
    quota: null,
    pool: {
      common: 0.15,
      uncommon: 0.6,
      rare: 1,
      epic: 1,
      legendary: 1,
    },
  },
];

export const ZONE_MAP: Record<ZoneId, ZoneDef> = Object.fromEntries(
  ZONES.map((z) => [z.id, z]),
) as Record<ZoneId, ZoneDef>;

/** Items a zone can spawn, grouped by tier, skipping tiers it weights at zero. */
export function zoneItems(zone: ZoneDef): Record<Rarity, ItemDef[]> {
  const out = {} as Record<Rarity, ItemDef[]>;
  for (const tier of Object.keys(zone.pool) as Rarity[]) {
    out[tier] = zone.pool[tier] > 0 ? ITEMS.filter((i) => i.rarity === tier) : [];
  }
  return out;
}

/** How many items across every zone — the collection's real denominator. */
export function zoneOf(id: ZoneId): ZoneDef {
  return ZONE_MAP[id] ?? ZONES[0];
}

export function nextZone(id: ZoneId): ZoneDef | null {
  const i = ZONES.findIndex((z) => z.id === id);
  return i >= 0 && i < ZONES.length - 1 ? ZONES[i + 1] : null;
}

/** A zone is open once every zone before it has met its quota. */
export function isZoneUnlocked(id: ZoneId, progress: Partial<Record<ZoneId, number>>): boolean {
  const index = ZONES.findIndex((z) => z.id === id);
  if (index <= 0) return true;
  for (let i = 0; i < index; i++) {
    const zone = ZONES[i];
    if (zone.quota === null) continue;
    if ((progress[zone.id] ?? 0) < zone.quota) return false;
  }
  return true;
}
