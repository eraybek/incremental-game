import { loadImage } from './assets';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
  width: number;
}

/** A collected piece flying into the magnet before it disappears. */
interface Absorb {
  sprite: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

interface FloatText {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
}

const DRAG = 2.6;
const ABSORB_TIME = 0.2;

/**
 * Short-lived visual feedback: sparks, expanding rings, floating values and
 * screen shake. Purely cosmetic — nothing here feeds back into the simulation.
 */
export class Fx {
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private texts: FloatText[] = [];
  private absorbs: Absorb[] = [];
  private shakeAmount = 0;
  private shakeX = 0;
  private shakeY = 0;

  clear(): void {
    this.particles.length = 0;
    this.rings.length = 0;
    this.texts.length = 0;
    this.absorbs.length = 0;
    this.shakeAmount = 0;
  }

  /** Sends a collected sprite flying into the magnet instead of letting it
   *  vanish on the spot, so a pickup reads as being taken rather than deleted. */
  absorb(sprite: string, x: number, y: number, size: number): void {
    this.absorbs.push({ sprite, x, y, life: ABSORB_TIME, maxLife: ABSORB_TIME, size });
  }

  burst(x: number, y: number, color: string, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.65);
      const life = 0.25 + Math.random() * 0.3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life,
        maxLife: life,
        size: 1.5 + Math.random() * 2.2,
        color,
      });
    }
  }

  /** Directional spray, used where something struck a surface. */
  spray(x: number, y: number, dirX: number, dirY: number, color: string, count: number, speed: number): void {
    const base = Math.atan2(dirY, dirX);
    for (let i = 0; i < count; i++) {
      const angle = base + (Math.random() - 0.5) * 1.6;
      const v = speed * (0.35 + Math.random() * 0.65);
      const life = 0.2 + Math.random() * 0.25;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life,
        maxLife: life,
        size: 1.4 + Math.random() * 1.8,
        color,
      });
    }
  }

  ring(x: number, y: number, radius: number, color: string, width = 3, duration = 0.35): void {
    this.rings.push({ x, y, radius, life: duration, maxLife: duration, color, width });
  }

  floatText(x: number, y: number, text: string, color: string): void {
    this.texts.push({ x, y, life: 0.85, maxLife: 0.85, text, color });
  }

  shake(amount: number): void {
    this.shakeAmount = Math.min(14, this.shakeAmount + amount);
  }

  get offsetX(): number {
    return this.shakeX;
  }

  get offsetY(): number {
    return this.shakeY;
  }

  /** `targetX/Y` is the magnet: absorbed pieces chase it even while it moves. */
  update(dt: number, targetX: number, targetY: number): void {
    for (let i = this.absorbs.length - 1; i >= 0; i--) {
      const a = this.absorbs[i];
      a.life -= dt;
      if (a.life <= 0) {
        this.absorbs.splice(i, 1);
        continue;
      }
      // Ease-in: hesitates, then snaps the last stretch.
      const t = 1 - a.life / a.maxLife;
      const k = Math.min(1, t * t * 2.2 + dt * 6);
      a.x += (targetX - a.x) * k;
      a.y += (targetY - a.y) * k;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const drag = Math.max(0, 1 - DRAG * dt);
      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].life -= dt;
      if (this.rings[i].life <= 0) this.rings.splice(i, 1);
    }

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.texts.splice(i, 1);
        continue;
      }
      t.y -= 34 * dt;
    }

    // Decay the shake and resample the offset so it reads as a rattle.
    this.shakeAmount = Math.max(0, this.shakeAmount - this.shakeAmount * 9 * dt - 0.6 * dt);
    this.shakeX = (Math.random() * 2 - 1) * this.shakeAmount;
    this.shakeY = (Math.random() * 2 - 1) * this.shakeAmount;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const a of this.absorbs) {
      const t = 1 - a.life / a.maxLife;
      const img = loadImage(a.sprite);
      if (!img.complete || img.naturalWidth === 0) continue;
      const scale = (a.size * (1 - t * 0.55)) / Math.max(img.naturalWidth, img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.save();
      ctx.globalAlpha = 1 - t * 0.85;
      ctx.drawImage(img, a.x - w / 2, a.y - h / 2, w, h);
      ctx.restore();
    }

    for (const r of this.rings) {
      const t = 1 - r.life / r.maxLife;
      const eased = 1 - Math.pow(1 - t, 3);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - t) + 0.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * eased, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.texts.length > 0) {
      ctx.save();
      ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(4, 7, 18, 0.85)';
      for (const t of this.texts) {
        const k = t.life / t.maxLife;
        ctx.globalAlpha = Math.min(1, k * 1.8);
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.restore();
    }
  }
}
