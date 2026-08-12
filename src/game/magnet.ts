import type { Vec2 } from './types';

export interface CarriedItem {
  itemId: string;
  weight: number;
}

/** Physics play area as an inset rectangle (the visual frame sits outside it). */
export interface ArenaRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const RESTITUTION = 0.8;
export const STOP_SPEED_FACTOR = 0.04;

/** Advances one body against the arena walls. Shared by the live magnet and the aim preview. */
export function stepBody(
  pos: Vec2,
  vel: Vec2,
  radius: number,
  rect: ArenaRect,
  decel: number,
  dt: number,
): boolean {
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;

  const minX = rect.minX + radius;
  const maxX = rect.maxX - radius;
  const minY = rect.minY + radius;
  const maxY = rect.maxY - radius;

  if (pos.x < minX) {
    pos.x = minX;
    vel.x = Math.abs(vel.x) * RESTITUTION;
  } else if (pos.x > maxX) {
    pos.x = maxX;
    vel.x = -Math.abs(vel.x) * RESTITUTION;
  }

  if (pos.y < minY) {
    pos.y = minY;
    vel.y = Math.abs(vel.y) * RESTITUTION;
  } else if (pos.y > maxY) {
    pos.y = maxY;
    vel.y = -Math.abs(vel.y) * RESTITUTION;
  }

  const speed = Math.hypot(vel.x, vel.y);
  const newSpeed = Math.max(0, speed - decel * dt);
  if (newSpeed <= decel * STOP_SPEED_FACTOR) {
    vel.x = 0;
    vel.y = 0;
    return true;
  }
  const scale = newSpeed / speed;
  vel.x *= scale;
  vel.y *= scale;
  return false;
}

export class Magnet {
  pos: Vec2;
  vel: Vec2 = { x: 0, y: 0 };
  radius: number;
  isMoving = false;
  carried: CarriedItem[] = [];
  justStopped = false;

  constructor(pos: Vec2, radius: number) {
    this.pos = { ...pos };
    this.radius = radius;
  }

  get load(): number {
    return this.carried.reduce((sum, c) => sum + c.weight, 0);
  }

  reset(pos: Vec2): void {
    this.pos = { ...pos };
    this.vel = { x: 0, y: 0 };
    this.isMoving = false;
    this.carried = [];
    this.justStopped = false;
  }

  launch(dirX: number, dirY: number, speed: number): void {
    this.vel.x = dirX * speed;
    this.vel.y = dirY * speed;
    this.isMoving = true;
  }

  /** Loot is tracked as data only — it is listed in the HUD, not drawn on the
   *  magnet, so the arena stays readable. */
  attach(item: CarriedItem): void {
    this.carried.push(item);
  }

  update(dt: number, rect: ArenaRect, decel: number): void {
    this.justStopped = false;
    if (!this.isMoving) return;

    const stopped = stepBody(this.pos, this.vel, this.radius, rect, decel, dt);
    if (stopped) {
      this.isMoving = false;
      this.justStopped = true;
    }
  }
}
