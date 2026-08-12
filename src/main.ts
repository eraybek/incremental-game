import './style.css';
import { RunManager } from './game/run';
import { Scene, type AimState } from './render/scene';
import { Hud } from './ui/hud';
import { loadState } from './game/state';
import { ITEMS, UPGRADES, MILESTONES } from './game/content';
import { preload } from './render/assets';

const wrap = document.getElementById('canvas-wrap') as HTMLElement;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;

const persistent = loadState();
const run = new RunManager(persistent);
const scene = new Scene(canvas);
const hud = new Hud(uiRoot, run, persistent);

const assetPaths = [
  ...ITEMS.map((i) => i.sprite),
  ...UPGRADES.map((u) => u.icon),
  ...MILESTONES.map((m) => m.icon),
  '/assets/hud/icon_coin.png',
  '/assets/hud/icon_hourglass.png',
  '/assets/hud/icon_magnet_small.png',
  '/assets/hud/icon_target.png',
  '/assets/hud/icon_lightning.png',
  '/assets/buttons/btn_r2c1.png',
  '/assets/buttons/btn_r2c2.png',
  '/assets/buttons/btn_r2c4.png',
  '/assets/buttons/btn_r4c2.png',
  '/assets/buttons/btn_r4c3.png',
  '/assets/environment/tile_r2c1.png',
];
void preload(assetPaths);

function resize(): void {
  const rect = wrap.getBoundingClientRect();
  const w = Math.max(280, Math.round(rect.width));
  const h = Math.max(400, Math.round(rect.height));
  scene.resize(w, h);
  run.setArenaSize(w, h);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

const aim: AimState = { active: false, dirX: 0, dirY: -1, power01: 0 };
let activePointerId: number | null = null;
const MAX_PULL_FRACTION = 0.42;

function pointerToLocal(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function updateAimFromPoint(px: number, py: number): void {
  const mx = run.magnet.pos.x;
  const my = run.magnet.pos.y;
  let dx = mx - px;
  let dy = my - py;
  const dist = Math.hypot(dx, dy);
  const maxPull = run.arenaW * MAX_PULL_FRACTION;
  if (dist < 1) {
    dx = 0;
    dy = -1;
  } else {
    dx /= dist;
    dy /= dist;
  }
  aim.dirX = dx;
  aim.dirY = dy;
  aim.power01 = Math.min(1, dist / maxPull);
}

canvas.addEventListener('pointerdown', (e) => {
  if (!run.canShoot()) return;
  activePointerId = e.pointerId;
  aim.active = true;
  const p = pointerToLocal(e);
  updateAimFromPoint(p.x, p.y);
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!aim.active || e.pointerId !== activePointerId) return;
  const p = pointerToLocal(e);
  updateAimFromPoint(p.x, p.y);
});

function endAim(e: PointerEvent): void {
  if (!aim.active || e.pointerId !== activePointerId) return;
  aim.active = false;
  activePointerId = null;
  run.tryLaunch(aim.dirX, aim.dirY, aim.power01);
}

canvas.addEventListener('pointerup', endAim);
canvas.addEventListener('pointercancel', endAim);

run.onPulse = (p) => scene.addPulseFx(p.x, p.y, p.radius);
run.onRunEnd = (payout) => {
  hud.showPayout(payout);
  hud.setPlayButtonMode(true);
};

hud.onRequestStart = () => {
  hud.hideStartScreen();
  run.startRun();
  hud.setPlayButtonMode(true);
};

hud.showStartScreenIfIdle();

let lastTime = performance.now();
function loop(now: number): void {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  run.update(dt);
  scene.draw(run, aim, dt);
  hud.tick();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
