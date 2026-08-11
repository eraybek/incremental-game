import {
  CLEAN_REWARDS,
  FISH,
  JUNK,
  TREASURE_MULTIPLIER,
  UPGRADES,
  UPGRADE_BY_ID,
  autoCastDelayAt,
  biteChanceAt,
  costOf,
  junkChanceAt,
  lineDepthAt,
  reelSpeedAt,
  waitTimeAt,
} from './content';
import type {
  Catchable, Fish, Hooked, Junk, LogEntry, Rod, SaveData, UpgradeId,
} from './types';

const SAVE_KEY = 'derin-sular-save-v3';
const SAVE_VERSION = 3;

/** Isirma penceresi: oyuncunun mukemmel cekis icin dokunma suresi. */
export const BITE_WINDOW = 0.6;
/** Oltanin havada gecirdigi sure. */
const FLIGHT_TIME = 0.45;

export interface LandEvent {
  rod: Rod;
  hooked: Hooked;
  money: number;
  perfect: boolean;
  /** Bu tur ilk kez mi yakalandi. */
  firstTime: boolean;
  /** Bu birey turun rekoru mu. */
  record: boolean;
}

export interface GameEvents {
  onCast: (rod: Rod) => void;
  onBite: (rod: Rod) => void;
  onLand: (e: LandEvent) => void;
  onEmpty: (rod: Rod) => void;
  onReward: (label: string) => void;
}

/** Box-Muller ile standart normal; agirlik dagilimi icin. */
function randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class Game {
  money = 0;
  totalEarned = 0;
  deepest = 0;
  /** Toplanan cop sayisi. */
  cleanliness = 0;
  upgrades: Record<UpgradeId, number> = {
    line: 0, bait: 0, reel: 0, float: 0, market: 0, rods: 0, autocast: 0,
  };
  log: Record<string, LogEntry> = {};
  rods: Rod[] = [];
  /** Otomatik atisin kullanacagi son nisan noktasi. */
  lastAim = { x: 0, depth: 0 };

  private events: GameEvents;
  private earnSamples: { t: number; amount: number }[] = [];
  private saveTimer = 0;

  constructor(events: GameEvents) {
    this.events = events;
    this.load();
    this.syncRodCount();
    if (this.lastAim.depth === 0) this.lastAim.depth = this.maxDepth * 0.6;
  }

  // --- Temiz Deniz odulleri ------------------------------------------------

  /** Esigi asilmis odullerin toplam etkisi. */
  private cleanBonus(effect: 'value' | 'bite' | 'wait' | 'rod'): number {
    let total = 0;
    for (const r of CLEAN_REWARDS) {
      if (r.effect === effect && this.cleanliness >= r.at) total += r.amount;
    }
    return total;
  }

  /** Bir sonraki Temiz Deniz odulu; HUD'da ilerleme cubugu icin. */
  get nextCleanReward(): { at: number; label: string } | null {
    for (const r of CLEAN_REWARDS) if (this.cleanliness < r.at) return r;
    return null;
  }

  // --- Turetilmis degerler -------------------------------------------------

  get maxDepth(): number {
    return lineDepthAt(this.upgrades.line);
  }

  get reelSpeed(): number {
    return reelSpeedAt(this.upgrades.reel);
  }

  get avgWaitTime(): number {
    return waitTimeAt(this.upgrades.float) * (1 - this.cleanBonus('wait'));
  }

  get biteChance(): number {
    return Math.min(0.99, biteChanceAt(this.upgrades.bait) + this.cleanBonus('bite'));
  }

  get junkChance(): number {
    return junkChanceAt(this.upgrades.bait);
  }

  get sellMultiplier(): number {
    return (1 + this.upgrades.market * 0.5) * (1 + this.cleanBonus('value'));
  }

  get rodCount(): number {
    return 1 + this.upgrades.rods + this.cleanBonus('rod');
  }

  get autoCastDelay(): number {
    return autoCastDelayAt(this.upgrades.autocast);
  }

  /** Son 10 saniyeye bakarak olculen gelir (para/sn). */
  get incomePerSecond(): number {
    const now = performance.now() / 1000;
    const cutoff = now - 10;
    let sum = 0;
    for (const s of this.earnSamples) if (s.t >= cutoff) sum += s.amount;
    const first = this.earnSamples[0]?.t ?? now;
    const window = Math.min(10, Math.max(1, now - first));
    return sum / window;
  }

  costFor(id: UpgradeId): number {
    return costOf(UPGRADE_BY_ID.get(id)!, this.upgrades[id]);
  }

  isMaxed(id: UpgradeId): boolean {
    return this.upgrades[id] >= UPGRADE_BY_ID.get(id)!.maxLevel;
  }

  canAfford(id: UpgradeId): boolean {
    return !this.isMaxed(id) && this.money >= this.costFor(id);
  }

  buy(id: UpgradeId): boolean {
    if (!this.canAfford(id)) return false;
    this.money -= this.costFor(id);
    this.upgrades[id] += 1;
    if (id === 'rods') this.syncRodCount();
    this.save();
    return true;
  }

  isRevealed(id: UpgradeId): boolean {
    const u = UPGRADE_BY_ID.get(id)!;
    return this.upgrades[id] > 0 || this.totalEarned >= u.revealAt;
  }

  // --- Yakalama tablosu ----------------------------------------------------

  private fishAt(depth: number): { fish: Fish; w: number }[] {
    const out: { fish: Fish; w: number }[] = [];
    for (const fish of FISH) {
      if (depth < fish.minDepth || depth > fish.maxDepth) continue;
      out.push({ fish, w: fish.weight });
    }
    if (out.length === 0) out.push({ fish: FISH[0], w: 1 });
    return out;
  }

  /** Belirli bir derinlikte bulunabilecek turler; defterde gosterilir. */
  speciesAt(depth: number): Fish[] {
    return this.fishAt(depth).map((c) => c.fish);
  }

  private pick<T>(items: { item: T; w: number }[]): T {
    let total = 0;
    for (const i of items) total += i.w;
    let r = Math.random() * total;
    for (const i of items) {
      r -= i.w;
      if (r <= 0) return i.item;
    }
    return items[items.length - 1].item;
  }

  /** Bir atisin sonucunu belirler; null = bos dondu. */
  private roll(depth: number): Hooked | null {
    if (Math.random() > this.biteChance) return null;

    if (Math.random() < this.junkChance) {
      const junk = this.pick(JUNK.map((item) => ({ item, w: item.weight })));
      return this.makeJunk(junk, depth);
    }

    const fish = this.pick(this.fishAt(depth).map((c) => ({ item: c.fish, w: c.w })));
    return this.makeFish(fish);
  }

  private makeFish(fish: Fish): Hooked {
    // Log-normal: kucuk bireyler sik, dev bireyler nadir ama mumkun.
    const kg = Math.max(fish.baseWeight * 0.25, fish.baseWeight * Math.exp(randn() * 0.38));
    const ratio = kg / fish.baseWeight;
    return {
      species: fish,
      kg,
      value: fish.value * Math.pow(ratio, 1.2) * this.sellMultiplier,
      huge: ratio >= 1.8,
    };
  }

  private makeJunk(junk: Junk, depth: number): Hooked {
    if (!junk.treasure) return { species: junk, kg: 0, value: 0, huge: false };
    // Hazine, o derinlikteki ortalama balik degerine baglanir ki gec oyunda
    // anlamsizlasmasin.
    const pool = this.fishAt(depth);
    let total = 0;
    let sum = 0;
    for (const c of pool) {
      total += c.w;
      sum += c.w * c.fish.value;
    }
    const avg = total > 0 ? sum / total : 1;
    const mult = TREASURE_MULTIPLIER[junk.id] ?? 10;
    return {
      species: junk,
      kg: 0,
      value: avg * mult * this.sellMultiplier,
      huge: false,
    };
  }

  // --- Oltalar -------------------------------------------------------------

  private syncRodCount(): void {
    while (this.rods.length < this.rodCount) {
      this.rods.push({
        index: this.rods.length,
        phase: 'idle',
        x: 0, targetDepth: 0, depth: 0,
        timer: 0, flightTime: FLIGHT_TIME,
        hooked: null, perfect: false, autoTimer: 0,
      });
    }
    this.rods.length = this.rodCount;
  }

  /**
   * Bostaki bir oltayi verilen noktaya atar.
   * `remember` false ise bu atis nisan noktasini gunceller sayilmaz; otomatik
   * atislar boylece kendi yayilmalarini birbirine ekleyip kaymaz.
   */
  castAt(x: number, depth: number, remember = true): Rod | null {
    const rod = this.rods.find((r) => r.phase === 'idle');
    if (!rod) return null;
    const target = Math.min(depth, this.maxDepth);
    rod.phase = 'flying';
    rod.x = x;
    rod.targetDepth = target;
    rod.depth = 0;
    rod.timer = 0;
    rod.hooked = null;
    rod.perfect = false;
    if (remember) this.lastAim = { x, depth: target };
    this.events.onCast(rod);
    return rod;
  }

  hasIdleRod(): boolean {
    return this.rods.some((r) => r.phase === 'idle');
  }

  /** Isirma penceresi acik olan oltalar; dokunus eslesmesi icin. */
  bitingRods(): Rod[] {
    return this.rods.filter((r) => r.phase === 'bite' && !r.perfect);
  }

  /** Oyuncunun mukemmel cekisi. */
  strike(rod: Rod): void {
    if (rod.phase !== 'bite' || rod.perfect) return;
    rod.perfect = true;
    rod.timer = 0;
  }

  // --- Ana dongu -----------------------------------------------------------

  update(dt: number): void {
    for (const rod of this.rods) this.updateRod(rod, dt);
    this.saveTimer += dt;
    if (this.saveTimer >= 10) {
      this.saveTimer = 0;
      this.save();
    }
  }

  private updateRod(rod: Rod, dt: number): void {
    rod.timer += dt;
    switch (rod.phase) {
      case 'idle': {
        const delay = this.autoCastDelay;
        if (!Number.isFinite(delay)) break;
        rod.autoTimer += dt;
        if (rod.autoTimer >= delay) {
          rod.autoTimer = 0;
          // Otomatik atis son nisan noktasini kullanir. Oltalar indekslerine
          // gore yayilir ki samandiralar ust uste binmesin.
          const n = this.rods.length;
          const spread = (rod.index - (n - 1) / 2) * 0.34;
          const jitter = (Math.random() - 0.5) * 0.12;
          this.castAt(clamp(this.lastAim.x + spread + jitter, -1, 1), this.lastAim.depth, false);
        }
        break;
      }
      case 'flying': {
        if (rod.timer >= rod.flightTime) {
          rod.phase = 'sinking';
          rod.timer = 0;
        }
        break;
      }
      case 'sinking': {
        rod.depth += this.reelSpeed * dt;
        if (rod.depth >= rod.targetDepth) {
          rod.depth = rod.targetDepth;
          rod.phase = 'waiting';
          // Bekleme suresi ortalamanin etrafinda dagilir ki ritim mekanik olmasin.
          rod.timer = -(this.avgWaitTime * (0.6 + Math.random() * 0.8));
          if (rod.depth > this.deepest) this.deepest = rod.depth;
        }
        break;
      }
      case 'waiting': {
        if (rod.timer >= 0) {
          rod.hooked = this.roll(rod.targetDepth);
          if (!rod.hooked) {
            // Bos dondu: dogrudan sarmaya gec.
            rod.phase = 'reeling';
            rod.timer = 0;
            this.events.onEmpty(rod);
          } else {
            rod.phase = 'bite';
            rod.timer = 0;
            this.events.onBite(rod);
          }
        }
        break;
      }
      case 'bite': {
        // Pencere dolunca balik yine de cekilir; kacirmanin cezasi yok.
        if (rod.perfect || rod.timer >= BITE_WINDOW) {
          rod.phase = 'reeling';
          rod.timer = 0;
        }
        break;
      }
      case 'reeling': {
        // Dolu misina biraz daha agir sarilir.
        const speed = this.reelSpeed * (rod.hooked ? 0.8 : 1.4);
        rod.depth -= speed * dt;
        if (rod.depth <= 0) {
          rod.depth = 0;
          this.land(rod);
        }
        break;
      }
    }
  }

  private land(rod: Rod): void {
    const hooked = rod.hooked;
    rod.phase = 'idle';
    rod.timer = 0;
    rod.autoTimer = 0;
    rod.hooked = null;
    const perfect = rod.perfect;
    rod.perfect = false;
    if (!hooked) return;

    const money = hooked.value * (perfect ? 2 : 1);
    if (money > 0) this.earn(money);

    const species = hooked.species;
    const prev = this.log[species.id];
    const firstTime = !prev;
    const record = hooked.kg > 0 && (!prev || hooked.kg > prev.best);
    this.log[species.id] = {
      count: (prev?.count ?? 0) + 1,
      best: Math.max(prev?.best ?? 0, hooked.kg),
    };

    if (isJunk(species) && !species.treasure) {
      const before = this.cleanliness;
      this.cleanliness += 1;
      for (const r of CLEAN_REWARDS) {
        if (before < r.at && this.cleanliness >= r.at) {
          if (r.effect === 'rod') this.syncRodCount();
          this.events.onReward(r.label);
        }
      }
    }

    this.events.onLand({ rod, hooked, money, perfect, firstTime, record });
  }

  private earn(amount: number): void {
    this.money += amount;
    this.totalEarned += amount;
    const t = performance.now() / 1000;
    this.earnSamples.push({ t, amount });
    const cutoff = t - 10;
    while (this.earnSamples.length && this.earnSamples[0].t < cutoff) {
      this.earnSamples.shift();
    }
  }

  // --- Kayit ---------------------------------------------------------------

  save(): void {
    const data: SaveData = {
      v: SAVE_VERSION,
      money: this.money,
      totalEarned: this.totalEarned,
      deepest: this.deepest,
      cleanliness: this.cleanliness,
      upgrades: this.upgrades,
      log: this.log,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Depolama kapali olabilir; oyun yine de oynanir.
    }
  }

  private load(): void {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    let data: SaveData;
    try {
      data = JSON.parse(raw) as SaveData;
    } catch {
      return;
    }
    if (data.v !== SAVE_VERSION) return;
    this.money = data.money ?? 0;
    this.totalEarned = data.totalEarned ?? 0;
    this.deepest = data.deepest ?? 0;
    this.cleanliness = data.cleanliness ?? 0;
    this.log = data.log ?? {};
    for (const u of UPGRADES) {
      const lvl = data.upgrades?.[u.id] ?? 0;
      this.upgrades[u.id] = clamp(Math.floor(lvl), 0, u.maxLevel);
    }
  }

  hardReset(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // yoksay
    }
  }
}

export function isJunk(s: Catchable): s is Junk {
  return s.kind === 'junk';
}

export function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}
