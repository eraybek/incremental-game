import type { ItemDef, Rarity, UpgradeDef, UpgradeId } from './types';
import { asset } from '../assetPath';

const A = asset('assets');

/** Chrome shared by the HUD and the modals. */
export const UI_SPRITES = {
  coin: `${A}/hud/icon_coin.png`,
  hourglass: `${A}/hud/icon_hourglass.png`,
  magnet: `${A}/hud/icon_magnet_small.png`,
  target: `${A}/hud/icon_target.png`,
  play: `${A}/buttons/btn_r2c1.png`,
  upgrade: `${A}/buttons/btn_r2c2.png`,
  collection: `${A}/buttons/btn_r4c3.png`,
  lock: `${A}/buttons/btn_r4c2.png`,
  lightning: `${A}/hud/icon_lightning.png`,
  settings: `${A}/buttons/btn_r2c4.png`,
  back: `${A}/buttons/btn_r2c5.png`,
};

/** Everything the canvas scene draws directly. */
export const SCENE_SPRITES = {
  magnet: `${A}/magnet/magnet.png`,
  hazardTile: `${A}/environment/tile_r6c3.png`,
};

export const ITEMS: ItemDef[] = [
  // common junk
  { id: 'screw_a', name: 'Vida', sprite: `${A}/collectibles/item_r2c1.png`, rarity: 'common', weight: 1, value: 4 },
  { id: 'screw_b', name: 'Cıvata', sprite: `${A}/collectibles/item_r2c2.png`, rarity: 'common', weight: 1, value: 4 },
  { id: 'nut', name: 'Somun', sprite: `${A}/collectibles/item_r2c3.png`, rarity: 'common', weight: 1, value: 5 },
  { id: 'gear_small', name: 'Dişli', sprite: `${A}/collectibles/item_r2c4.png`, rarity: 'common', weight: 2, value: 6 },
  { id: 'gear_big', name: 'Büyük Dişli', sprite: `${A}/collectibles/item_r2c5.png`, rarity: 'common', weight: 2, value: 7 },
  { id: 'wrench', name: 'İngiliz Anahtarı', sprite: `${A}/collectibles/item_r2c7.png`, rarity: 'common', weight: 2, value: 8 },
  { id: 'spoon_a', name: 'Kaşık', sprite: `${A}/collectibles/item_r3c2.png`, rarity: 'common', weight: 1, value: 5 },
  { id: 'spoon_b', name: 'Kepçe', sprite: `${A}/collectibles/item_r3c3.png`, rarity: 'common', weight: 1, value: 5 },
  { id: 'driver', name: 'Tornavida', sprite: `${A}/collectibles/item_r3c5.png`, rarity: 'common', weight: 2, value: 7 },
  { id: 'tire', name: 'Lastik', sprite: `${A}/collectibles/item_r5c5.png`, rarity: 'common', weight: 3, value: 9 },
  { id: 'mug', name: 'Kupa Bardak', sprite: `${A}/collectibles/item_r7c2.png`, rarity: 'common', weight: 1, value: 6 },
  { id: 'bucket', name: 'Kova', sprite: `${A}/collectibles/item_r7c3.png`, rarity: 'common', weight: 2, value: 7 },
  { id: 'battery', name: 'Pil', sprite: `${A}/collectibles/item_r3c7.png`, rarity: 'common', weight: 1, value: 6 },
  { id: 'can_bulb', name: 'Teneke Kutu', sprite: `${A}/collectibles/item_r6c1.png`, rarity: 'common', weight: 2, value: 8 },

  // uncommon
  { id: 'keychain', name: 'Anahtarlık', sprite: `${A}/collectibles/item_r2c6.png`, rarity: 'uncommon', weight: 3, value: 16 },
  { id: 'key', name: 'Anahtar', sprite: `${A}/collectibles/item_r3c1.png`, rarity: 'uncommon', weight: 2, value: 14 },
  { id: 'scissors', name: 'Makas', sprite: `${A}/collectibles/item_r3c4.png`, rarity: 'uncommon', weight: 3, value: 15 },
  { id: 'hammer', name: 'Çekiç', sprite: `${A}/collectibles/item_r3c6.png`, rarity: 'uncommon', weight: 4, value: 18 },
  { id: 'ring', name: 'Yüzük', sprite: `${A}/collectibles/item_r4c1.png`, rarity: 'uncommon', weight: 2, value: 20 },
  { id: 'clock', name: 'Saat', sprite: `${A}/collectibles/item_r4c2.png`, rarity: 'uncommon', weight: 3, value: 19 },
  { id: 'camera', name: 'Kamera', sprite: `${A}/collectibles/item_r4c3.png`, rarity: 'uncommon', weight: 4, value: 22 },
  { id: 'glasses', name: 'Gözlük', sprite: `${A}/collectibles/item_r4c4.png`, rarity: 'uncommon', weight: 2, value: 17 },
  { id: 'book', name: 'Kitap', sprite: `${A}/collectibles/item_r5c1.png`, rarity: 'uncommon', weight: 3, value: 16 },
  { id: 'chest', name: 'Sandık', sprite: `${A}/collectibles/item_r5c2.png`, rarity: 'uncommon', weight: 5, value: 24 },
  { id: 'backpack', name: 'Çanta', sprite: `${A}/collectibles/item_r5c3.png`, rarity: 'uncommon', weight: 4, value: 21 },
  { id: 'toolbox', name: 'Alet Çantası', sprite: `${A}/collectibles/item_r5c4.png`, rarity: 'uncommon', weight: 5, value: 23 },
  { id: 'phone', name: 'Telefon', sprite: `${A}/collectibles/item_r6c2.png`, rarity: 'uncommon', weight: 3, value: 18 },
  { id: 'briefcase', name: 'Evrak Çantası', sprite: `${A}/collectibles/item_r7c4.png`, rarity: 'uncommon', weight: 5, value: 25 },

  // rare
  { id: 'trophy', name: 'Kupa', sprite: `${A}/collectibles/item_r4c5.png`, rarity: 'rare', weight: 6, value: 70 },
  { id: 'diamond', name: 'Elmas', sprite: `${A}/collectibles/item_r4c6.png`, rarity: 'rare', weight: 5, value: 90 },
];

export const ITEMS_BY_RARITY: Record<Rarity, ItemDef[]> = {
  common: ITEMS.filter((i) => i.rarity === 'common'),
  uncommon: ITEMS.filter((i) => i.rarity === 'uncommon'),
  rare: ITEMS.filter((i) => i.rarity === 'rare'),
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9aa0b4',
  uncommon: '#4cd964',
  rare: '#4c9aff',
};

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'power',
    valueAt: (l) => `${(3 + l * 0.8).toFixed(1)} güç`,
    name: 'Magnet Power',
    description: 'Objeleri daha hızlı çeker, daha ağırlarını kaldırır.',
    icon: `${A}/hud/icon_magnet_small.png`,
    baseCost: 18,
    costGrowth: 1.32,
    maxLevel: 24,
  },
  {
    id: 'range',
    valueAt: (l) => `×${(1 + l * 0.1).toFixed(2)} alan`,
    name: 'Attraction Range',
    description: 'Mıknatısın çekim alanını genişletir.',
    icon: `${A}/hud/icon_target.png`,
    baseCost: 22,
    costGrowth: 1.3,
    maxLevel: 24,
  },
  {
    id: 'launch',
    valueAt: (l) => `×${(1 + l * 0.11).toFixed(2)} mesafe`,
    name: 'Launch Distance',
    description: 'Maksimum atış mesafesini artırır.',
    icon: `${A}/buttons/btn_r2c2.png`,
    baseCost: 20,
    costGrowth: 1.3,
    maxLevel: 24,
  },
  {
    id: 'loadEff',
    valueAt: (l) => `-%${Math.round(Math.min(0.85, l * 0.07) * 100)} ceza`,
    name: 'Load Efficiency',
    description: 'Taşınan yükün atış mesafesine olan cezasını azaltır.',
    icon: `${A}/buttons/btn_r2c4.png`,
    baseCost: 26,
    costGrowth: 1.38,
    maxLevel: 16,
  },
  {
    id: 'extraTime',
    valueAt: (l) => `${BASE_RUN_DURATION + l * SECONDS_PER_TIME_LEVEL} sn`,
    name: 'Vardiya Süresi',
    description: 'Her seviye vardiyaya +2 saniye ekler.',
    icon: `${A}/hud/icon_hourglass.png`,
    baseCost: 24,
    costGrowth: 1.33,
    maxLevel: 12,
  },
  {
    id: 'extraShot',
    valueAt: (l) => `${BASE_SHOTS + l} atış`,
    name: 'Ekstra Atış',
    description: 'Her seviye vardiya başına +1 atış verir.',
    icon: `${A}/hud/icon_lightning.png`,
    baseCost: 55,
    costGrowth: 1.85,
    maxLevel: 7,
  },
  {
    id: 'lootValue',
    valueAt: (l) => `×${(1 + l * 0.12).toFixed(2)} değer`,
    name: 'Loot Value',
    description: 'Toplanan objelerin para değerini artırır.',
    icon: `${A}/hud/icon_coin.png`,
    baseCost: 28,
    costGrowth: 1.35,
    maxLevel: 24,
  },
  {
    id: 'lootQuality',
    valueAt: (l) => `%${(1 + l).toFixed(0)} nadir`,
    name: 'Loot Quality',
    description: 'Daha nadir objelerin çıkma ihtimalini artırır.',
    icon: `${A}/rarity/gem_rare.png`,
    baseCost: 40,
    costGrowth: 1.5,
    maxLevel: 12,
  },
];

export const UPGRADE_MAP: Record<UpgradeId, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
) as Record<UpgradeId, UpgradeDef>;

export interface Milestone {
  name: string;
  description: string;
  icon: string;
}

export const MILESTONES: Milestone[] = [
  { name: 'Live Drops', description: 'Vardiya sırasında yukarıdan yeni objeler düşer.', icon: `${A}/buttons/btn_r4c2.png` },
  { name: 'Time Slow', description: 'Nişan alırken zaman yavaşlar.', icon: `${A}/buttons/btn_r4c2.png` },
  { name: 'Automation', description: 'Küçük objeleri otomatik toplar.', icon: `${A}/buttons/btn_r4c2.png` },
];

export function upgradeCost(def: UpgradeDef, currentLevel: number): number {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}

/** Deliberately punishing openers: one shot and ten seconds. Vardiya Süresi and
 *  Ekstra Atış upgrades are what pull these out of the starting squeeze. */
export const BASE_RUN_DURATION = 10;
export const BASE_SHOTS = 1;
export const SECONDS_PER_TIME_LEVEL = 2;
export const BASE_MAGNET_POWER = 3;
