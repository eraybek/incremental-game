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

export interface StepResult {
  stopped: boolean;
  /** Set on the frame the body rebounded off a wall, for impact feedback. */
  bounced: boolean;
}

/** Advances one body against the arena walls. */
export function stepBody(
  pos: Vec2,
  vel: Vec2,
  radius: number,
  rect: ArenaRect,
  decel: number,
  dt: number,
): StepResult {
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;

  const minX = rect.minX + radius;
  const maxX = rect.maxX - radius;
  const minY = rect.minY + radius;
  const maxY = rect.maxY - radius;

  let bounced = false;

  if (pos.x < minX) {
    pos.x = minX;
    vel.x = Math.abs(vel.x) * RESTITUTION;
    bounced = true;
  } else if (pos.x > maxX) {
    pos.x = maxX;
    vel.x = -Math.abs(vel.x) * RESTITUTION;
    bounced = true;
  }

  if (pos.y < minY) {
    pos.y = minY;
    vel.y = Math.abs(vel.y) * RESTITUTION;
    bounced = true;
  } else if (pos.y > maxY) {
    pos.y = maxY;
    vel.y = -Math.abs(vel.y) * RESTITUTION;
    bounced = true;
  }

  const speed = Math.hypot(vel.x, vel.y);
  const newSpeed = Math.max(0, speed - decel * dt);
  if (newSpeed <= decel * STOP_SPEED_FACTOR) {
    vel.x = 0;
    vel.y = 0;
    return { stopped: true, bounced };
  }
  const scale = newSpeed / speed;
  vel.x *= scale;
  vel.y *= scale;
  return { stopped: false, bounced };
}

export class Magnet {
  pos: Vec2;
  vel: Vec2 = { x: 0, y: 0 };
  radius: number;
  isMoving = false;
  carried: CarriedItem[] = [];
  justStopped = false;
  /** Set on the frame the magnet rebounded off a wall. */
  justBounced = false;
  /** Angle the poles point at, in radians. Follows the aim, then the travel
   *  direction, and holds its last value once the magnet stops. */
  facing = -Math.PI / 2;

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
    this.justBounced = false;
  }

  launch(dirX: number, dirY: number, speed: number): void {
    this.vel.x = dirX * speed;
    this.vel.y = dirY * speed;
    this.facing = Math.atan2(dirY, dirX);
    this.isMoving = true;
  }

  /** Loot is tracked as data only — it is listed in the HUD, not drawn on the
   *  magnet, so the arena stays readable. */
  attach(item: CarriedItem): void {
    this.carried.push(item);
  }

  update(dt: number, rect: ArenaRect, decel: number): void {
    this.justStopped = false;
    this.justBounced = false;
    if (!this.isMoving) return;

    const step = stepBody(this.pos, this.vel, this.radius, rect, decel, dt);
    this.justBounced = step.bounced;
    // Keep the poles pointed along the path, including after a wall bounce.
    if (!step.stopped) this.facing = Math.atan2(this.vel.y, this.vel.x);
    if (step.stopped) {
      this.isMoving = false;
      this.justStopped = true;
    }
  }
}
