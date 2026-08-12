import type { BoardObject, ItemDef, PersistentState } from './types';
import { generateBoard, randomMagnetStart } from './board';
import { Magnet, type ArenaRect } from './magnet';
import { ITEMS } from './content';
import {
  loadEfficiency,
  launchMultiplier,
  lootQualityLevel,
  lootValueMultiplier,
  magnetPower,
  rangeMultiplier,
  saveState,
  shiftDuration,
  shiftShots,
} from './state';

export type RunPhase = 'idle' | 'playing' | 'ended';

/** One row of the shift report: an item type, how many were collected and what
 *  they were worth in total. */
export interface PayoutLine {
  item: ItemDef;
  count: number;
  unitValue: number;
  total: number;
  isNew: boolean;
}

export interface PayoutResult {
  shift: number;
  lines: PayoutLine[];
  itemCount: number;
  total: number;
  newCount: number;
  /** Share of the total that came from anything above common. */
  rareBonus: number;
  timeLeft: number;
  shotsLeft: number;
}

/** Launch speed and deceleration scale with the arena diagonal so the feel of a
 *  shot is identical on a phone in landscape and on a wide desktop window. */
const SPEED_PER_DIAGONAL = 1.15;
const DECEL_PER_DIAGONAL = 0.62;
const MIN_LAUNCH_POWER = 0.12;
const MAX_LOAD_PENALTY = 0.72;

/** Attraction is continuous. An object is dragged at
 *  `PULL_SPEED × (power / weight) × falloff`, so a light nut snaps in almost
 *  instantly while a heavy toolbox only creeps a few pixels as the magnet
 *  rushes past — the gradual multi-pass pickup the design calls for, without
 *  waiting for the magnet to come to rest. */
const PULL_SPEED = 0.32;
/** Pull is strongest at the magnet and weakest at the rim of the field. */
const EDGE_FALLOFF = 0.65;
/** Beat between the last piece being collected and the shift report. */
const BOARD_CLEARED_GRACE = 0.7;

/** Thickness of the decorative bay frame; physics walls sit on its inner edge. */
export const FRAME_THICKNESS = 0.035;

export class RunManager {
  state: PersistentState;
  canvasW = 800;
  canvasH = 420;
  magnet: Magnet;
  board: BoardObject[] = [];
  phase: RunPhase = 'idle';
  timeRemaining = 0;
  shotsRemaining = 0;
  totalShots = 0;
  lastPayout: PayoutResult | null = null;

  onRunEnd?: (payout: PayoutResult) => void;
  /** Fired where a piece was absorbed, with the coin value it will be worth. */
  onCollect?: (item: ItemDef, x: number, y: number, value: number) => void;
  onLaunch?: () => void;
  onBounce?: (x: number, y: number, dirX: number, dirY: number, speed01: number) => void;

  /** Set once the board has spawned, so an empty board only ends the shift
   *  after there was actually something to clear. */
  private boardHadObjects = false;
  /** Grace period so the final pickup is visible before the report appears. */
  private clearedTimer = 0;

  constructor(state: PersistentState) {
    this.state = state;
    this.magnet = new Magnet({ x: this.canvasW / 2, y: this.canvasH / 2 }, 20);
    this.applyMetrics();
  }

  /** Short axis of the arena — every radius and range is measured against it so
   *  the game reads the same whatever the window aspect ratio is. */
  get scaleRef(): number {
    return Math.min(this.canvasW, this.canvasH);
  }

  get frameSize(): number {
    return Math.round(this.scaleRef * FRAME_THICKNESS);
  }

  /** Shift the player is currently working, 1-based. */
  get currentShift(): number {
    return this.state.shiftsDone + 1;
  }

  arenaRect(): ArenaRect {
    const f = this.frameSize;
    return { minX: f, minY: f, maxX: this.canvasW - f, maxY: this.canvasH - f };
  }

  private applyMetrics(): void {
    this.magnet.radius = this.scaleRef * 0.052;
  }

  setCanvasSize(w: number, h: number): void {
    this.canvasW = w;
    this.canvasH = h;
    this.applyMetrics();

    // Keep the magnet where it is and just pull it back inside the new walls —
    // recentring would teleport it mid-shift and during the shift intro.
    const rect = this.arenaRect();
    const r = this.magnet.radius;
    this.magnet.pos.x = Math.min(Math.max(this.magnet.pos.x, rect.minX + r), rect.maxX - r);
    this.magnet.pos.y = Math.min(Math.max(this.magnet.pos.y, rect.minY + r), rect.maxY - r);
  }

  private diagonal(): number {
    return Math.hypot(this.canvasW, this.canvasH);
  }

  private decel(): number {
    return this.diagonal() * DECEL_PER_DIAGONAL;
  }

  private launchSpeed(power01: number): number {
    const penalty = this.loadPenalty();
    const full = this.diagonal() * SPEED_PER_DIAGONAL * launchMultiplier(this.state);
    return Math.max(full * power01 * (1 - penalty), this.diagonal() * 0.18);
  }

  attractionRangePx(): number {
    return this.scaleRef * 0.3 * rangeMultiplier(this.state);
  }

  loadPenalty(): number {
    const raw = this.magnet.load * 0.042 * (1 - loadEfficiency(this.state));
    return Math.min(MAX_LOAD_PENALTY, raw);
  }

  /** Places the magnet and clears the arena. Called before the shift intro so
   *  the player sees an empty bay with only the magnet in it. */
  prepareShift(): void {
    this.magnet.reset(randomMagnetStart(this.arenaRect(), this.magnet.radius));
    this.board = [];
    this.boardHadObjects = false;
    this.clearedTimer = 0;
    this.totalShots = shiftShots(this.state);
    this.shotsRemaining = this.totalShots;
    this.timeRemaining = shiftDuration(this.state);
    this.lastPayout = null;
    this.phase = 'idle';
  }

  /** Spawns the scrap and starts the clock — called once the intro card has
   *  cleared, so loot never drops in behind the title. */
  beginShift(): void {
    this.board = generateBoard(
      this.arenaRect(),
      this.scaleRef,
      this.magnet.pos,
      this.magnet.radius,
      lootQualityLevel(this.state),
    );
    this.boardHadObjects = this.board.length > 0;
    this.phase = 'playing';
  }

  /** Ends the shift on demand — the "finish shift" button in the bottom bar. */
  finishShift(): void {
    if (this.phase === 'playing') this.endShift();
  }

  canShoot(): boolean {
    return this.phase === 'playing' && !this.magnet.isMoving && this.shotsRemaining > 0;
  }

  tryLaunch(dirX: number, dirY: number, power01: number): boolean {
    if (!this.canShoot()) return false;
    const p = Math.max(0, Math.min(1, power01));
    if (p < MIN_LAUNCH_POWER) return false;
    this.magnet.launch(dirX, dirY, this.launchSpeed(p));
    this.shotsRemaining -= 1;
    this.onLaunch?.();
    return true;
  }

  private updateBoardEntrance(dt: number): void {
    for (const obj of this.board) {
      if (obj.settled || obj.carried) continue;
      if (obj.spawnDelay > 0) {
        obj.spawnDelay -= dt;
        continue;
      }
      const dx = obj.targetPos.x - obj.pos.x;
      const dy = obj.targetPos.y - obj.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) {
        obj.pos.x = obj.targetPos.x;
        obj.pos.y = obj.targetPos.y;
        obj.settled = true;
        continue;
      }
      const speed = Math.max(dist * 6, this.scaleRef * 1.2);
      const step = Math.min(dist, speed * dt);
      obj.pos.x += (dx / dist) * step;
      obj.pos.y += (dy / dist) * step;
    }
  }

  /** Runs every frame, moving or not: anything inside the field is dragged
   *  toward the magnet and snaps on once it touches. */
  private updateAttraction(dt: number): void {
    const range = this.attractionRangePx();
    const power = magnetPower(this.state);
    const maxStepSpeed = this.scaleRef * 3;
    let collected = false;

    for (const obj of this.board) {
      obj.beingPulled = false;
      if (obj.carried || !obj.settled) continue;

      const dx = this.magnet.pos.x - obj.pos.x;
      const dy = this.magnet.pos.y - obj.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > range) continue;

      // Snap on as soon as the sprites meet, otherwise loot visibly sits on top
      // of the magnet while it waits to be picked up.
      const capture = this.magnet.radius * 0.95 + obj.radius * 0.9;

      const falloff = 1 - (dist / range) * EDGE_FALLOFF;
      const speed = Math.min(maxStepSpeed, this.scaleRef * PULL_SPEED * (power / obj.item.weight) * falloff);
      const step = Math.min(dist, speed * dt);

      // Test capture against where the object ends up this frame. Clamping the
      // step to `dist - capture` instead made objects creep toward the capture
      // radius and hover there forever without ever tripping the check.
      if (dist - step <= capture) {
        obj.carried = true;
        collected = true;
        this.magnet.attach({ itemId: obj.item.id, weight: obj.item.weight });
        this.onCollect?.(
          obj.item,
          obj.pos.x,
          obj.pos.y,
          Math.round(obj.item.value * lootValueMultiplier(this.state)),
        );
        continue;
      }

      obj.pos.x += (dx / dist) * step;
      obj.pos.y += (dy / dist) * step;
      // An object dragged only part of the way stays where it was left, so the
      // next pass can pick it up from closer in.
      obj.targetPos.x = obj.pos.x;
      obj.targetPos.y = obj.pos.y;
      obj.beingPulled = true;
    }

    if (collected) {
      this.board = this.board.filter((o) => !o.carried);
    }
  }

  update(dt: number): void {
    if (this.phase !== 'playing') return;

    this.timeRemaining -= dt;
    this.updateBoardEntrance(dt);
    const speedBefore = Math.hypot(this.magnet.vel.x, this.magnet.vel.y);
    this.magnet.update(dt, this.arenaRect(), this.decel());
    if (this.magnet.justBounced) {
      const reference = this.diagonal() * SPEED_PER_DIAGONAL;
      this.onBounce?.(
        this.magnet.pos.x,
        this.magnet.pos.y,
        this.magnet.vel.x,
        this.magnet.vel.y,
        Math.min(1, speedBefore / reference),
      );
    }
    this.updateAttraction(dt);

    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.endShift();
      return;
    }

    // Board swept clean — nothing left to earn, so wrap up after a short beat.
    if (this.boardHadObjects && this.board.length === 0) {
      this.clearedTimer += dt;
      if (this.clearedTimer >= BOARD_CLEARED_GRACE) this.endShift();
      return;
    }

    if (this.shotsRemaining <= 0 && !this.magnet.isMoving && this.board.every((o) => !o.beingPulled)) {
      this.endShift();
    }
  }

  private endShift(): void {
    if (this.phase !== 'playing') return;

    const valueMult = lootValueMultiplier(this.state);
    const discovered = new Set(this.state.discovered);

    // Group by item type: the report is "3 × Somun = 15", not a wall of icons.
    const grouped = new Map<string, PayoutLine>();
    for (const carried of this.magnet.carried) {
      const item = ALL_ITEMS_INDEX.get(carried.itemId);
      if (!item) continue;

      const unitValue = Math.round(item.value * valueMult);
      const existing = grouped.get(item.id);
      if (existing) {
        existing.count += 1;
        existing.total += unitValue;
      } else {
        grouped.set(item.id, {
          item,
          count: 1,
          unitValue,
          total: unitValue,
          isNew: !discovered.has(item.id),
        });
      }
      discovered.add(item.id);
    }

    const lines = Array.from(grouped.values()).sort((a, b) => b.total - a.total);
    const total = lines.reduce((sum, l) => sum + l.total, 0);
    const itemCount = lines.reduce((sum, l) => sum + l.count, 0);

    const payout: PayoutResult = {
      shift: this.currentShift,
      lines,
      itemCount,
      total,
      newCount: lines.filter((l) => l.isNew).length,
      rareBonus: lines
        .filter((l) => l.item.rarity !== 'common')
        .reduce((sum, l) => sum + l.total, 0),
      timeLeft: Math.max(0, this.timeRemaining),
      shotsLeft: this.shotsRemaining,
    };

    this.state.coins += total;
    this.state.discovered = Array.from(discovered);
    this.state.shiftsDone += 1;
    saveState(this.state);

    this.lastPayout = payout;
    this.phase = 'ended';
    this.onRunEnd?.(payout);
  }
}

const ALL_ITEMS_INDEX = new Map(ITEMS.map((i) => [i.id, i]));
