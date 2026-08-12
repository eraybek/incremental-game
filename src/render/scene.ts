import type { RunManager } from '../game/run';
import type { Vec2 } from '../game/types';
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

interface Decal {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
  alpha: number;
}

interface Bolt {
  x: number;
  y: number;
  r: number;
}

const MAGNET_SPRITES = {
  idle: '/assets/magnet/magnet_idle.png',
  active: '/assets/magnet/magnet_active.png',
  moving: '/assets/magnet/magnet_moving.png',
};

const FLOOR_TILE = '/assets/environment/tile_r2c2.png';
const HAZARD_TILE = '/assets/environment/tile_r6c3.png';
const PIPE_TILE = '/assets/environment/tile_r6c1.png';

const PULSE_LIFETIME = 0.55;

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
  ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
}

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width = 800;
  private height = 420;
  private pulses: PulseFx[] = [];
  private floorPattern: CanvasPattern | null = null;
  private decals: Decal[] = [];
  private bolts: Bolt[] = [];
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;

    for (const src of Object.values(MAGNET_SPRITES)) loadImage(src);
    loadImage(FLOOR_TILE);
    loadImage(HAZARD_TILE);
    loadImage(PIPE_TILE);
  }

  resize(cssWidth: number, cssHeight: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.width = cssWidth;
    this.height = cssHeight;
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.regenerateFloor();
  }

  /** Oil stains and floor bolts — cheap detail that keeps the empty bay from
   *  looking like a flat colour field, regenerated per board so runs differ. */
  regenerateFloor(): void {
    // Pattern scale depends on the canvas size, so drop it whenever we resize.
    this.floorPattern = null;

    const stainCount = 7 + Math.floor(Math.random() * 5);
    this.decals = [];
    for (let i = 0; i < stainCount; i++) {
      const r = Math.min(this.width, this.height) * (0.05 + Math.random() * 0.11);
      this.decals.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        rx: r,
        ry: r * (0.45 + Math.random() * 0.4),
        rot: Math.random() * Math.PI,
        alpha: 0.1 + Math.random() * 0.14,
      });
    }

    this.bolts = [];
    const step = Math.max(64, Math.min(this.width, this.height) * 0.28);
    for (let x = step * 0.5; x < this.width; x += step) {
      for (let y = step * 0.5; y < this.height; y += step) {
        this.bolts.push({ x, y, r: 1.6 });
      }
    }
  }

  addPulseFx(x: number, y: number, radius: number): void {
    this.pulses.push({ x, y, radius, age: 0 });
  }

  private ensureFloorPattern(): void {
    if (this.floorPattern) return;
    const img = loadImage(FLOOR_TILE);
    if (!img.complete || img.naturalWidth === 0) return;
    const pattern = this.ctx.createPattern(img, 'repeat');
    if (!pattern) return;
    // Blow the tile up well past its native size: at low opacity it reads as
    // stone grain instead of an obvious repeating grid.
    const scale = (Math.min(this.width, this.height) * 0.9) / img.naturalWidth;
    pattern.setTransform(new DOMMatrix().scale(scale, scale));
    this.floorPattern = pattern;
  }

  private drawFloor(run: RunManager): void {
    const ctx = this.ctx;
    const { width: w, height: h } = this;

    // Base: cool dark steel, lighter toward the middle of the bay.
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#141b33');
    base.addColorStop(0.5, '#1b2440');
    base.addColorStop(1, '#10162a');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    const rect = run.arenaRect();
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.minX, rect.minY, rect.maxX - rect.minX, rect.maxY - rect.minY);
    ctx.clip();

    // Wide floor plates give the bay structure without a busy repeating texture:
    // a dark seam with a 1px highlight below it reads as a bevelled steel plate.
    const plate = Math.max(96, Math.min(w, h) * 0.34);
    const seams: Array<[number, number, number, number]> = [];
    for (let x = rect.minX + plate; x < rect.maxX; x += plate) {
      seams.push([Math.round(x) + 0.5, rect.minY, Math.round(x) + 0.5, rect.maxY]);
    }
    for (let y = rect.minY + plate; y < rect.maxY; y += plate) {
      seams.push([rect.minX, Math.round(y) + 0.5, rect.maxX, Math.round(y) + 0.5]);
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of seams) {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(140, 170, 235, 0.07)';
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of seams) {
      ctx.moveTo(x0 + 1.5, y0 + 1.5);
      ctx.lineTo(x1 + 1.5, y1 + 1.5);
    }
    ctx.stroke();

    // Stone grain, heavily knocked back so collectibles stay the brightest thing.
    this.ensureFloorPattern();
    if (this.floorPattern) {
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = this.floorPattern;
      ctx.fillRect(rect.minX, rect.minY, rect.maxX - rect.minX, rect.maxY - rect.minY);
      ctx.globalAlpha = 1;
    }

    // Overhead light pool.
    const cx = (rect.minX + rect.maxX) / 2;
    const cy = (rect.minY + rect.maxY) / 2;
    const lightR = Math.max(w, h) * 0.62;
    const light = ctx.createRadialGradient(cx, cy * 0.85, lightR * 0.05, cx, cy, lightR);
    light.addColorStop(0, 'rgba(124, 162, 255, 0.13)');
    light.addColorStop(0.55, 'rgba(90, 120, 200, 0.05)');
    light.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = light;
    ctx.fillRect(rect.minX, rect.minY, rect.maxX - rect.minX, rect.maxY - rect.minY);

    // Oil stains.
    for (const d of this.decals) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = '#05070f';
      ctx.beginPath();
      ctx.ellipse(0, 0, d.rx, d.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Floor bolts.
    ctx.globalAlpha = 0.5;
    for (const b of this.bolts) {
      ctx.fillStyle = '#2f3a5e';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0b0f1e';
      ctx.beginPath();
      ctx.arc(b.x, b.y + 1, b.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Vignette pulls the eye to the centre of the arena.
    const vign = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.25, cx, cy, Math.max(w, h) * 0.72);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vign;
    ctx.fillRect(rect.minX, rect.minY, rect.maxX - rect.minX, rect.maxY - rect.minY);

    ctx.restore();
  }

  private drawFrame(run: RunManager): void {
    const ctx = this.ctx;
    const { width: w, height: h } = this;
    const rect = run.arenaRect();
    const f = run.frameSize;

    // Dark bay wall behind the hazard trim.
    ctx.fillStyle = '#080c1a';
    ctx.fillRect(0, 0, w, f);
    ctx.fillRect(0, h - f, w, f);
    ctx.fillRect(0, 0, f, h);
    ctx.fillRect(w - f, 0, f, h);

    // Hazard stripes along the long walls only — enough to read as a workshop bay
    // without ringing the whole arena in yellow.
    const hazard = loadImage(HAZARD_TILE);
    if (hazard.complete && hazard.naturalWidth > 0) {
      const segW = f * (hazard.naturalWidth / hazard.naturalHeight);
      ctx.save();
      ctx.globalAlpha = 0.85;
      for (let x = 0; x < w; x += segW) {
        ctx.drawImage(hazard, x, 0, segW, f);
        ctx.drawImage(hazard, x, h - f, segW, f);
      }
      ctx.restore();
    }

    // Pipe run tucked against the top wall.
    const pipe = loadImage(PIPE_TILE);
    if (pipe.complete && pipe.naturalWidth > 0) {
      const ph = f * 0.72;
      const pw = ph * (pipe.naturalWidth / pipe.naturalHeight);
      ctx.save();
      ctx.globalAlpha = 0.32;
      for (let x = -pw * 0.3; x < w; x += pw) {
        ctx.drawImage(pipe, x, f * 0.16, pw, ph);
      }
      ctx.restore();
    }

    // Bright inner lip so the collision boundary is unmistakable.
    ctx.strokeStyle = 'rgba(255, 190, 70, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.minX + 1, rect.minY + 1, rect.maxX - rect.minX - 2, rect.maxY - rect.minY - 2);
  }

  private drawBoardObjects(run: RunManager): void {
    const ctx = this.ctx;
    for (const obj of run.board) {
      const img = loadImage(obj.item.sprite);

      // Contact shadow grounds the sprite on the floor.
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#04060f';
      ctx.beginPath();
      ctx.ellipse(obj.pos.x, obj.pos.y + obj.radius * 0.72, obj.radius * 0.78, obj.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (obj.item.rarity !== 'common') {
        const color = RARITY_COLOR[obj.item.rarity];
        const glow = ctx.createRadialGradient(
          obj.pos.x, obj.pos.y, obj.radius * 0.2,
          obj.pos.x, obj.pos.y, obj.radius * 1.45,
        );
        glow.addColorStop(0, `${color}66`);
        glow.addColorStop(1, `${color}00`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(obj.pos.x, obj.pos.y, obj.radius * 1.45, 0, Math.PI * 2);
        ctx.fill();
      }

      // Objects already tugged toward the magnet get a progress ring.
      if (obj.pulsesReceived > 0) {
        ctx.save();
        ctx.strokeStyle = '#7dd3fc';
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(obj.pos.x, obj.pos.y, obj.radius * 1.15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.4);
        ctx.stroke();
        ctx.restore();
      }

      drawSpriteFit(ctx, img, obj.pos.x, obj.pos.y, obj.radius * 2.05);
    }
  }

  private drawAim(run: RunManager, aim: AimState): void {
    if (!aim.active || !run.canShoot()) return;
    const ctx = this.ctx;
    const points: Vec2[] = run.predictTrajectory(aim.dirX, aim.dirY, aim.power01);
    if (points.length === 0) return;

    ctx.save();
    for (let i = 0; i < points.length - 1; i++) {
      const t = i / points.length;
      ctx.globalAlpha = 0.9 * (1 - t * 0.72);
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, 4.2 - t * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Landing marker with the attraction radius it will sweep.
    const end = points[points.length - 1];
    const range = run.attractionRangePx();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(end.x, end.y, range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(end.x, end.y, run.magnet.radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawMagnet(run: RunManager, aim: AimState): void {
    const ctx = this.ctx;
    const m = run.magnet;
    const ready = run.canShoot();

    // Ground shadow.
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#04060f';
    ctx.beginPath();
    ctx.ellipse(m.pos.x, m.pos.y + m.radius * 0.78, m.radius * 0.9, m.radius * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Idle beacon: a breathing halo plus the live attraction radius, so the player
    // can always find the magnet on a wide board and knows what it will reach.
    if (ready && !aim.active) {
      const breathe = 0.5 + 0.5 * Math.sin(this.time * 3.2);
      const haloR = m.radius * (1.5 + breathe * 0.35);
      const halo = ctx.createRadialGradient(m.pos.x, m.pos.y, m.radius * 0.4, m.pos.x, m.pos.y, haloR);
      halo.addColorStop(0, 'rgba(255, 92, 92, 0.42)');
      halo.addColorStop(1, 'rgba(255, 92, 92, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(m.pos.x, m.pos.y, haloR, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = 0.3 + breathe * 0.2;
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.arc(m.pos.x, m.pos.y, run.attractionRangePx(), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Motion trail while sliding.
    if (m.isMoving) {
      const speed = Math.hypot(m.vel.x, m.vel.y);
      const len = Math.min(m.radius * 2.4, speed * 0.05);
      const nx = -m.vel.x / (speed || 1);
      const ny = -m.vel.y / (speed || 1);
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = m.radius * 0.9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.pos.x, m.pos.y);
      ctx.lineTo(m.pos.x + nx * len, m.pos.y + ny * len);
      ctx.stroke();
      ctx.restore();
    }

    // Loot rides on the rim, drawn under the magnet body so the player silhouette
    // stays readable while the clump around it grows.
    for (const c of m.carried) {
      const x = m.pos.x + c.offset.x;
      const y = m.pos.y + c.offset.y;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#04060f';
      ctx.beginPath();
      ctx.ellipse(x, y + m.radius * 0.3, m.radius * 0.38, m.radius * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawSpriteFit(ctx, loadImage(c.sprite), x, y, m.radius * 0.9);
    }

    let spriteKey: keyof typeof MAGNET_SPRITES = 'idle';
    if (m.isMoving) spriteKey = 'moving';
    else if (aim.active) spriteKey = 'active';

    drawSpriteFit(ctx, loadImage(MAGNET_SPRITES[spriteKey]), m.pos.x, m.pos.y, m.radius * 2.5);
  }

  private drawPulses(dt: number): void {
    const ctx = this.ctx;
    this.pulses = this.pulses.filter((p) => p.age < PULSE_LIFETIME);
    for (const p of this.pulses) {
      p.age += dt;
      const t = Math.min(1, p.age / PULSE_LIFETIME);
      const eased = 1 - Math.pow(1 - t, 2);
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 4 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * eased, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (1 - t) * 0.35;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * eased * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  draw(run: RunManager, aim: AimState, dt: number): void {
    this.time += dt;
    this.drawFloor(run);
    this.drawBoardObjects(run);
    this.drawAim(run, aim);
    this.drawMagnet(run, aim);
    this.drawPulses(dt);
    this.drawFrame(run);
  }
}
