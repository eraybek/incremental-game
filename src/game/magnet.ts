import type { Vec2 } from './types';

export interface CarriedItem {
  itemId: string;
  sprite: string;
  offset: Vec2;
  weight: number;
}

export interface ArenaBounds {
  width: number;
  height: number;
}

const RESTITUTION = 0.78;
const STOP_SPEED_FACTOR = 0.05;
const FRICTION_FACTOR = 1.55;

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

  attach(item: CarriedItem): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = this.radius * (0.35 + Math.random() * 0.5);
    item.offset = { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
    this.carried.push(item);
  }

  update(dt: number, bounds: ArenaBounds, frictionBase: number): void {
    this.justStopped = false;
    if (!this.isMoving) return;

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    const minX = this.radius;
    const maxX = bounds.width - this.radius;
    const minY = this.radius;
    const maxY = bounds.height - this.radius;

    if (this.pos.x < minX) {
      this.pos.x = minX;
      this.vel.x = Math.abs(this.vel.x) * RESTITUTION;
    } else if (this.pos.x > maxX) {
      this.pos.x = maxX;
      this.vel.x = -Math.abs(this.vel.x) * RESTITUTION;
    }

    if (this.pos.y < minY) {
      this.pos.y = minY;
      this.vel.y = Math.abs(this.vel.y) * RESTITUTION;
    } else if (this.pos.y > maxY) {
      this.pos.y = maxY;
      this.vel.y = -Math.abs(this.vel.y) * RESTITUTION;
    }

    const speed = Math.hypot(this.vel.x, this.vel.y);
    const decel = frictionBase * FRICTION_FACTOR * dt;
    const newSpeed = Math.max(0, speed - decel);
    if (newSpeed <= frictionBase * STOP_SPEED_FACTOR) {
      this.vel.x = 0;
      this.vel.y = 0;
      this.isMoving = false;
      this.justStopped = true;
    } else {
      const scale = newSpeed / speed;
      this.vel.x *= scale;
      this.vel.y *= scale;
    }
  }
}
