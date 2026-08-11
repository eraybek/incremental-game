import type { Fish, Upgrade, UpgradeId } from './types';

/**
 * Derinlik bantlari. Sadece sunum icin (HUD'da bulundugun bolgenin adi).
 * Baliklarin dagilimi minDepth/maxDepth uzerinden bagimsiz calisir.
 */
export const ZONES = [
  { name: 'Sığlık', from: 0, to: 25, tint: 0x2f9fc4 },
  { name: 'Kıyı Suları', from: 25, to: 70, tint: 0x1d7ba6 },
  { name: 'Alacakaranlık', from: 70, to: 180, tint: 0x125a83 },
  { name: 'Derin Mavi', from: 180, to: 450, tint: 0x0a3a5c },
  { name: 'Uçurum', from: 450, to: 1200, tint: 0x05203a },
  { name: 'Hadal Bölge', from: 1200, to: Infinity, tint: 0x030f22 },
] as const;

export function zoneFor(depth: number): (typeof ZONES)[number] {
  for (const z of ZONES) if (depth < z.to) return z;
  return ZONES[ZONES.length - 1];
}

/**
 * Balik tablosu. Deger derinlikle ustel buyur; agirlik ise nadirligi belirler.
 * Her bandin icinde 1 tane belirgin "nadir" balik var ki yem yukseltmesi
 * gorunur bir fark yaratsin.
 */
export const FISH: Fish[] = [
  // --- Siglik ---
  { id: 'hamsi',    name: 'Hamsi',            icon: '🐟', value: 1,      minDepth: 0,    maxDepth: 40,   weight: 100, color: 0x9fd4e8, size: 0.7,  rarity: 'common' },
  { id: 'istavrit', name: 'İstavrit',         icon: '🐟', value: 2.5,    minDepth: 3,    maxDepth: 55,   weight: 70,  color: 0x7fc0dd, size: 0.85, rarity: 'common' },
  { id: 'karides',  name: 'Karides',          icon: '🦐', value: 6,      minDepth: 6,    maxDepth: 60,   weight: 40,  color: 0xf08a6a, size: 0.55, rarity: 'uncommon' },
  { id: 'kefal',    name: 'Kefal',            icon: '🐠', value: 14,     minDepth: 10,   maxDepth: 80,   weight: 26,  color: 0xc7e5f2, size: 1.0,  rarity: 'uncommon' },
  { id: 'denizati', name: 'Denizatı',         icon: '🌊', value: 60,     minDepth: 8,    maxDepth: 70,   weight: 4,   color: 0xffd166, size: 0.6,  rarity: 'rare' },

  // --- Kiyi sulari ---
  { id: 'levrek',   name: 'Levrek',           icon: '🐟', value: 40,     minDepth: 25,   maxDepth: 140,  weight: 55,  color: 0x8fb8cc, size: 1.15, rarity: 'common' },
  { id: 'cipura',   name: 'Çipura',           icon: '🐠', value: 95,     minDepth: 32,   maxDepth: 160,  weight: 38,  color: 0xd9e8ef, size: 1.1,  rarity: 'common' },
  { id: 'kalamar',  name: 'Kalamar',          icon: '🦑', value: 240,    minDepth: 45,   maxDepth: 200,  weight: 20,  color: 0xe08fb4, size: 1.0,  rarity: 'uncommon' },
  { id: 'ahtapot',  name: 'Ahtapot',          icon: '🐙', value: 620,    minDepth: 55,   maxDepth: 220,  weight: 9,   color: 0xc06fa0, size: 1.25, rarity: 'rare' },
  { id: 'kalkan',   name: 'Altın Kalkan',     icon: '✨', value: 3200,   minDepth: 40,   maxDepth: 180,  weight: 1.5, color: 0xffc94d, size: 1.3,  rarity: 'epic' },

  // --- Alacakaranlik ---
  { id: 'ton',      name: 'Orkinos',          icon: '🐟', value: 1500,   minDepth: 70,   maxDepth: 400,  weight: 45,  color: 0x5f93b3, size: 1.7,  rarity: 'common' },
  { id: 'kilic',    name: 'Kılıç Balığı',     icon: '🗡️', value: 4200,  minDepth: 90,   maxDepth: 450,  weight: 26,  color: 0x7fa8c4, size: 1.9,  rarity: 'uncommon' },
  { id: 'fener',    name: 'Fener Balığı',     icon: '💡', value: 12000,  minDepth: 120,  maxDepth: 500,  weight: 11,  color: 0x4a3f6b, size: 1.2,  rarity: 'rare' },
  { id: 'vatoz',    name: 'Manta Vatoz',      icon: '🪁', value: 46000,  minDepth: 140,  maxDepth: 520,  weight: 3.5, color: 0x3c5f80, size: 2.4,  rarity: 'epic' },

  // --- Derin mavi ---
  { id: 'kopek',    name: 'Köpekbalığı',      icon: '🦈', value: 180000,  minDepth: 180, maxDepth: 900,  weight: 30,  color: 0x53728c, size: 2.6,  rarity: 'common' },
  { id: 'devkalamar', name: 'Dev Kalamar',    icon: '🦑', value: 720000,  minDepth: 240, maxDepth: 1000, weight: 15,  color: 0xa8557f, size: 2.9,  rarity: 'uncommon' },
  { id: 'oarfish',  name: 'Kayış Balığı',     icon: '🎏', value: 3.1e6,   minDepth: 300, maxDepth: 1100, weight: 6,   color: 0xc9d4e0, size: 3.2,  rarity: 'rare' },
  { id: 'balina',   name: 'Kaşalot',          icon: '🐋', value: 1.4e7,   minDepth: 350, maxDepth: 1200, weight: 1.8, color: 0x415c73, size: 4.0,  rarity: 'epic' },

  // --- Ucurum ---
  { id: 'yutucu',   name: 'Yutucu Yılan',     icon: '🪱', value: 8e7,     minDepth: 450, maxDepth: 2000, weight: 26,  color: 0x2e2b52, size: 2.2,  rarity: 'common' },
  { id: 'buzbaligi',name: 'Buz Balığı',       icon: '🧊', value: 4.5e8,   minDepth: 600, maxDepth: 2400, weight: 12,  color: 0xa9e8f0, size: 1.8,  rarity: 'uncommon' },
  { id: 'hayalet',  name: 'Hayalet Ahtapot',  icon: '👻', value: 2.6e9,   minDepth: 800, maxDepth: 2600, weight: 4.5, color: 0xdcd3ff, size: 2.6,  rarity: 'rare' },

  // --- Hadal ---
  { id: 'leviathan',name: 'Leviathan',        icon: '🐉', value: 2.2e10,  minDepth: 1200, maxDepth: Infinity, weight: 20, color: 0x1f3d4d, size: 5.0, rarity: 'common' },
  { id: 'anahtar',  name: 'Pas Tutmuş Anahtar', icon: '🗝️', value: 1.8e11, minDepth: 1500, maxDepth: Infinity, weight: 5, color: 0xd7a44a, size: 1.0, rarity: 'epic' },
  { id: 'kraken',   name: 'Kraken',           icon: '🐙', value: 1.5e12,  minDepth: 1800, maxDepth: Infinity, weight: 1, color: 0x6b1f4a, size: 6.0, rarity: 'legendary' },
];

export const RARITY_COLOR: Record<Fish['rarity'], string> = {
  common: '#9fb6c4',
  uncommon: '#63d29a',
  rare: '#5aa9ff',
  epic: '#c07dff',
  legendary: '#ffb03a',
};

export const RARITY_LABEL: Record<Fish['rarity'], string> = {
  common: 'Sıradan',
  uncommon: 'Az Bulunur',
  rare: 'Nadir',
  epic: 'Efsanevi',
  legendary: 'Mitik',
};

/** Yukseltme tanimlari. Etkiler state.ts icindeki turetilmis degerlerde. */
export const UPGRADES: Upgrade[] = [
  {
    id: 'reel',
    name: 'Makara',
    icon: '🌀',
    desc: 'Misina {v} hızında sarılıyor.',
    baseCost: 12,
    growth: 1.19,
    maxLevel: 200,
    valueAt: (l) => `${(8 + l * 2.6).toFixed(0)} m/sn`,
    revealAt: 0,
  },
  {
    id: 'line',
    name: 'Misina',
    icon: '🧵',
    desc: '{v} derinliğe kadar inebiliyorsun.',
    baseCost: 30,
    growth: 1.34,
    maxLevel: 120,
    valueAt: (l) => `${Math.round(lineDepthAt(l))} m`,
    revealAt: 0,
  },
  {
    id: 'bait',
    name: 'Yem',
    icon: '🪱',
    desc: 'Nadir balık şansı {v}.',
    baseCost: 90,
    growth: 1.42,
    maxLevel: 80,
    valueAt: (l) => `×${(1 + l * 0.35).toFixed(2)}`,
    revealAt: 60,
  },
  {
    id: 'rods',
    name: 'Ekstra Olta',
    icon: '🎣',
    desc: 'Aynı anda {v} olta atabiliyorsun.',
    baseCost: 400,
    growth: 6.5,
    maxLevel: 5,
    valueAt: (l) => `${1 + l}`,
    revealAt: 250,
  },
  {
    id: 'market',
    name: 'Pazarlık',
    icon: '💰',
    desc: 'Tüm satışlar {v} değerinde.',
    baseCost: 250,
    growth: 1.55,
    maxLevel: 100,
    valueAt: (l) => `×${(1 + l * 0.5).toFixed(1)}`,
    revealAt: 180,
  },
  {
    id: 'autocast',
    name: 'Otomatik Makara',
    icon: '⚙️',
    desc: 'Oltalar {v} saniyede bir kendi atılıyor.',
    baseCost: 1500,
    growth: 1.6,
    maxLevel: 40,
    valueAt: (l) => (l === 0 ? 'kapalı' : `${autoCastDelayAt(l).toFixed(2)}`),
    revealAt: 900,
  },
  {
    id: 'net',
    name: 'Dip Ağı',
    icon: '🕸️',
    desc: 'Sen yokken bile {v} kazandırıyor.',
    baseCost: 6000,
    growth: 1.75,
    maxLevel: 100,
    valueAt: (l) => `seviye ${l}`,
    revealAt: 4000,
  },
];

export const UPGRADE_BY_ID = new Map<UpgradeId, Upgrade>(UPGRADES.map((u) => [u.id, u]));

/** Misina seviyesinden erisilebilir derinlik. Ustel ki yeni bantlar acilsin. */
export function lineDepthAt(level: number): number {
  return 12 + Math.pow(level, 1.85) * 3.4 + level * 6;
}

/** Otomatik atis gecikmesi (saniye). */
export function autoCastDelayAt(level: number): number {
  if (level <= 0) return Infinity;
  return Math.max(0.25, 5 * Math.pow(0.88, level - 1));
}

/** Bir yukseltmenin belirli seviyedeki maliyeti. */
export function costOf(u: Upgrade, level: number): number {
  return Math.ceil(u.baseCost * Math.pow(u.growth, level));
}
