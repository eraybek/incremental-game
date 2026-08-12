import type { RunManager } from '../game/run';
import { RARITY_COLOR } from '../game/content';
import { loadImage } from './assets';

export interface AimState {
  active: boolean;
  dirX: number;
  dirY: number;
  power01: number;
}

interface PulseFx {
  x: number;
  y: number;
  radius: number;
  age: number;
}

const MAGNET_SPRITES = {
  idle: '/assets/magnet/magnet_idle.png',
  active: '/assets/magnet/magnet_active.png',
  moving: '/assets/magnet/magnet_moving.png',
  pulse: '/assets/magnet/magnet_moving_pulse.png',
};

const FLOOR_TILE = '/assets/environment/tile_r2c1.png';

function drawSpriteFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  maxSize: number,
): void {
  if (!img.complete || img.naturalWidth === 0) return;
  const scale = maxSize / Math.max(img.naturalWidth, img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width = 360;
  private height = 640;
  private pulses: PulseFx[] = [];
  private floorPattern: CanvasPattern | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;

    const floorImg = loadImage(FLOOR_TILE);
    floorImg.addEventListener('load', () => {
      this.floorPattern = this.ctx.createPattern(floorImg, 'repeat');
    });

    for (const src of Object.values(MAGNET_SPRITES)) loadImage(src);
  }

  resize(cssWidth: number, cssHeight: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.width = cssWidth;
    this.height = cssHeight;
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  addPulseFx(x: number, y: number, radius: number): void {
    this.pulses.push({ x, y, radius, age: 0 });
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#0a1027';
    ctx.fillRect(0, 0, this.width, this.height);
    if (this.floorPattern) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = this.floorPattern;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,196,64,0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, this.width - 6, this.height - 6);
  }

  private drawTrajectory(run: RunManager, aim: AimState): void {
    if (!aim.active) return;
    const ctx = this.ctx;
    const maxLen = this.width * 0.55 * aim.power01;
    const steps = 10;
    ctx.save();
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const dist = maxLen * t;
      const x = run.magnet.pos.x + aim.dirX * dist;
      const y = run.magnet.pos.y + aim.dirY * dist;
      ctx.globalAlpha = 0.85 * (1 - t * 0.6);
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.arc(x, y, 4.5 - t * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBoardObjects(run: RunManager): void {
    const ctx = this.ctx;
    for (const obj of run.board) {
      const img = loadImage(obj.item.sprite);
      const color = RARITY_COLOR[obj.item.rarity];
      if (obj.item.rarity !== 'common') {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(obj.pos.x, obj.pos.y, obj.radius * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      drawSpriteFit(ctx, img, obj.pos.x, obj.pos.y, obj.radius * 2.1);
    }
  }

  private drawMagnet(run: RunManager, aim: AimState): void {
    const ctx = this.ctx;
    const m = run.magnet;
    let spriteKey: keyof typeof MAGNET_SPRITES = 'idle';
    if (m.isMoving) spriteKey = 'moving';
    else if (aim.active) spriteKey = 'active';
    else if (m.carried.length > 0) spriteKey = 'pulse';

    for (const c of m.carried) {
      const img = loadImage(c.sprite);
      drawSpriteFit(ctx, img, m.pos.x + c.offset.x, m.pos.y + c.offset.y, m.radius * 1.1);
    }

    const img = loadImage(MAGNET_SPRITES[spriteKey]);
    drawSpriteFit(ctx, img, m.pos.x, m.pos.y, m.radius * 2.6);
  }

  private drawPulses(dt: number): void {
    const ctx = this.ctx;
    const maxAge = 0.5;
    this.pulses = this.pulses.filter((p) => p.age < maxAge);
    for (const p of this.pulses) {
      p.age += dt;
      const t = p.age / maxAge;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * t, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  draw(run: RunManager, aim: AimState, dt: number): void {
    this.drawBackground();
    this.drawBoardObjects(run);
    this.drawTrajectory(run, aim);
    this.drawMagnet(run, aim);
    this.drawPulses(dt);
  }
}
