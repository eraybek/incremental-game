import type { SpriteRef } from '../render/atlas';

export type UpgradeId =
  | 'line'
  | 'reel'
  | 'radius'
  | 'bait'
  | 'market'
  | 'rods'
  | 'autocast'
  | 'master';

/** Yakalanabilen her seyin ortak govdesi. */
export interface Species {
  id: string;
  name: string;
  /** Atlas hucresi; render katmani bunu cozer. */
  sprite: SpriteRef;
  /** Ekran uzayindaki gorsel buyukluk carpani. */
  size: number;
}

export interface Fish extends Species {
  kind: 'fish';
  /** Ortalama agirlik (kg). Yakalanan birey bunun etrafinda dagilir. */
  baseWeight: number;
  /** baseWeight agirliginda ettigi para. */
  value: number;
  minDepth: number;
  maxDepth: number;
  /** Kendi derinlik bandindaki gorulme agirligi; dusuk = nadir. */
  weight: number;
  rarity: Rarity;
}

export interface Junk extends Species {
  kind: 'junk';
  /** Hazine ise para eder ve Temiz Deniz sayacini beslemez. */
  value: number;
  /** Cikma agirligi. */
  weight: number;
  treasure: boolean;
}

export type Catchable = Fish | Junk;

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  sprite: SpriteRef;
  desc: string;
  baseCost: number;
  growth: number;
  maxLevel: number;
  /** Aktif kol mu (elle oynarken parlar) yoksa idle kol mu. */
  track: 'active' | 'idle';
  /** Seviyedeki degerin oyuncuya gosterilen metni. */
  valueAt: (level: number) => string;
  /** Bu toplam kazanca ulasilinca panelde belirir. */
  revealAt: number;
}

/**
 * Kanca durumu. v2 mekanigi: kanca sabit yatay konumdan (homeX) dumduz iner,
 * indigi yol uzerinde bir baliga carparsa onu kancalar, yukari ceker.
 */
export type RodPhase = 'idle' | 'dropping' | 'reeling';

export interface Rod {
  index: number;
  phase: RodPhase;
  /** Teknenin (yuzeydeki) sabit yatay konumu (-1..1). */
  homeX: number;
  /** Bu inisin kanca sutunu (-1..1); dokunulan x. Kanca dumduz buradan iner. */
  hookX: number;
  /** Kancanin hedef derinligi (metre). */
  targetDepth: number;
  /** Kancanin su anki derinligi (metre). */
  depth: number;
  /** Faza gore anlami degisen zamanlayici (saniye). */
  timer: number;
  /** Bu inisin sonucu; carpma aninda belirlenir. */
  hooked: Hooked | null;
  /** Iyi hizalanmis (isabetli) yakalama; ×2 ve seri katkisi. */
  perfect: boolean;
  /** Bu inis oyuncu tarafindan mi baslatildi (manuel = odak). */
  manual: boolean;
  /** 'idle' fazinda otomatik atisa kalan sure. */
  autoTimer: number;
}

/** Denizde yuzen bir balik/cop; kancanin hedefi. */
export interface Swimmer {
  species: Catchable;
  /** Yatay konum (-limit..limit); ekran genisligi olceginde. */
  x: number;
  /** Derinlik (metre). */
  depth: number;
  /** Yatay hiz (birim/sn); isareti yonu verir. */
  vx: number;
  /** Yuzme salinimi fazi. */
  phase: number;
}

/** Bir yakalamanin somut sonucu. */
export interface Hooked {
  species: Catchable;
  /** Baliksa yakalanan bireyin agirligi (kg); coplerde 0. */
  kg: number;
  /** Temel carpanlar uygulanmis, bonus oncesi para. */
  value: number;
  /** Temel agirligin 1.8 katini asan balik. */
  huge: boolean;
}

/** Balikci Defteri'ndeki bir tur kaydi. */
export interface LogEntry {
  count: number;
  /** Yakalanan en buyuk birey (kg). */
  best: number;
}

export interface SaveData {
  v: number;
  money: number;
  totalEarned: number;
  deepest: number;
  cleanliness: number;
  upgrades: Partial<Record<UpgradeId, number>>;
  log: Record<string, LogEntry>;
  savedAt: number;
}
