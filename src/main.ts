import './style.css';
import { RARITY_LABEL } from './game/content';
import { fmt, fmtKg } from './game/format';
import { Game, clamp } from './game/state';
import type { Rod } from './game/types';
import { SceneView } from './render/scene';
import { Hud } from './ui/hud';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const floats = document.getElementById('floats') as HTMLElement;
const stage = document.getElementById('stage') as HTMLElement;

/** Nisan durumu; sahne ve giris katmani arasinda paylasilir. */
const aim = { active: false, x: 0, depth: 0, progress: 0, pointerId: -1 };

const scene = new SceneView(canvas, floats);

const game = new Game({
  onCast: () => {},
  onBite: (rod) => {
    scene.spawnFloatAtRod(rod, '!', 'float-bite');
  },
  onEmpty: (rod) => {
    scene.spawnFloatAtRod(rod, 'boş', 'float-empty');
  },
  onLand: (e) => {
    const s = e.hooked.species;
    if (s.kind === 'junk' && !s.treasure) {
      scene.spawnFloatAtRod(e.rod, `${s.name}`, 'float-junk');
      hud.toast(`${s.name} topladın — deniz biraz daha temiz`, 'toast-junk');
    } else {
      const label = e.perfect ? `+${fmt(e.money)} ×2` : `+${fmt(e.money)}`;
      scene.spawnFloatAtRod(e.rod, label, e.perfect ? 'float-perfect' : 'float-money');
    }
    if (e.firstTime && s.kind === 'fish') {
      hud.toast(`Yeni tür: ${s.name} (${RARITY_LABEL[s.rarity]})`, 'toast-new');
    } else if (e.record && e.hooked.huge) {
      hud.toast(`DEV ${s.name} — ${fmtKg(e.hooked.kg)}`, 'toast-huge');
    }
  },
  onReward: (label) => {
    hud.toast(`Temiz Deniz ödülü: ${label}`, 'toast-reward');
  },
});

const hud = new Hud(game);

// --- Giris ----------------------------------------------------------------

/**
 * Dokunus once isirma penceresini kontrol eder: yakinda isiran bir samandira
 * varsa dokunus "cekme" sayilir, yoksa yeni bir nisan baslatir.
 */
function onPointerDown(ev: PointerEvent): void {
  if (ev.button !== undefined && ev.button !== 0) return;
  const biting = scene.nearestBiting(game, ev.clientX, ev.clientY);
  if (biting) {
    game.strike(biting);
    scene.spawnFloatAtRod(biting, 'ÇEK!', 'float-perfect');
    return;
  }
  if (!game.hasIdleRod()) return;
  const point = scene.pointerToAim(ev.clientX, ev.clientY);
  if (point.depth <= 0) return;
  aim.active = true;
  aim.pointerId = ev.pointerId;
  aim.progress = 0;
  aim.x = point.x;
  aim.depth = clamp(point.depth, 0, game.maxDepth);
  stage.setPointerCapture?.(ev.pointerId);
}

function onPointerMove(ev: PointerEvent): void {
  if (!aim.active || ev.pointerId !== aim.pointerId) return;
  const point = scene.pointerToAim(ev.clientX, ev.clientY);
  aim.x = point.x;
  aim.depth = clamp(point.depth, 0, game.maxDepth);
}

function onPointerUp(ev: PointerEvent): void {
  if (!aim.active || ev.pointerId !== aim.pointerId) return;
  // Nisan dolmadan birakildiysa atis yapilmaz; halka soner.
  aim.active = false;
  aim.pointerId = -1;
}

stage.addEventListener('pointerdown', onPointerDown);
stage.addEventListener('pointermove', onPointerMove);
stage.addEventListener('pointerup', onPointerUp);
stage.addEventListener('pointercancel', onPointerUp);
// Uzun basma menusu ve kaydirma jesti oyunu bolmesin.
stage.addEventListener('contextmenu', (e) => e.preventDefault());
stage.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

window.addEventListener('resize', () => scene.resize());
window.addEventListener('orientationchange', () => setTimeout(() => scene.resize(), 120));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.save();
});

// --- Dongu ----------------------------------------------------------------

let last = performance.now();
let castsSoFar = 0;

function tick(now: number): void {
  // Sekme arka plandayken biriken zaman oyunu sicratmasin.
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (aim.active) {
    aim.progress += dt / game.chargeTime;
    if (aim.progress >= 1) {
      // Nisan doldu: olta kendiliginden atilir.
      const rod = game.castAt(aim.x, aim.depth);
      aim.active = false;
      aim.pointerId = -1;
      aim.progress = 0;
      if (rod) onCastFeedback(rod);
    }
  }

  game.update(dt);
  scene.render(game, dt, aim);
  hud.update();
  requestAnimationFrame(tick);
}

/** Ilk atislarda kisa yonlendirme; oyuncu isi kaptiginda susar. */
function onCastFeedback(_rod: Rod): void {
  castsSoFar++;
  if (castsSoFar === 1) {
    hud.setHint('Şamandıra battığında dokun — çift para');
  } else if (castsSoFar === 4) {
    hud.setHint(null);
  }
}

scene.init().then(() => {
  scene.resize();
  hud.setHint('Suya basılı tut, nişan al');
  requestAnimationFrame((t) => {
    last = t;
    tick(t);
  });
});
