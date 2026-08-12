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
  | 'lootValue'
  | 'lootQuality';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  icon: string;
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
  pulsesReceived: number;
  carried: boolean;
  spawnDelay: number;
  settled: boolean;
}

export interface PersistentState {
  coins: number;
  upgrades: Record<UpgradeId, number>;
  discovered: string[];
  totalRuns: number;
}
