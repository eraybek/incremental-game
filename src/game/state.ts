import {
  CLEAN_REWARDS,
  FISH,
  JUNK,
  TREASURE_MULTIPLIER,
  UPGRADES,
  UPGRADE_BY_ID,
  autoCastDelayAt,
  comboCapAt,
  costOf,
  densityAt,
  dropSecondsAt,
  grabRadiusAt,
  junkChanceAt,
  lineDepthAt,
  zoneFor,
} from './content';
import type {
  Catchable, Fish, Hooked, Junk, LogEntry, Rod, SaveData, Swimmer, UpgradeId,
} from './types';

const SAVE_KEY = 'derin-sular-save-v4';
const SAVE_VERSION = 4;

/** Balik/copun yatay dolasma siniri (normalize olcek). */
const X_LIMIT = 1.12;
/** Cevrimdisi kazanc tavani (saniye) — 10 saat. */
const OFFLINE_CAP = 10 * 3600;
/** Cevrimdisi verim: izlemeden kazanc, izleyerek kazancin yarisi. */
const OFFLINE_RATE = 0.5;

export interface CatchEvent {
  rod: Rod;
  hooked: Hooked;
  money: number;
  perfect: boolean;
  combo: number;
  firstTime: boolean;
  record: boolean;
}

export interface GameEvents {
  onCatch: (e: CatchEvent) => void;
  onMiss: (rod: Rod) => void;
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
  cleanliness = 0;
  upgrades: Record<UpgradeId, number> = {
    line: 0, reel: 0, radius: 0, bait: 0, market: 0, rods: 0, autocast: 0, master: 0,
  };
  log: Record<string, LogEntry> = {};
  rods: Rod[] = [];
  swimmers: Swimmer[] = [];
  /** Tempo carpani (>=1). Isabetli manuel yakalayisla artar, zamanla duser. */
  combo = 1;
  /** En son manuel odaklanan olta; render odak halkasini burada cizer. */
  focusIndex = 0;
  /** Otomatik atisin kullanacagi son nisan noktasi. */
  lastAim = { x: 0, depth: 0 };
  /** Yuklemede hesaplanan cevrimdisi kazanc; UI bir kez okur. */
  offlineEarned = 0;

  private events: GameEvents;
  private earnSamples: { t: number; amount: number }[] = [];
  private saveTimer = 0;

  constructor(events: GameEvents) {
    this.events = events;
    this.load();
    this.syncRodCount();
    if (this.lastAim.depth === 0) this.lastAim.depth = this.maxDepth * 0.6;
    this.seedSwimmers();
  }

  // --- Turetilmis degerler -------------------------------------------------

  get maxDepth(): number {
    return lineDepthAt(this.upgrades.line);
  }

  /** Kancanin inis/cekme hizi (m/sn). */
  /**
   * Kancanin dikey hizi (m/sn). Ekran her zaman 0..maxDepth'i gosterdigi
   * icin hiz derinlige oranlanir: kanca ekrani hep ayni surede kat eder,
   * boylece gorunur tempo gec oyunda da bozulmaz.
   */
  get dropSpeed(): number {
    return (this.maxDepth * 1.18) / dropSecondsAt(this.upgrades.reel);
  }

  /** Yatay yakalama toleransi (normalize olcek). */
  get grabRadius(): number {
    return grabRadiusAt(this.upgrades.radius);
  }

  /** Dikey yakalama bandi (metre); yariçapla ve derinlikle olceklenir. */
  get grabDepth(): number {
    return Math.max(4, this.maxDepth * 0.04 * (this.grabRadius / grabRadiusAt(0)));
  }

  get junkChance(): number {
    return junkChanceAt(this.upgrades.bait);
  }

  get density(): number {
    return densityAt(this.upgrades.bait);
  }

  get sellMultiplier(): number {
    return (1 + this.upgrades.market * 0.5) * (1 + this.cleanBonus('value'));
  }

  get comboCap(): number {
    return comboCapAt(this.upgrades.master);
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

  // --- Temiz Deniz odulleri ------------------------------------------------

  private cleanBonus(effect: 'value' | 'bite' | 'wait' | 'rod'): number {
    let total = 0;
    for (const r of CLEAN_REWARDS) {
      if (r.effect === effect && this.cleanliness >= r.at) total += r.amount;
    }
    return total;
  }

  get nextCleanReward(): { at: number; label: string } | null {
    for (const r of CLEAN_REWARDS) if (this.cleanliness < r.at) return r;
    return null;
  }

  // --- Yukseltme ekonomisi -------------------------------------------------

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

  // --- Balik havuzu --------------------------------------------------------

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

  private avgValueAt(depth: number): number {
    const pool = this.fishAt(depth);
    let tot = 0;
    let sum = 0;
    for (const c of pool) {
      tot += c.w;
      sum += c.w * c.fish.value;
    }
    return tot > 0 ? sum / tot : 1;
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

  private makeFish(fish: Fish): Hooked {
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
    const avg = this.avgValueAt(depth);
    const mult = TREASURE_MULTIPLIER[junk.id] ?? 10;
    return { species: junk, kg: 0, value: avg * mult * this.sellMultiplier, huge: false };
  }

  // --- Yuzen balik/cop havuzu ----------------------------------------------

  private get targetSwimmers(): number {
    const bands = Math.max(1, zoneIndex(this.maxDepth) + 1);
    return Math.min(30, Math.round((8 + bands * 1.6) * this.density));
  }

  private seedSwimmers(): void {
    this.swimmers.length = 0;
    const n = this.targetSwimmers;
    for (let i = 0; i < n; i++) {
      const s = this.spawnSwimmer();
      // Ilk tohumda ekrana yay: kenardan degil, her yerde.
      s.x = (Math.random() - 0.5) * 2 * X_LIMIT;
      this.swimmers.push(s);
    }
  }

  private spawnSwimmer(): Swimmer {
    const depth = Math.random() * Math.max(14, this.maxDepth * 1.02);
    const isJunkPick = Math.random() < this.junkChance * 0.6;
    let species: Catchable;
    if (isJunkPick) {
      species = this.pick(JUNK.map((item) => ({ item, w: item.weight })));
    } else {
      species = this.pick(this.fishAt(depth).map((c) => ({ item: c.fish, w: c.w })));
    }
    const dir = Math.random() < 0.5 ? -1 : 1;
    // Derin balik daha hizli yuzer; hedeflemesi zorlasir.
    const depthRatio = clamp(depth / Math.max(1, this.maxDepth), 0, 1);
    const speed = 0.06 + depthRatio * 0.10 + Math.random() * 0.03;
    return {
      species,
      x: dir < 0 ? X_LIMIT : -X_LIMIT,
      depth,
      vx: dir * speed,
      phase: Math.random() * Math.PI * 2,
    };
  }

  private updateSwimmers(dt: number): void {
    // Sayiyi hedefe getir (yem/derinlik degisince).
    while (this.swimmers.length < this.targetSwimmers) {
      this.swimmers.push(this.spawnSwimmer());
    }
    while (this.swimmers.length > this.targetSwimmers) {
      this.swimmers.pop();
    }
    for (const s of this.swimmers) {
      s.x += s.vx * dt;
      if (s.x > X_LIMIT && s.vx > 0) this.respawn(s);
      else if (s.x < -X_LIMIT && s.vx < 0) this.respawn(s);
    }
  }

  /** Ekrandan cikan balik yerine yenisini kenardan getir. */
  private respawn(s: Swimmer): void {
    const fresh = this.spawnSwimmer();
    s.species = fresh.species;
    s.depth = fresh.depth;
    s.vx = fresh.vx;
    s.x = fresh.x;
    s.phase = fresh.phase;
  }

  // --- Oltalar -------------------------------------------------------------

  private syncRodCount(): void {
    while (this.rods.length < this.rodCount) {
      this.rods.push({
        index: this.rods.length,
        phase: 'idle',
        homeX: 0, hookX: 0,
        targetDepth: 0, depth: 0,
        timer: 0,
        hooked: null, perfect: false, manual: false, autoTimer: 0,
      });
    }
    this.rods.length = this.rodCount;
    this.layoutRods();
  }

  /** Oltalari genislige esit yay; hatlar ust uste binmesin. */
  private layoutRods(): void {
    const n = this.rods.length;
    for (const rod of this.rods) {
      rod.homeX = n === 1 ? 0 : (rod.index - (n - 1) / 2) * (1.7 / n);
    }
  }

  hasIdleRod(): boolean {
    return this.rods.some((r) => r.phase === 'idle');
  }

  /**
   * Dokunulan noktaya en yakin bostaki oltayi secip kancayi o sutunda (x)
   * hedef derinlige indirir; odagi ona tasir (manuel).
   */
  dropAt(x: number, depth: number): Rod | null {
    let best: Rod | null = null;
    let bestD = Infinity;
    for (const rod of this.rods) {
      if (rod.phase !== 'idle') continue;
      const d = Math.abs(rod.homeX - x);
      if (d < bestD) { bestD = d; best = rod; }
    }
    if (!best) return null;
    this.beginDrop(best, x, depth, true);
    this.focusIndex = best.index;
    this.lastAim = { x, depth };
    return best;
  }

  private beginDrop(rod: Rod, x: number, depth: number, manual: boolean): void {
    rod.phase = 'dropping';
    rod.hookX = clamp(x, -1, 1);
    rod.targetDepth = clamp(depth, 8, this.maxDepth);
    rod.depth = 0;
    rod.timer = 0;
    rod.hooked = null;
    rod.perfect = false;
    rod.manual = manual;
  }

  // --- Ana dongu -----------------------------------------------------------

  update(dt: number): void {
    this.updateSwimmers(dt);
    for (const rod of this.rods) this.updateRod(rod, dt);
    // Seri zamanla 1'e doner.
    if (this.combo > 1) this.combo = Math.max(1, this.combo - dt * 0.35);
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
          // Otomatik oltalar son nisan noktasina, indekslerine gore yayilarak
          // iner ki kancalar ust uste binmesin.
          const n = this.rods.length;
          const spread = n > 1 ? (rod.index - (n - 1) / 2) * 0.28 : 0;
          this.beginDrop(rod, this.lastAim.x + spread, this.lastAim.depth, false);
        }
        break;
      }
      case 'dropping': {
        const prev = rod.depth;
        rod.depth += this.dropSpeed * dt;
        if (rod.depth > this.deepest) this.deepest = rod.depth;
        // Inis yolu uzerinde (prev..depth) bir baliga carptik mi?
        const hit = this.catchAlong(rod, prev, rod.depth);
        if (hit) {
          rod.hooked = hit.hooked;
          rod.perfect = rod.manual && hit.aligned;
          rod.phase = 'reeling';
          rod.timer = 0;
        } else if (rod.depth >= rod.targetDepth) {
          // Hedefe ulastik, bir sey yok: bos don (affedici, ceza yok).
          rod.depth = rod.targetDepth;
          rod.phase = 'reeling';
          rod.timer = 0;
          this.events.onMiss(rod);
        }
        break;
      }
      case 'reeling': {
        // Gold Miner'in nugget mantigi: agir olan yavas gelir. Buyuk bir
        // baligi cekmek oltayi uzun sure mesgul eder, o sirada baska balik
        // kacar - "hangisine gideyim" karari boyle agirlik kazaniyor.
        rod.depth -= this.dropSpeed * this.reelFactor(rod) * dt;
        if (rod.depth <= 0) {
          rod.depth = 0;
          this.land(rod);
        }
        break;
      }
    }
  }

  /**
   * Kancanin (prev..now) derinlik araliginda, yatay yariçap icinde bir balik
   * varsa onu yakalar ve havuzdan cikarir. En yakin hizalanani secer.
   */
  private catchAlong(rod: Rod, prev: number, now: number): { hooked: Hooked; aligned: boolean } | null {
    const xTol = this.grabRadius;
    const vTol = this.grabDepth;
    let bestIdx = -1;
    let bestDx = Infinity;
    for (let i = 0; i < this.swimmers.length; i++) {
      const s = this.swimmers[i];
      const dx = Math.abs(s.x - rod.hookX);
      if (dx > xTol) continue;
      // Kanca bu baligin derinliginden gecti mi?
      if (s.depth < prev - vTol || s.depth > now + vTol) continue;
      if (dx < bestDx) { bestDx = dx; bestIdx = i; }
    }
    if (bestIdx < 0) return null;
    const s = this.swimmers[bestIdx];
    const depth = s.depth;
    const hooked = s.species.kind === 'fish'
      ? this.makeFish(s.species)
      : this.makeJunk(s.species, depth);
    // Yakalanani havuzdan cikar, yerine yeni bir yuzen getir.
    this.respawn(s);
    return { hooked, aligned: bestDx <= xTol * 0.4 };
  }

  /** Cekis hizi carpani: bos kanca hizli, agir av yavas. */
  private reelFactor(rod: Rod): number {
    const h = rod.hooked;
    if (!h) return 1.5;
    // Buyukluk hem turun gorsel olceginden hem bireyin agirlik oranindan.
    let ratio = 1;
    if (h.species.kind === 'fish' && h.species.baseWeight > 0) {
      ratio = h.kg / h.species.baseWeight;
    }
    const heft = h.species.size * Math.pow(Math.max(0.2, ratio), 0.35);
    return clamp(1.05 / (0.55 + heft), 0.18, 0.95);
  }

  private land(rod: Rod): void {
    const hooked = rod.hooked;
    const perfect = rod.perfect;
    const manual = rod.manual;
    rod.phase = 'idle';
    rod.timer = 0;
    rod.autoTimer = 0;
    rod.hooked = null;
    rod.perfect = false;
    rod.manual = false;
    if (!hooked) return;

    // Isabetli manuel yakalayis seriyi besler.
    if (perfect) this.combo = Math.min(this.comboCap, this.combo + 0.22);

    const base = hooked.value * (perfect ? 2 : 1);
    const money = base * this.combo;
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

    this.events.onCatch({ rod, hooked, money, perfect: perfect && manual, combo: this.combo, firstTime, record });
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

  // --- Cevrimdisi kazanc ---------------------------------------------------

  private applyOffline(savedAt: number): void {
    if (this.upgrades.autocast <= 0) return;
    const elapsed = clamp((Date.now() - savedAt) / 1000, 0, OFFLINE_CAP);
    if (elapsed < 60) return;
    const depth = this.lastAim.depth || this.maxDepth * 0.6;
    // Kaba otomatik dongu: inis + cekis + kucuk bosluk.
    const cycle = (2 * depth) / this.dropSpeed + Math.max(0.5, this.autoCastDelay);
    const catchesPerSec = this.rodCount / Math.max(0.8, cycle);
    const perCatch = this.avgValueAt(depth);
    const amount = catchesPerSec * perCatch * OFFLINE_RATE * elapsed;
    if (amount <= 0) return;
    this.money += amount;
    this.totalEarned += amount;
    this.offlineEarned = amount;
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
    if (data.savedAt) this.applyOffline(data.savedAt);
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

/** Derinligin hangi bant indexinde oldugu (0..5). */
function zoneIndex(depth: number): number {
  const name = zoneFor(depth).name;
  const names = ['Sığlık', 'Kıyı Suları', 'Alacakaranlık', 'Derin Mavi', 'Uçurum', 'Hadal Bölge'];
  return Math.max(0, names.indexOf(name));
}
