import type { SpriteRef } from '../render/atlas';
import type { Fish, Junk, Rarity, Upgrade, UpgradeId } from './types';

/** Derinlik bantlari. Sahnenin renklenmesi ve HUD etiketi icin. */
export const ZONES = [
  { name: 'Sığlık', to: 25, water: 0x2f9fc4 },
  { name: 'Kıyı Suları', to: 70, water: 0x1b7fae },
  { name: 'Alacakaranlık', to: 180, water: 0x115d88 },
  { name: 'Derin Mavi', to: 450, water: 0x0a3a5f },
  { name: 'Uçurum', to: 1200, water: 0x05213c },
  { name: 'Hadal Bölge', to: Infinity, water: 0x030f22 },
] as const;

export function zoneFor(depth: number): (typeof ZONES)[number] {
  for (const z of ZONES) if (depth < z.to) return z;
  return ZONES[ZONES.length - 1];
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9fb6c4',
  uncommon: '#63d29a',
  rare: '#5aa9ff',
  epic: '#c07dff',
  legendary: '#ffb03a',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Sıradan',
  uncommon: 'Az Bulunur',
  rare: 'Nadir',
  epic: 'Efsanevi',
  legendary: 'Mitik',
};

const fishSprite = (i: number): SpriteRef => ({ sheet: 'fish', i });
const objSprite = (i: number): SpriteRef => ({ sheet: 'obj', i });

/**
 * Balik tablosu. Bantlar birbirine kasitli olarak tasar ki misina uzadikca
 * gecis sert olmasin; her bantta bir tane belirgin nadir tur var ki "Yem"
 * yukseltmesi gorunur bir fark yaratsin.
 *
 * Sayilar fishes.png atlasindaki hucre indeksleri (12 sutun, satir oncelikli).
 */
export const FISH: Fish[] = [
  // --- Siglik (0-25 m) ---
  f(47,  'hamsi',      'Hamsi',            0.03,  1,      0,   45,  100, 0.65, 'common'),
  f(26,  'istavrit',   'İstavrit',         0.2,   3,      2,   60,  74,  0.8,  'common'),
  f(124, 'karides',    'Karides',          0.05,  8,      4,   65,  42,  0.6,  'uncommon'),
  f(49,  'kefal',      'Kefal',            1.2,   18,     8,   85,  28,  0.9,  'uncommon'),
  f(113, 'denizyildizi','Denizyıldızı',    0.3,   45,     4,   70,  11,  0.75, 'rare'),
  f(85,  'denizati',   'Denizatı',         0.02,  120,    6,   75,  4,   0.7,  'rare'),
  f(1,   'palyaco',    'Palyaço Balığı',   0.1,   400,    3,   55,  1.2, 0.7,  'epic'),

  // --- Kiyi sulari (25-70 m) ---
  f(16,  'levrek',     'Levrek',           2.5,   55,     22,  150, 58,  1.0,  'common'),
  f(51,  'cipura',     'Çipura',           1.8,   130,    30,  170, 42,  0.95, 'common'),
  f(56,  'mercan',     'Mercan Balığı',    1.1,   300,    38,  180, 26,  0.9,  'uncommon'),
  f(118, 'yengec',     'Mavi Yengeç',      0.8,   620,    34,  175, 17,  0.8,  'uncommon'),
  f(111, 'kalamar',    'Kalamar',          3.0,   1500,   45,  210, 9,   1.05, 'rare'),
  f(108, 'ahtapot',    'Ahtapot',          6.0,   4000,   55,  230, 4,   1.2,  'rare'),
  f(3,   'altincipura','Altın Çipura',     4.0,   16000,  40,  190, 1.1, 1.0,  'epic'),

  // --- Alacakaranlik (70-180 m) ---
  f(52,  'orkinos',    'Orkinos',          120,   6000,   68,  420, 48,  1.5,  'common'),
  f(18,  'aslan',      'Aslan Balığı',     1.4,   16000,  75,  440, 30,  1.0,  'common'),
  f(43,  'kilic',      'Kılıç Balığı',     180,   45000,  88,  470, 18,  1.7,  'uncommon'),
  f(106, 'denizanasi', 'Mavi Denizanası',  8,     120000, 100, 490, 9,   1.2,  'rare'),
  f(30,  'fener',      'Fener Balığı',     4.5,   380000, 115, 520, 4.5, 1.1,  'rare'),
  f(73,  'vatoz',      'Manta Vatoz',      900,   1.6e6,  140, 540, 1.3, 2.0,  'epic'),

  // --- Derin mavi (180-450 m) ---
  f(74,  'kopek',      'Köpekbalığı',      450,   7e6,    175, 950,  34, 2.2,  'common'),
  f(65,  'yayin',      'Karanlık Yayın',   90,    2.4e7,  200, 1000, 22, 1.7,  'common'),
  f(131, 'devkalamar', 'Dev Kalamar',      280,   9e7,    240, 1050, 12, 2.4,  'uncommon'),
  f(96,  'kayis',      'Kayış Balığı',     270,   4.2e8,  300, 1150, 5,  2.6,  'rare'),
  f(104, 'hayalet',    'Hayalet Denizanası',35,   2.1e9,  350, 1250, 1.4,2.2,  'epic'),

  // --- Ucurum (450-1200 m) ---
  f(41,  'yutucu',     'Yutucu Yılan',     8,     1.2e10, 440, 2100, 30, 1.9,  'common'),
  f(132, 'hiyar',      'Deniz Hıyarı',     3,     4e10,   500, 2200, 20, 1.4,  'common'),
  f(122, 'istakoz',    'Zırhlı Istakoz',   14,    1.8e11, 600, 2400, 10, 1.6,  'uncommon'),
  f(140, 'solucan',    'Bacalı Solucan',   2,     9e11,   750, 2600, 4,  1.5,  'rare'),
  f(63,  'iskelet',    'Kadim İskelet',    40,    5e12,   950, 2800, 1.2,2.0,  'epic'),

  // --- Hadal (1200 m+) ---
  f(143, 'karanlik',   'Karanlık Yaratık', 900,   3e13,   1150, Infinity, 26, 2.4, 'common'),
  f(127, 'nautilus',   'Kızıl Nautilus',   26,    2.4e14, 1350, Infinity, 12, 1.8, 'uncommon'),
  f(128, 'fosil',      'Fosil Nautilus',   60,    1.9e15, 1550, Infinity, 4,  2.0, 'rare'),
  f(110, 'kraken',     'Kraken',           260000,4.2e16, 1850, Infinity, 1,  3.4, 'legendary'),
];

function f(
  sprite: number, id: string, name: string, baseWeight: number, value: number,
  minDepth: number, maxDepth: number, weight: number, size: number, rarity: Rarity,
): Fish {
  return {
    kind: 'fish', id, name, sprite: fishSprite(sprite), size,
    baseWeight, value, minDepth, maxDepth, weight, rarity,
  };
}

/**
 * Cop ve hazine. Cop para etmez ama Temiz Deniz sayacini besler; hazine
 * para eder ama sayaci beslemez.
 *
 * Sayilar objects.png atlasindaki hucre indeksleri (5 sutun).
 */
export const JUNK: Junk[] = [
  j(7,  'poset',    'Plastik Yığını',     30, 0.95, false),
  j(3,  'kilcik',   'Balık Kılçığı',      22, 0.85, false),
  j(6,  'bot',      'Eski Bot',           16, 0.85, false),
  j(5,  'sapka',    'Sırılsıklam Şapka',  14, 0.85, false),
  j(8,  'hurda',    'Paslı Hurda',        12, 0.9,  false),
  j(14, 'kutuk',    'Islak Kütük',        10, 1.0,  false),
  j(0,  'yosun',    'Yosun Yumağı',       18, 0.9,  false),
  j(19, 'ordek',    'Lastik Ördek',       4,  0.7,  false),
  j(12, 'sikke',    'Altın Sikke',        2.5, 0.6, true),
  j(15, 'sandik',   'Batık Sandık',       1.2, 1.2, true),
  j(10, 'sise',     'Mesajlı Şişe',       1.6, 0.8, true),
  j(17, 'anahtar',  'Pas Tutmuş Anahtar', 0.9, 0.7, true),
];

function j(
  sprite: number, id: string, name: string, weight: number,
  size: number, treasure: boolean,
): Junk {
  return {
    kind: 'junk', id, name, sprite: objSprite(sprite), size,
    value: 0, weight, treasure,
  };
}

export const ALL_SPECIES = [...FISH, ...JUNK];
export const SPECIES_BY_ID = new Map(ALL_SPECIES.map((s) => [s.id, s]));

/**
 * Hazinenin degeri sabit degil; oyuncunun ulasabildigi derinlikteki ortalama
 * balik degerine baglanir ki gec oyunda anlamsizlasmasin.
 */
export const TREASURE_MULTIPLIER: Record<string, number> = {
  sikke: 8,
  sandik: 25,
  sise: 15,
  anahtar: 45,
};

/** Temiz Deniz esikleri ve kalici odulleri. */
export interface CleanReward {
  at: number;
  label: string;
  effect: 'value' | 'bite' | 'wait' | 'rod';
  amount: number;
}

export const CLEAN_REWARDS: CleanReward[] = [
  { at: 10,  label: 'Satış değeri +%10',   effect: 'value', amount: 0.1 },
  { at: 40,  label: 'Isırma şansı +%8',    effect: 'bite',  amount: 0.08 },
  { at: 120, label: 'Bekleme süresi −%15', effect: 'wait',  amount: 0.15 },
  { at: 350, label: 'Ekstra olta yuvası',  effect: 'rod',   amount: 1 },
  { at: 900, label: 'Satış değeri +%50',   effect: 'value', amount: 0.5 },
];

// --- Yukseltmeler ---------------------------------------------------------

export function lineDepthAt(level: number): number {
  return 14 + Math.pow(level, 1.9) * 3.2 + level * 7;
}

export function autoCastDelayAt(level: number): number {
  if (level <= 0) return Infinity;
  return Math.max(0.3, 4.5 * Math.pow(0.87, level - 1));
}

export function waitTimeAt(level: number): number {
  return Math.max(0.35, 2.6 * Math.pow(0.9, level));
}

export function reelSpeedAt(level: number): number {
  return 26 + level * 9;
}

export function biteChanceAt(level: number): number {
  return Math.min(0.97, 0.55 + level * 0.05);
}

export function junkChanceAt(level: number): number {
  return Math.max(0.04, 0.32 * Math.pow(0.9, level));
}

export const UPGRADES: Upgrade[] = [
  {
    id: 'line', name: 'Misina', sprite: { sheet: 'gear', i: 12 },
    desc: '{v} derinliğe kadar atabiliyorsun.',
    baseCost: 25, growth: 1.36, maxLevel: 120,
    valueAt: (l) => `${Math.round(lineDepthAt(l))} m`,
    revealAt: 0,
  },
  {
    id: 'bait', name: 'Yem', sprite: { sheet: 'gear', i: 14 },
    desc: 'Isırma şansı {v}, çöp daha az çıkıyor.',
    baseCost: 40, growth: 1.44, maxLevel: 80,
    valueAt: (l) => `%${Math.round(biteChanceAt(l) * 100)}`,
    revealAt: 0,
  },
  {
    id: 'float', name: 'Şamandıra', sprite: { sheet: 'gear', i: 20 },
    desc: 'Balık ortalama {v} sonra vuruyor.',
    baseCost: 70, growth: 1.32, maxLevel: 60,
    valueAt: (l) => `${waitTimeAt(l).toFixed(2)} sn`,
    revealAt: 40,
  },
  {
    id: 'reel', name: 'Makara', sprite: { sheet: 'gear', i: 5 },
    desc: 'Misina {v} hızında sarılıyor.',
    baseCost: 120, growth: 1.3, maxLevel: 120,
    valueAt: (l) => `${reelSpeedAt(l)} m/sn`,
    revealAt: 90,
  },
  {
    id: 'market', name: 'Pazarlık', sprite: { sheet: 'obj', i: 12 },
    desc: 'Tüm satışlar {v} değerinde.',
    baseCost: 320, growth: 1.55, maxLevel: 100,
    valueAt: (l) => `×${(1 + l * 0.5).toFixed(1)}`,
    revealAt: 220,
  },
  {
    id: 'rods', name: 'Ekstra Olta', sprite: { sheet: 'gear', i: 1 },
    desc: 'Aynı anda {v} olta atabiliyorsun.',
    baseCost: 350, growth: 4.2, maxLevel: 7,
    valueAt: (l) => `${1 + l}`,
    revealAt: 180,
  },
  {
    id: 'autocast', name: 'Otomatik Olta', sprite: { sheet: 'gear', i: 35 },
    desc: 'Oltalar {v} kendiliğinden atılıyor.',
    baseCost: 2500, growth: 1.62, maxLevel: 40,
    valueAt: (l) => (l === 0 ? 'kapalı' : `${autoCastDelayAt(l).toFixed(2)} sn'de bir`),
    revealAt: 1500,
  },
];

export const UPGRADE_BY_ID = new Map<UpgradeId, Upgrade>(UPGRADES.map((u) => [u.id, u]));

export function costOf(u: Upgrade, level: number): number {
  return Math.ceil(u.baseCost * Math.pow(u.growth, level));
}

/** Sahnedeki samandira sprite'i. */
export const BOBBER_SPRITE: SpriteRef = { sheet: 'gear', i: 20 };
