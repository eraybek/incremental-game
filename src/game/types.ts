export type UpgradeId =
  | 'reel'
  | 'rods'
  | 'line'
  | 'bait'
  | 'market'
  | 'autocast'
  | 'net';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  icon: string;
  /** Tek satirlik aciklama; {v} mevcut degeri, {n} bir sonraki degeri ile degistirilir. */
  desc: string;
  baseCost: number;
  /** Her seviyede maliyet bu carpanla buyur. */
  growth: number;
  maxLevel: number;
  /** Seviye -> oyuncuya gosterilecek deger metni. */
  valueAt: (level: number) => string;
  /** Bu yukseltme kac para kazanildiktan sonra gorunur olsun. */
  revealAt: number;
}

export interface Fish {
  id: string;
  name: string;
  icon: string;
  /** Temel satis degeri. */
  value: number;
  /** Bu balik en az bu derinlikte bulunur (metre). */
  minDepth: number;
  /** Bu derinligin otesinde artik gorunmez. */
  maxDepth: number;
  /** Kendi derinlik bandi icindeki gorulme agirligi; dusuk = nadir. */
  weight: number;
  /** Govde rengi (hex). */
  color: number;
  /** Gorsel boyut carpani. */
  size: number;
  /** Nadirlik sinifi; sadece sunum icin. */
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export type RodPhase = 'idle' | 'descending' | 'hooking' | 'ascending';

export interface Rod {
  /** Oltanin kendi indeksi; yatay konumunu belirler. */
  index: number;
  phase: RodPhase;
  /** Kancanin su anki derinligi (metre, pozitif = asagi). */
  depth: number;
  /** Bu atisin hedef derinligi. */
  targetDepth: number;
  /** 'hooking' fazinda kalan sure (saniye). */
  hookTimer: number;
  /** Yakalanan balik, yukari tasinirken burada durur. */
  catchFish: Fish | null;
  /** Oyuncu tam zamaninda dokunursa bonus. */
  perfect: boolean;
  /** 'idle' fazinda otomatik atisa kalan sure. */
  autoTimer: number;
}

export interface SaveData {
  v: number;
  money: number;
  totalEarned: number;
  upgrades: Partial<Record<UpgradeId, number>>;
  caught: Record<string, number>;
  deepest: number;
  savedAt: number;
}
