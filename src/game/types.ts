export interface Vec2 {
  x: number;
  y: number;
}

export type Rarity = 'common' | 'uncommon' | 'rare';

export interface ItemDef {
  id: string;
  name: string;
  sprite: string;
  rarity: Rarity;
  weight: number;
  value: number;
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
  icon: string;
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

export interface PersistentState {
  coins: number;
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
