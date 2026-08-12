import './style.css';
import { RunManager } from './game/run';
import { Scene, type AimState } from './render/scene';
import { Ui } from './ui/ui';
import { loadState, resetProgress } from './game/state';
import { ITEMS, UPGRADES, MILESTONES, UI_SPRITES, SCENE_SPRITES } from './game/content';
import { preload } from './render/assets';
import { RARITY_COLOR } from './game/content';
import { initAudio, playCollect, playSfx, resetCombo } from './audio/sfx';

const wrap = document.getElementById('canvas-wrap') as HTMLElement;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;
const topBar = document.getElementById('topbar') as HTMLElement;
const bottomBar = document.getElementById('bottombar') as HTMLElement;

const persistent = loadState();
const run = new RunManager(persistent);
const scene = new Scene(canvas);
const ui = new Ui({ overlay: uiRoot, top: topBar, bottom: bottomBar }, run, persistent);

initAudio(!persistent.muted, persistent.sfxVolume);

void preload([
  ...ITEMS.map((i) => i.sprite),
  ...UPGRADES.map((u) => u.icon),
  ...MILESTONES.map((m) => m.icon),
  ...Object.values(UI_SPRITES),
  ...Object.values(SCENE_SPRITES),
]);

function resize(): void {
  const rect = wrap.getBoundingClientRect();
  const w = Math.max(320, Math.round(rect.width));
  const h = Math.max(240, Math.round(rect.height));
  scene.resize(w, h);
  run.setCanvasSize(w, h);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
resize();

// ------------------------------------------------------------ shift flow

const INTRO_MS = 1400;
let introTimer: number | undefined;

/** Shows the shift card over an arena holding nothing but the magnet; the scrap
 *  only drops in once the card is gone. */
function openShiftIntro(): void {
  window.clearTimeout(introTimer);
  playSfx('shiftStart');
  scene.fx.clear();
  run.prepareShift();
  ui.resetHaul();
  ui.showIntro(run.currentShift);
  introTimer = window.setTimeout(enterArena, INTRO_MS);
}

function enterArena(): void {
  window.clearTimeout(introTimer);
  if (run.phase === 'playing') return;
  scene.fx.clear();
  resetCombo();
  run.beginShift();
  ui.setScreen('playing');
}

function returnToMenu(): void {
  window.clearTimeout(introTimer);
  run.phase = 'idle';
  run.board = [];
  ui.setScreen('menu');
}

ui.onStartShift = openShiftIntro;
ui.onBackToMenu = returnToMenu;
ui.onResetProgress = () => {
  resetProgress(persistent);
  returnToMenu();
};

// ------------------------------------------------------------- game feel

run.onLaunch = () => {
  scene.punch(1);
  playSfx('launch');
};

run.onBounce = (x, y, vx, vy, speed01) => {
  const len = Math.hypot(vx, vy) || 1;
  scene.fx.spray(x, y, vx / len, vy / len, '#ffd166', 6 + Math.round(speed01 * 8), 190 * (0.4 + speed01));
  scene.fx.shake(2 + speed01 * 7);
  scene.punch(0.5 * speed01);
  playSfx('bounce', 0.85 + speed01 * 0.5);
};

ui.onParticlesChanged = (on) => {
  if (!on) scene.fx.clear();
};

run.onCollect = (item, x, y, value) => {
  const color = RARITY_COLOR[item.rarity];
  const rare = item.rarity !== 'common';
  if (persistent.haptics) navigator.vibrate?.(rare ? 28 : 10);
  if (!persistent.particles) {
    playCollect(rare);
    ui.pulseHaul();
    return;
  }
  scene.fx.ring(x, y, run.magnet.radius * 1.9, color, rare ? 4 : 2.5);
  scene.fx.burst(x, y, color, rare ? 14 : 7, rare ? 210 : 140);
  scene.fx.floatText(x, y - run.magnet.radius * 0.6, `+${value}`, rare ? color : '#ffd166');
  if (rare) scene.fx.shake(3);
  playCollect(rare);
  ui.pulseHaul();
};

run.onRunEnd = (payout) => {
  resetCombo();
  playSfx('shiftEnd');
  ui.showResult(payout);
};

ui.onFinishShift = () => run.finishShift();

// Tapping through the intro skips the remaining wait.
uiRoot.addEventListener('pointerdown', (e) => {
  if (ui.screen !== 'intro') return;
  e.preventDefault();
  enterArena();
});

// ----------------------------------------------------------------- input

const aim: AimState = {
  active: false,
  dirX: 0,
  dirY: -1,
  power01: 0,
  anchorX: 0,
  anchorY: 0,
  pointerX: 0,
  pointerY: 0,
};
let activePointerId: number | null = null;
/** Full-power pull distance, measured against the short axis so the gesture is
 *  the same length regardless of how wide the window is. */
const PULL_FRACTION = 0.55;

function pointerToLocal(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function updateAimFromPoint(px: number, py: number): void {
  aim.pointerX = px;
  aim.pointerY = py;

  // Measured from the drag anchor, not the magnet: dragging away from where you
  // touched down aims the opposite way, and that works even when the magnet is
  // jammed into a corner with no room behind it.
  const dx = aim.anchorX - px;
  const dy = aim.anchorY - py;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) {
    aim.power01 = 0;
    return;
  }

  aim.dirX = dx / dist;
  aim.dirY = dy / dist;
  aim.power01 = Math.min(1, dist / (run.scaleRef * PULL_FRACTION));
  // Turn the magnet in place while aiming so its poles lead the shot.
  run.magnet.facing = Math.atan2(aim.dirY, aim.dirX);
}

canvas.addEventListener('pointerdown', (e) => {
  if (ui.screen !== 'playing' || !run.canShoot()) return;
  activePointerId = e.pointerId;
  aim.active = true;
  const p = pointerToLocal(e);
  aim.anchorX = p.x;
  aim.anchorY = p.y;
  aim.power01 = 0;
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

// ------------------------------------------------------------------ loop

let lastWarnSecond = -1;
let lastTime = performance.now();
function loop(now: number): void {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (ui.screen === 'playing') {
    run.update(dt);
    const whole = Math.ceil(run.timeRemaining);
    if (run.phase === 'playing' && whole <= 3 && whole > 0 && whole !== lastWarnSecond) {
      lastWarnSecond = whole;
      playSfx('warn', 1 + (3 - whole) * 0.12);
    } else if (whole > 3) {
      lastWarnSecond = -1;
    }
  }
  scene.draw(run, aim, dt);
  ui.tick();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
