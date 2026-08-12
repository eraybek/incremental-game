import type { RunManager } from '../game/run';
import { RARITY_COLOR, SCENE_SPRITES } from '../game/content';
import { loadImage } from './assets';

export interface AimState {
  active: boolean;
  dirX: number;
  dirY: number;
  power01: number;
  /** Where the drag started. The pull is measured from here rather than from
   *  the magnet, so a magnet pinned against a wall can still be aimed at that
   *  wall — there is always room to drag somewhere on screen. */
  anchorX: number;
  anchorY: number;
  /** Where the finger currently is, for drawing the pull band. */
  pointerX: number;
  pointerY: number;
}

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

/** The magnet art has its poles pointing up, so a facing of `angle` needs a
 *  quarter turn added on top. */
function drawSpriteFacing(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  maxSize: number,
  angle: number,
): void {
  if (!img.complete || img.naturalWidth === 0) return;
  const scale = maxSize / Math.max(img.naturalWidth, img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle + Math.PI / 2);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width = 800;
  private height = 420;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;
    loadImage(SCENE_SPRITES.magnet);
    loadImage(SCENE_SPRITES.hazardTile);
  }

  resize(cssWidth: number, cssHeight: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.width = cssWidth;
    this.height = cssHeight;
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Plain navy floor with evenly spaced lines. Deliberately flat: the loot and
   *  the magnet should be the only things competing for attention. */
  private drawFloor(run: RunManager): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#0d1430';
    ctx.fillRect(0, 0, this.width, this.height);

    const rect = run.arenaRect();
    const gap = Math.max(26, run.scaleRef * 0.075);
    ctx.strokeStyle = 'rgba(120, 152, 224, 0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = rect.minY + gap; y < rect.maxY; y += gap) {
      const py = Math.round(y) + 0.5;
      ctx.moveTo(rect.minX, py);
      ctx.lineTo(rect.maxX, py);
    }
    ctx.stroke();
  }

  private drawFrame(run: RunManager): void {
    const ctx = this.ctx;
    const { width: w, height: h } = this;
    const rect = run.arenaRect();
    const f = run.frameSize;

    ctx.fillStyle = '#080c1a';
    ctx.fillRect(0, 0, w, f);
    ctx.fillRect(0, h - f, w, f);
    ctx.fillRect(0, 0, f, h);
    ctx.fillRect(w - f, 0, f, h);

    const hazard = loadImage(SCENE_SPRITES.hazardTile);
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

    ctx.strokeStyle = 'rgba(255, 190, 70, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.minX + 1, rect.minY + 1, rect.maxX - rect.minX - 2, rect.maxY - rect.minY - 2);
  }

  private drawBoardObjects(run: RunManager): void {
    const ctx = this.ctx;
    for (const obj of run.board) {
      if (obj.item.rarity !== 'common') {
        const color = RARITY_COLOR[obj.item.rarity];
        const glow = ctx.createRadialGradient(
          obj.pos.x, obj.pos.y, obj.radius * 0.2,
          obj.pos.x, obj.pos.y, obj.radius * 1.4,
        );
        glow.addColorStop(0, `${color}55`);
        glow.addColorStop(1, `${color}00`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(obj.pos.x, obj.pos.y, obj.radius * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // A tether to the magnet makes it obvious which objects the field has
      // hold of and which are still out of reach.
      if (obj.beingPulled) {
        ctx.save();
        ctx.globalAlpha = 0.34;
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(obj.pos.x, obj.pos.y);
        ctx.lineTo(run.magnet.pos.x, run.magnet.pos.y);
        ctx.stroke();
        ctx.restore();
      }

      drawSpriteFit(ctx, loadImage(obj.item.sprite), obj.pos.x, obj.pos.y, obj.radius * 2.05);
    }
  }

  /** Shows direction and strength of the pull only — never where the magnet
   *  will end up. Reading the bounce is the player's job. */
  private drawAim(run: RunManager, aim: AimState): void {
    if (!aim.active || !run.canShoot()) return;
    const ctx = this.ctx;
    const m = run.magnet.pos;
    const r = run.magnet.radius;

    ctx.save();

    // The gesture, drawn where the finger actually is: a fixed anchor dot and a
    // band out to the current touch point.
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.moveTo(aim.anchorX, aim.anchorY);
    ctx.lineTo(aim.pointerX, aim.pointerY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.arc(aim.anchorX, aim.anchorY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Short launch arrow: length maxes out well before the shot distance does.
    const len = r * (1.1 + aim.power01 * 1.9);
    const tipX = m.x + aim.dirX * len;
    const tipY = m.y + aim.dirY * len;
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(m.x + aim.dirX * r * 0.9, m.y + aim.dirY * r * 0.9);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    const head = r * 0.5;
    const ang = Math.atan2(aim.dirY, aim.dirX);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(tipX + Math.cos(ang) * head, tipY + Math.sin(ang) * head);
    ctx.lineTo(tipX + Math.cos(ang + 2.5) * head, tipY + Math.sin(ang + 2.5) * head);
    ctx.lineTo(tipX + Math.cos(ang - 2.5) * head, tipY + Math.sin(ang - 2.5) * head);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawMagnet(run: RunManager): void {
    const ctx = this.ctx;
    const m = run.magnet;

    // The collection radius: the field is always on, so it is always shown.
    const range = run.attractionRangePx();
    const field = ctx.createRadialGradient(m.pos.x, m.pos.y, range * 0.3, m.pos.x, m.pos.y, range);
    field.addColorStop(0, 'rgba(125, 211, 252, 0.07)');
    field.addColorStop(1, 'rgba(125, 211, 252, 0)');
    ctx.fillStyle = field;
    ctx.beginPath();
    ctx.arc(m.pos.x, m.pos.y, range, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(m.pos.x, m.pos.y, range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // One sprite, one size, always — but it turns so the poles lead the way.
    drawSpriteFacing(ctx, loadImage(SCENE_SPRITES.magnet), m.pos.x, m.pos.y, m.radius * 2.2, m.facing);
  }

  draw(run: RunManager, aim: AimState): void {
    this.drawFloor(run);
    this.drawBoardObjects(run);
    this.drawAim(run, aim);
    this.drawMagnet(run);
    this.drawFrame(run);
  }
}
