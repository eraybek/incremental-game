import type { BoardObject, ItemDef, PersistentState } from './types';
import { generateBoard } from './board';
import { Magnet } from './magnet';
import {
  BASE_RUN_DURATION,
  BASE_SHOTS,
  ITEMS,
} from './content';
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

const BASE_MAX_SPEED_FACTOR = 2.6; // relative to arena width per second
const BASE_FRICTION_FACTOR = 1.9; // relative to arena width per second^2
const MIN_LAUNCH_POWER = 0.12;
const MAX_LOAD_PENALTY = 0.75;

export class RunManager {
  state: PersistentState;
  arenaW = 360;
  arenaH = 640;
  magnet: Magnet;
  board: BoardObject[] = [];
  phase: RunPhase = 'idle';
  timeRemaining = BASE_RUN_DURATION;
  shotsRemaining = BASE_SHOTS;
  totalShots = BASE_SHOTS;
  lastPayout: PayoutResult | null = null;

  onPulse?: (e: PulseEvent) => void;
  onRunEnd?: (payout: PayoutResult) => void;

  constructor(state: PersistentState) {
    this.state = state;
    this.magnet = new Magnet(this.startPos(), 1);
  }

  private startPos() {
    return { x: this.arenaW / 2, y: this.arenaH * 0.86 };
  }

  setArenaSize(w: number, h: number): void {
    this.arenaW = w;
    this.arenaH = h;
    this.magnet.radius = w * 0.05;
    if (this.phase !== 'playing') {
      this.magnet.reset(this.startPos());
    }
  }

  private maxSpeed(): number {
    return this.arenaW * BASE_MAX_SPEED_FACTOR * launchMultiplier(this.state);
  }

  private frictionBase(): number {
    return this.arenaW * BASE_FRICTION_FACTOR;
  }

  attractionRangePx(): number {
    return this.arenaW * 0.2 * rangeMultiplier(this.state);
  }

  loadPenalty(): number {
    const raw = this.magnet.load * 0.045 * (1 - loadEfficiency(this.state));
    return Math.min(MAX_LOAD_PENALTY, raw);
  }

  startRun(): void {
    this.magnet.reset(this.startPos());
    this.board = generateBoard(this.arenaW, this.arenaH, this.magnet.pos, lootQualityLevel(this.state));
    this.timeRemaining = BASE_RUN_DURATION;
    this.shotsRemaining = BASE_SHOTS;
    this.totalShots = BASE_SHOTS;
    this.lastPayout = null;
    this.phase = 'playing';
    this.state.totalRuns += 1;
  }

  canShoot(): boolean {
    return this.phase === 'playing' && !this.magnet.isMoving && this.shotsRemaining > 0;
  }

  tryLaunch(dirX: number, dirY: number, power01: number): boolean {
    if (!this.canShoot()) return false;
    const p = Math.max(0, Math.min(1, power01));
    if (p < MIN_LAUNCH_POWER) return false;
    const penalty = this.loadPenalty();
    const speed = this.maxSpeed() * p * (1 - penalty);
    this.magnet.launch(dirX, dirY, Math.max(speed, this.arenaW * 0.4));
    this.shotsRemaining -= 1;
    return true;
  }

  private updateBoardEntrance(dt: number): void {
    for (const obj of this.board) {
      if (obj.settled || obj.carried) continue;
      if (obj.spawnDelay > 0) {
        obj.spawnDelay -= dt;
        continue;
      }
      const dy = obj.targetPos.y - obj.pos.y;
      const dx = obj.targetPos.x - obj.pos.x;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) {
        obj.pos.x = obj.targetPos.x;
        obj.pos.y = obj.targetPos.y;
        obj.settled = true;
        continue;
      }
      const speed = Math.max(dist * 6, this.arenaW * 0.6);
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
        const frac = 1 / required;
        obj.pos.x += dx * frac;
        obj.pos.y += dy * frac;
      }
    }

    this.board = this.board.filter((o) => !o.carried);
  }

  update(dt: number): void {
    if (this.phase !== 'playing') return;

    this.timeRemaining -= dt;
    this.updateBoardEntrance(dt);

    const wasMoving = this.magnet.isMoving;
    this.magnet.update(dt, { width: this.arenaW, height: this.arenaH }, this.frictionBase());

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
    const items = this.magnet.carried.map((c) => {
      const found = ALL_ITEMS_INDEX.get(c.itemId);
      return found!;
    });

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
