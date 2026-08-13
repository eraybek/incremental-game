export interface Vec2 {
  x: number;
  y: number;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ItemDef {
  id: string;
  name: string;
  sprite: string;
  rarity: Rarity;
  weight: number;
  value: number;
  /**
   * Relative spawn chance within its tier; 1 when omitted. This is a visual
   * dial, not an economic one — the common tier is 24 pieces of which most are
   * small grey fasteners, so an evenly rolled board came out as a field of
   * identical grey shapes on a dark floor. Turning the near-duplicates down and
   * the characterful pieces up fixes how a board reads without touching what
   * anything is worth.
   */
  spawn?: number;
}

export type UpgradeId =
  | 'power'
  | 'range'
  | 'launch'
  | 'loadEff'
  | 'extraTime'
  | 'extraShot'
  | 'lootValue'
  | 'lootQuality';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  /** null where the sheet has no sprite that reads at icon size — the card
   *  drops the slot rather than showing a smudge. */
  icon: string | null;
  /** Bare effect value at a level, so a card can show `current → next unit`
   *  without repeating the unit twice and overflowing a narrow card. */
  valueAt: (level: number) => string;
  /** Unit shown once, after the arrow. */
  unit: string;
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
}

export interface BoardObject {
  uid: number;
  item: ItemDef;
  pos: Vec2;
  targetPos: Vec2;
  radius: number;
  carried: boolean;
  spawnDelay: number;
  settled: boolean;
  /** Set each frame while the magnet is actively dragging this object. */
  beingPulled: boolean;
}

export type ZoneId = 'hurdalik' | 'atolye' | 'liman' | 'kasa';

export interface ZoneDef {
  id: ZoneId;
  name: string;
  subtitle: string;
  /** Drives the zone card's tint on the menu and the arena frame. */
  accent: string;
  /** Full-bleed arena background, drawn to cover the canvas. */
  floor: string;
  frameTile: string;
  /** Scrap value the zone wants before the next one opens; null on the last. */
  quota: number | null;
  /**
   * The mix of rarities this zone deals, as relative shares of the whole board
   * — not multipliers on a fixed base rate. Zero keeps a tier out entirely.
   * Loot Quality then shifts mass upward out of `common`.
   */
  pool: Record<Rarity, number>;
}

export interface PersistentState {
  coins: number;
  /** Where the player is now. */
  zone: ZoneId;
  /** Scrap value banked per zone, ever. Never resets, so a cleared zone can
   *  still be farmed. */
  zoneProgress: Partial<Record<ZoneId, number>>;
  upgrades: Record<UpgradeId, number>;
  discovered: string[];
  /** Number of shifts completed — the next one is `shiftsDone + 1`. */
  shiftsDone: number;
  muted: boolean;
  /** 0..1 effect volume. */
  sfxVolume: number;
  particles: boolean;
  haptics: boolean;
}
