import type { ItemDef, Rarity, UpgradeDef, UpgradeId } from './types';
import { asset } from '../assetPath';

const A = asset('assets');

/** Chrome shared by the HUD and the modals. */
export const UI_SPRITES = {
  coin: `${A}/hud/coin.png`,
  magnet: `${A}/hud/magnet.png`,
  range: `${A}/hud/range.png`,
  charge: `${A}/hud/charge.png`,
  play: `${A}/buttons/play.png`,
  upgrade: `${A}/buttons/upgrade.png`,
  collection: `${A}/buttons/collection.png`,
  lock: `${A}/buttons/lock.png`,
  settings: `${A}/buttons/settings.png`,
  back: `${A}/buttons/back.png`,
};

/** Everything the canvas scene draws directly. */
export const SCENE_SPRITES = {
  /** The magnet by state: parked, flying, field holding something, and loaded
   *  up with scrap. All four point their poles up, which is the orientation
   *  the scene rotates from. */
  magnetIdle: `${A}/magnet/idle.png`,
  magnetMoving: `${A}/magnet/moving.png`,
  magnetPulse: `${A}/magnet/pulse.png`,
  magnetLoaded: `${A}/magnet/loaded.png`,
  hazardTile: `${A}/environment/hazard.png`,
  floorTile: `${A}/environment/metal.png`,
  /** Sprite-based hit and collect bursts, replacing drawn circles. */
  spark: `${A}/fx/burst.png`,
  dust: `${A}/fx/dust.png`,
};

const item = (
  id: string,
  name: string,
  file: string,
  rarity: Rarity,
  weight: number,
  value: number,
  spawn?: number,
): ItemDef => ({ id, name, sprite: `${A}/collectibles/${file}.png`, rarity, weight, value, spawn });

/** Small grey fasteners: right for a scrapyard, but six of them look alike. */
const DRAB = 0.45;
/** Pieces with their own colour or silhouette, worth seeing more often. */
const VIVID = 1.6;

export const ITEMS: ItemDef[] = [
  // Common: the scrapyard floor. Light, cheap, and what most of a shift is.
  item('paperclip', 'Ataş', 'paperclip', 'common', 1, 3, DRAB),
  item('screw', 'Vida', 'screw', 'common', 1, 4, DRAB),
  item('bolt', 'Cıvata', 'bolt', 'common', 1, 4, DRAB),
  item('washer', 'Rondela', 'washer', 'common', 1, 4, DRAB),
  item('nut', 'Somun', 'nut', 'common', 1, 5, DRAB),
  item('nail', 'Çivi', 'nail', 'common', 1, 4, DRAB),
  item('bottlecap', 'Kapak', 'bottlecap', 'common', 1, 4, DRAB),
  item('can_red', 'Kırmızı Kutu', 'can_red', 'common', 2, 6, VIVID),
  item('can_blue', 'Mavi Kutu', 'can_blue', 'common', 2, 6, VIVID),
  item('wrench', 'İngiliz Anahtarı', 'wrench', 'common', 2, 8),
  item('spanner', 'Kurbağacık', 'spanner', 'common', 2, 8),
  item('screwdriver', 'Tornavida', 'screwdriver', 'common', 2, 7, VIVID),
  item('spoon', 'Kaşık', 'spoon', 'common', 1, 5),
  item('ladle', 'Kepçe', 'ladle', 'common', 2, 6),
  item('gear', 'Dişli', 'gear', 'common', 2, 7),
  item('spring', 'Yay', 'spring', 'common', 2, 6),
  item('bulb', 'Ampul', 'bulb', 'common', 1, 6, VIVID),
  item('chain', 'Zincir', 'chain', 'common', 2, 7),
  item('disc', 'Disk', 'disc', 'common', 2, 7),
  item('tyre', 'Lastik', 'tyre', 'common', 3, 9),
  item('pan', 'Tava', 'pan', 'common', 3, 9),
  item('mallet', 'Tokmak', 'mallet', 'common', 3, 9, VIVID),
  item('floppy', 'Disket', 'floppy', 'common', 1, 6, VIVID),
  item('socket', 'Priz', 'socket', 'common', 2, 7),

  // Uncommon: things somebody would miss. Worth aiming for.
  item('key', 'Anahtar', 'key', 'uncommon', 2, 14),
  item('padlock', 'Asma Kilit', 'padlock', 'uncommon', 3, 15),
  item('phone', 'Telefon', 'phone', 'uncommon', 3, 18),
  item('camera', 'Kamera', 'camera', 'uncommon', 4, 22),
  item('sunglasses', 'Gözlük', 'sunglasses', 'uncommon', 2, 17),
  item('ring', 'Yüzük', 'ring', 'uncommon', 2, 20),
  item('necklace', 'Kolye', 'necklace', 'uncommon', 2, 21),
  item('pendant', 'Madalyon', 'pendant', 'uncommon', 2, 19),
  item('book', 'Kitap', 'book', 'uncommon', 3, 16),
  item('vase', 'Vazo', 'vase', 'uncommon', 4, 23),
  item('potion', 'İksir', 'potion', 'uncommon', 3, 20),
  item('egg', 'Süslü Yumurta', 'egg', 'uncommon', 3, 24),
  item('safe', 'Kasa', 'safe', 'uncommon', 6, 26),
  item('toolbox', 'Alet Çantası', 'toolbox', 'uncommon', 5, 23),
  item('briefcase', 'Evrak Çantası', 'briefcase', 'uncommon', 5, 25),
  item('card_blue', 'Banka Kartı', 'card_blue', 'uncommon', 1, 18),
  item('card_green', 'Kredi Kartı', 'card_green', 'uncommon', 1, 18),
  item('hammer', 'Çekiç', 'hammer', 'uncommon', 4, 18),
  item('axe', 'Balta', 'axe', 'uncommon', 4, 19),
  item('laptop', 'Dizüstü', 'laptop', 'uncommon', 5, 27),

  // Rare: the shift turns a profit on one of these.
  item('gold_bar', 'Altın Külçe', 'gold_bar', 'rare', 7, 75),
  item('trophy', 'Kupa', 'trophy', 'rare', 6, 70),
  item('goblet', 'Altın Kadeh', 'goblet', 'rare', 5, 80),
  item('chest_wood', 'Sandık', 'chest_wood', 'rare', 7, 85),

  // Epic.
  item('diamond', 'Elmas', 'diamond', 'epic', 6, 240),
  item('crystal', 'Kristal', 'crystal', 'epic', 5, 220),
  item('chest_red', 'Hazine Sandığı', 'chest_red', 'epic', 8, 280),

  // Legendary.
  item('crown', 'Taç', 'crown', 'legendary', 9, 720),
  item('golden_horse', 'Altın At', 'golden_horse', 'legendary', 10, 900),
];

export const ITEMS_BY_RARITY: Record<Rarity, ItemDef[]> = {
  common: ITEMS.filter((i) => i.rarity === 'common'),
  uncommon: ITEMS.filter((i) => i.rarity === 'uncommon'),
  rare: ITEMS.filter((i) => i.rarity === 'rare'),
  epic: ITEMS.filter((i) => i.rarity === 'epic'),
  legendary: ITEMS.filter((i) => i.rarity === 'legendary'),
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9aa0b4',
  uncommon: '#4cd964',
  rare: '#4c9aff',
  epic: '#a855f7',
  legendary: '#ffb020',
};

/** The gem badge standing in for each tier, shown next to a rarity label. */
export const RARITY_GEM: Record<Rarity, string> = {
  common: `${A}/rarity/common.png`,
  uncommon: `${A}/rarity/uncommon.png`,
  rare: `${A}/rarity/rare.png`,
  epic: `${A}/rarity/epic.png`,
  legendary: `${A}/rarity/legendary.png`,
};

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'power',
    valueAt: (l) => `${(3 + l * 0.8).toFixed(1)}`,
    unit: 'güç',
    name: 'Magnet Power',
    description: 'Objeleri daha hızlı çeker, daha ağırlarını kaldırır.',
    icon: UI_SPRITES.magnet,
    baseCost: 14,
    costGrowth: 1.32,
    maxLevel: 24,
  },
  {
    id: 'range',
    valueAt: (l) => `×${(1 + l * 0.055).toFixed(2)}`,
    unit: 'alan',
    name: 'Attraction Range',
    description: 'Mıknatısın çekim alanını genişletir.',
    icon: UI_SPRITES.range,
    baseCost: 18,
    costGrowth: 1.3,
    maxLevel: 24,
  },
  {
    id: 'launch',
    valueAt: (l) => `×${(1 + l * 0.11).toFixed(2)}`,
    unit: 'mesafe',
    name: 'Launch Distance',
    description: 'Maksimum atış mesafesini artırır.',
    icon: UI_SPRITES.upgrade,
    baseCost: 20,
    costGrowth: 1.3,
    maxLevel: 24,
  },
  {
    id: 'loadEff',
    valueAt: (l) => `-%${Math.round(Math.min(0.85, l * 0.07) * 100)}`,
    unit: 'ceza',
    name: 'Load Efficiency',
    description: 'Taşınan yükün atış mesafesine olan cezasını azaltır.',
    icon: UI_SPRITES.settings,
    baseCost: 26,
    costGrowth: 1.38,
    maxLevel: 16,
  },
  {
    id: 'extraTime',
    valueAt: (l) => `${BASE_RUN_DURATION + l * SECONDS_PER_TIME_LEVEL}`,
    unit: 'saniye',
    name: 'Vardiya Süresi',
    description: 'Her seviye vardiyaya +2 saniye ekler.',
    icon: null,
    baseCost: 24,
    costGrowth: 1.33,
    maxLevel: 12,
  },
  {
    id: 'extraShot',
    valueAt: (l) => `${BASE_SHOTS + l}`,
    unit: 'atış',
    name: 'Ekstra Atış',
    description: 'Her seviye vardiya başına +1 atış verir.',
    icon: UI_SPRITES.charge,
    baseCost: 42,
    costGrowth: 1.85,
    maxLevel: 7,
  },
  {
    id: 'lootValue',
    valueAt: (l) => `×${(1 + l * 0.12).toFixed(2)}`,
    unit: 'değer',
    name: 'Loot Value',
    description: 'Toplanan objelerin para değerini artırır.',
    icon: UI_SPRITES.coin,
    baseCost: 24,
    costGrowth: 1.35,
    maxLevel: 24,
  },
  {
    id: 'lootQuality',
    valueAt: (l) => `%${(1 + l).toFixed(0)}`,
    unit: 'nadir',
    name: 'Loot Quality',
    description: 'Daha nadir objelerin çıkma ihtimalini artırır.',
    icon: `${A}/rarity/rare.png`,
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
  icon: string | null;
}

export const MILESTONES: Milestone[] = [
  { name: 'Live Drops', description: 'Vardiya sırasında yukarıdan yeni objeler düşer.', icon: `${A}/collectibles/chest_wood.png` },
  { name: 'Time Slow', description: 'Nişan alırken zaman yavaşlar.', icon: null },
  { name: 'Automation', description: 'Küçük objeleri otomatik toplar.', icon: UI_SPRITES.settings },
];

export function upgradeCost(def: UpgradeDef, currentLevel: number): number {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}

/** A tight opener that still leaves room to think: two shots and twelve
 *  seconds. One shot measured at ~2s of actual play per shift, which was
 *  shorter than the intro card in front of it. Vardiya Süresi and Ekstra Atış
 *  upgrades pull these out of the starting squeeze. */
export const BASE_RUN_DURATION = 12;
export const BASE_SHOTS = 2;
export const SECONDS_PER_TIME_LEVEL = 2;
export const BASE_MAGNET_POWER = 3;
