import {
  FISH,
  UPGRADE_BY_ID,
  UPGRADES,
  autoCastDelayAt,
  costOf,
  lineDepthAt,
} from './content';
import type { Fish, Rod, SaveData, UpgradeId } from './types';

const SAVE_KEY = 'derin-sular-save-v1';
const SAVE_VERSION = 1;
/** Cevrimdisi kazancin ust siniri (saniye). */
const OFFLINE_CAP_SECONDS = 4 * 3600;

export interface CatchEvent {
  fish: Fish;
  money: number;
  perfect: boolean;
  /** Kancanin dunya konumu; ekranda yuzen yazi icin. */
  x: number;
  depth: number;
}

export interface GameEvents {
  onCatch: (e: CatchEvent) => void;
  onBite: (rod: Rod) => void;
  onCast: (rod: Rod) => void;
}

export class Game {
  money = 0;
  totalEarned = 0;
  deepest = 0;
  upgrades: Record<UpgradeId, number> = {
    reel: 0,
    rods: 0,
    line: 0,
    bait: 0,
    market: 0,
    autocast: 0,
    net: 0,
  };
  caught: Record<string, number> = {};
  rods: Rod[] = [];
  /** Son 10 saniyedeki kazanci takip eden basit kayan pencere. */
  private earnSamples: { t: number; amount: number }[] = [];
  private events: GameEvents;
  /** Cevrimdisi ozetini UI'ya tasimak icin. */
  offlineReport: { seconds: number; money: number } | null = null;

  constructor(events: GameEvents) {
    this.events = events;
    this.load();
    this.syncRodCount();
  }

  // --- Turetilmis degerler -------------------------------------------------

  /** Misinanin sarilma / inme hizi (m/sn). */
  get reelSpeed(): number {
    return 8 + this.upgrades.reel * 2.6;
  }

  /** Oltanin inebilecegi en derin nokta (m). */
  get maxDepth(): number {
    return lineDepthAt(this.upgrades.line);
  }

  get rodCount(): number {
    return 1 + this.upgrades.rods;
  }

  /** Nadir baliklara uygulanan agirlik carpani. */
  get baitLuck(): number {
    return 1 + this.upgrades.bait * 0.35;
  }

  get sellMultiplier(): number {
    return 1 + this.upgrades.market * 0.5;
  }

  get autoCastDelay(): number {
    return autoCastDelayAt(this.upgrades.autocast);
  }

  /**
   * Dip aginin pasif geliri. Erisilebilir derinlikteki ortalama balik degerine
   * baglanir ki oyunun geri kalaniyla ayni hizda olceklensin.
   */
  get netIncome(): number {
    const level = this.upgrades.net;
    if (level <= 0) return 0;
    const avg = this.averageCatchValue(this.maxDepth);
    return avg * level * 0.12;
  }

  /** Son 10 saniyeye bakarak olculen gercek gelir (para/sn). */
  get incomePerSecond(): number {
    const now = performance.now() / 1000;
    const cutoff = now - 10;
    let sum = 0;
    for (const s of this.earnSamples) if (s.t >= cutoff) sum += s.amount;
    const window = Math.min(10, Math.max(1, now - (this.earnSamples[0]?.t ?? now)));
    return sum / window;
  }

  costFor(id: UpgradeId): number {
    const u = UPGRADE_BY_ID.get(id)!;
    return costOf(u, this.upgrades[id]);
  }

  canAfford(id: UpgradeId): boolean {
    const u = UPGRADE_BY_ID.get(id)!;
    if (this.upgrades[id] >= u.maxLevel) return false;
    return this.money >= this.costFor(id);
  }

  buy(id: UpgradeId): boolean {
    if (!this.canAfford(id)) return false;
    this.money -= this.costFor(id);
    this.upgrades[id] += 1;
    if (id === 'rods') this.syncRodCount();
    this.save();
    return true;
  }

  /** Yukseltme henuz "kesfedilmemisse" panelde gizlenir. */
  isRevealed(id: UpgradeId): boolean {
    const u = UPGRADE_BY_ID.get(id)!;
    return this.upgrades[id] > 0 || this.totalEarned >= u.revealAt;
  }

  // --- Balik secimi --------------------------------------------------------

  /** Verilen derinlikte yakalanabilecek baliklar ve agirliklari. */
  private candidatesAt(depth: number): { fish: Fish; w: number }[] {
    const out: { fish: Fish; w: number }[] = [];
    for (const f of FISH) {
      if (depth < f.minDepth || depth > f.maxDepth) continue;
      // Nadir baliklar yemden faydalanir, sirdanlar faydalanmaz.
      const luck = f.rarity === 'common' ? 1 : this.baitLuck;
      out.push({ fish: f, w: f.weight * luck });
    }
    if (out.length === 0) out.push({ fish: FISH[0], w: 1 });
    return out;
  }

  private rollFish(depth: number): Fish {
    const cands = this.candidatesAt(depth);
    let total = 0;
    for (const c of cands) total += c.w;
    let r = Math.random() * total;
    for (const c of cands) {
      r -= c.w;
      if (r <= 0) return c.fish;
    }
    return cands[cands.length - 1].fish;
  }

  /** Bir atisin beklenen degeri; dip agi gelirini olceklemek icin. */
  private averageCatchValue(depth: number): number {
    const cands = this.candidatesAt(depth);
    let total = 0;
    let sum = 0;
    for (const c of cands) {
      total += c.w;
      sum += c.w * c.fish.value;
    }
    return (sum / total) * this.sellMultiplier;
  }

  // --- Oltalar -------------------------------------------------------------

  private syncRodCount(): void {
    while (this.rods.length < this.rodCount) {
      this.rods.push({
        index: this.rods.length,
        phase: 'idle',
        depth: 0,
        targetDepth: 0,
        hookTimer: 0,
        catchFish: null,
        perfect: false,
        autoTimer: 0,
      });
    }
    this.rods.length = this.rodCount;
  }

  /** Bostaki ilk oltayi atar. Oyuncu dokunusu ve otomatik makara bunu cagirir. */
  castOne(): boolean {
    const rod = this.rods.find((r) => r.phase === 'idle');
    if (!rod) return false;
    rod.phase = 'descending';
    rod.depth = 0;
    // Her olta biraz farkli derinlige insin ki sahne canli gorunsun.
    rod.targetDepth = this.maxDepth * (0.82 + Math.random() * 0.18);
    rod.catchFish = null;
    rod.perfect = false;
    this.events.onCast(rod);
    return true;
  }

  castAll(): void {
    for (let i = 0; i < this.rods.length; i++) if (!this.castOne()) break;
  }

  /**
   * Oyuncunun "tam zamaninda cekme" dokunusu. Isirma penceresi acikken
   * dokunulursa o balik iki kat eder.
   */
  strike(): boolean {
    let any = false;
    for (const rod of this.rods) {
      if (rod.phase === 'hooking' && !rod.perfect) {
        rod.perfect = true;
        rod.hookTimer = 0;
        any = true;
      }
    }
    return any;
  }

  // --- Ana dongu -----------------------------------------------------------

  update(dt: number): void {
    for (const rod of this.rods) {
      switch (rod.phase) {
        case 'idle': {
          const delay = this.autoCastDelay;
          if (Number.isFinite(delay)) {
            rod.autoTimer += dt;
            if (rod.autoTimer >= delay) {
              rod.autoTimer = 0;
              this.castOne();
            }
          }
          break;
        }
        case 'descending': {
          rod.depth += this.reelSpeed * dt;
          if (rod.depth >= rod.targetDepth) {
            rod.depth = rod.targetDepth;
            rod.phase = 'hooking';
            // Isirma penceresi: oyuncunun tepki verebilecegi kadar.
            rod.hookTimer = 0.55;
            rod.catchFish = this.rollFish(rod.depth);
            if (rod.depth > this.deepest) this.deepest = rod.depth;
            this.events.onBite(rod);
          }
          break;
        }
        case 'hooking': {
          rod.hookTimer -= dt;
          if (rod.hookTimer <= 0) rod.phase = 'ascending';
          break;
        }
        case 'ascending': {
          // Dolu misina biraz daha agir sarilir.
          rod.depth -= this.reelSpeed * 0.85 * dt;
          if (rod.depth <= 0) {
            rod.depth = 0;
            this.land(rod);
          }
          break;
        }
      }
    }

    const net = this.netIncome;
    if (net > 0) this.earn(net * dt, false);

    this.autosave(dt);
  }

  /** Yakalanan baligi satar ve olay yayar. */
  private land(rod: Rod): void {
    const fish = rod.catchFish;
    rod.phase = 'idle';
    rod.autoTimer = 0;
    if (!fish) return;
    const gain = fish.value * this.sellMultiplier * (rod.perfect ? 2 : 1);
    this.earn(gain, true);
    this.caught[fish.id] = (this.caught[fish.id] ?? 0) + 1;
    this.events.onCatch({
      fish,
      money: gain,
      perfect: rod.perfect,
      x: rod.index,
      depth: rod.targetDepth,
    });
    rod.catchFish = null;
    rod.perfect = false;
  }

  private earn(amount: number, sample: boolean): void {
    this.money += amount;
    this.totalEarned += amount;
    if (sample) {
      const t = performance.now() / 1000;
      this.earnSamples.push({ t, amount });
      const cutoff = t - 10;
      while (this.earnSamples.length && this.earnSamples[0].t < cutoff) {
        this.earnSamples.shift();
      }
    }
  }

  // --- Kayit ---------------------------------------------------------------

  private saveTimer = 0;

  private autosave(dt: number): void {
    this.saveTimer += dt;
    if (this.saveTimer >= 10) {
      this.saveTimer = 0;
      this.save();
    }
  }

  save(): void {
    const data: SaveData = {
      v: SAVE_VERSION,
      money: this.money,
      totalEarned: this.totalEarned,
      upgrades: this.upgrades,
      caught: this.caught,
      deepest: this.deepest,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Depolama kapali olabilir (gizli sekme vb.) - oyun yine de oynanir.
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
    this.caught = data.caught ?? {};
    for (const u of UPGRADES) {
      const lvl = data.upgrades?.[u.id] ?? 0;
      this.upgrades[u.id] = Math.max(0, Math.min(u.maxLevel, Math.floor(lvl)));
    }
    this.syncRodCount();

    // Cevrimdisi kazanc: sadece dip agi calisir, tavanla sinirli.
    const elapsed = Math.max(0, (Date.now() - (data.savedAt ?? Date.now())) / 1000);
    const credited = Math.min(elapsed, OFFLINE_CAP_SECONDS);
    const gain = this.netIncome * credited;
    if (gain > 0 && elapsed > 60) {
      this.money += gain;
      this.totalEarned += gain;
      this.offlineReport = { seconds: credited, money: gain };
    }
  }

  reset(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* yoksay */
    }
  }
}
