import type { BoardObject, ItemDef, PersistentState, Vec2 } from './types';
import { generateBoard, randomMagnetStart } from './board';
import { Magnet, stepBody, type ArenaRect } from './magnet';
import { BASE_RUN_DURATION, BASE_SHOTS, ITEMS } from './content';
import {
  loadEfficiency,
  launchMultiplier,
  lootQualityLevel,
  lootValueMultiplier,
  magnetPower,
  rangeMultiplier,
  saveState,
} from './state';

export type RunPhase = 'idle' | 'playing' | 'ended';

export interface PayoutResult {
  items: ItemDef[];
  total: number;
  newDiscoveries: ItemDef[];
}

export interface PulseEvent {
  x: number;
  y: number;
  radius: number;
}

/** Launch speed and deceleration scale with the arena diagonal so the feel of a
 *  shot is identical on a phone in landscape and on a wide desktop window. */
const SPEED_PER_DIAGONAL = 1.15;
const DECEL_PER_DIAGONAL = 0.62;
const MIN_LAUNCH_POWER = 0.12;
const MAX_LOAD_PENALTY = 0.72;

/** Thickness of the decorative bay frame; physics walls sit on its inner edge. */
export const FRAME_THICKNESS = 0.035;

export class RunManager {
  state: PersistentState;
  canvasW = 800;
  canvasH = 420;
  magnet: Magnet;
  board: BoardObject[] = [];
  phase: RunPhase = 'idle';
  timeRemaining = BASE_RUN_DURATION;
  shotsRemaining = BASE_SHOTS;
  totalShots = BASE_SHOTS;
  lastPayout: PayoutResult | null = null;

  onPulse?: (e: PulseEvent) => void;
  onRunEnd?: (payout: PayoutResult) => void;
  onBoardReady?: () => void;

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

  arenaRect(): ArenaRect {
    const f = this.frameSize;
    return { minX: f, minY: f, maxX: this.canvasW - f, maxY: this.canvasH - f };
  }

  private applyMetrics(): void {
    this.magnet.radius = this.scaleRef * 0.072;
  }

  setCanvasSize(w: number, h: number): void {
    this.canvasW = w;
    this.canvasH = h;
    this.applyMetrics();
    if (this.phase !== 'playing') {
      const rect = this.arenaRect();
      this.magnet.reset({
        x: (rect.minX + rect.maxX) / 2,
        y: (rect.minY + rect.maxY) / 2,
      });
    }
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

  startRun(): void {
    const rect = this.arenaRect();
    this.magnet.reset(randomMagnetStart(rect, this.magnet.radius));
    this.board = generateBoard(
      rect,
      this.scaleRef,
      this.magnet.pos,
      this.magnet.radius,
      lootQualityLevel(this.state),
    );
    this.timeRemaining = BASE_RUN_DURATION;
    this.shotsRemaining = BASE_SHOTS;
    this.totalShots = BASE_SHOTS;
    this.lastPayout = null;
    this.phase = 'playing';
    this.state.totalRuns += 1;
    this.onBoardReady?.();
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
    return true;
  }

  /** Replays the shot physics without mutating state, so the aim line shows the
   *  real path including wall bounces. */
  predictTrajectory(dirX: number, dirY: number, power01: number): Vec2[] {
    const p = Math.max(0, Math.min(1, power01));
    if (p < MIN_LAUNCH_POWER) return [];

    const speed = this.launchSpeed(p);
    const pos: Vec2 = { ...this.magnet.pos };
    const vel: Vec2 = { x: dirX * speed, y: dirY * speed };
    const rect = this.arenaRect();
    const decel = this.decel();
    const dt = 1 / 120;
    const points: Vec2[] = [];

    for (let i = 0; i < 400; i++) {
      const stopped = stepBody(pos, vel, this.magnet.radius, rect, decel, dt);
      if (i % 7 === 0) points.push({ x: pos.x, y: pos.y });
      if (stopped) break;
    }
    // Mark where the magnet actually comes to rest — that is where the pulse fires.
    points.push({ x: pos.x, y: pos.y });
    return points;
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

  private doPulse(): void {
    const range = this.attractionRangePx();
    const power = magnetPower(this.state);
    this.onPulse?.({ x: this.magnet.pos.x, y: this.magnet.pos.y, radius: range });

    for (const obj of this.board) {
      if (obj.carried || !obj.settled) continue;
      const dx = this.magnet.pos.x - obj.pos.x;
      const dy = this.magnet.pos.y - obj.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > range) continue;

      const required = Math.max(1, Math.ceil(obj.item.weight / power));
      obj.pulsesReceived += 1;

      if (obj.pulsesReceived >= required || dist <= this.magnet.radius + obj.radius) {
        obj.carried = true;
        this.magnet.attach({
          itemId: obj.item.id,
          sprite: obj.item.sprite,
          offset: { x: 0, y: 0 },
          weight: obj.item.weight,
        });
      } else {
        // Too heavy to lift this pulse: drag it part of the way and leave it there.
        const frac = 1 / required;
        obj.pos.x += dx * frac;
        obj.pos.y += dy * frac;
        obj.targetPos.x = obj.pos.x;
        obj.targetPos.y = obj.pos.y;
      }
    }

    this.board = this.board.filter((o) => !o.carried);
  }

  update(dt: number): void {
    if (this.phase !== 'playing') return;

    this.timeRemaining -= dt;
    this.updateBoardEntrance(dt);

    const wasMoving = this.magnet.isMoving;
    this.magnet.update(dt, this.arenaRect(), this.decel());

    if (wasMoving && this.magnet.justStopped) {
      this.doPulse();
    }

    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.endRun();
      return;
    }

    if (this.shotsRemaining <= 0 && !this.magnet.isMoving) {
      this.endRun();
    }
  }

  private endRun(): void {
    if (this.phase !== 'playing') return;
    const valueMult = lootValueMultiplier(this.state);
    const items = this.magnet.carried
      .map((c) => ALL_ITEMS_INDEX.get(c.itemId))
      .filter((i): i is ItemDef => i !== undefined);

    let total = 0;
    const newDiscoveries: ItemDef[] = [];
    const discoveredSet = new Set(this.state.discovered);

    for (const item of items) {
      total += Math.round(item.value * valueMult);
      if (!discoveredSet.has(item.id)) {
        discoveredSet.add(item.id);
        newDiscoveries.push(item);
      }
    }

    this.state.coins += total;
    this.state.discovered = Array.from(discoveredSet);
    saveState(this.state);

    this.lastPayout = { items, total, newDiscoveries };
    this.phase = 'ended';
    this.onRunEnd?.(this.lastPayout);
  }
}

const ALL_ITEMS_INDEX = new Map(ITEMS.map((i) => [i.id, i]));
