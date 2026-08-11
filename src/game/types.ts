import type { SpriteRef } from '../render/atlas';

export type UpgradeId =
  | 'line'
  | 'bait'
  | 'reel'
  | 'float'
  | 'market'
  | 'rods'
  | 'autocast';

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
  /** Seviyedeki degerin oyuncuya gosterilen metni. */
  valueAt: (level: number) => string;
  /** Bu toplam kazanca ulasilinca panelde belirir. */
  revealAt: number;
}

export type RodPhase = 'idle' | 'flying' | 'sinking' | 'waiting' | 'bite' | 'reeling';

export interface Rod {
  index: number;
  phase: RodPhase;
  /** Suyun yuzeyindeki yatay hedef (-1..1, ekranin yarim genisligi olceginde). */
  x: number;
  /** Kancanin hedef derinligi (metre). */
  targetDepth: number;
  /** Kancanin su anki derinligi (metre). */
  depth: number;
  /** Faza gore anlami degisen zamanlayici (saniye). */
  timer: number;
  /** 'flying' fazinin toplam suresi; yayin ilerlemesini hesaplamak icin. */
  flightTime: number;
  /** Bu atisin sonucu; isirma aninda belirlenir. */
  hooked: Hooked | null;
  /** Oyuncu isirma penceresinde dokundu mu. */
  perfect: boolean;
  /** 'idle' fazinda otomatik atisa kalan sure. */
  autoTimer: number;
}

/** Bir atisin somut sonucu. */
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
