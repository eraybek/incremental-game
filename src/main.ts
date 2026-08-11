import './style.css';
import { RARITY_LABEL } from './game/content';
import { fmt, fmtKg } from './game/format';
import { Game, clamp } from './game/state';
import { SceneView } from './render/scene';
import { Hud } from './ui/hud';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const floats = document.getElementById('floats') as HTMLElement;
const stage = document.getElementById('stage') as HTMLElement;

/**
 * Nisan durumu; sahne ve giris katmani arasinda paylasilir.
 * `progress` nisan halkasinin gorunurlugunu surer - atisi tetiklemez.
 */
const aim = { active: false, x: 0, depth: 0, progress: 0, pointerId: -1, held: 0 };

/** Bu sureden uzun basili tutmak "nisan aliyor" sayilir ve halka belirir. */
const HOLD_TO_AIM = 0.16;

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
  // Yalnizca suya yapilan dokunus atis sayilir. HUD dugmeleri sahnenin
  // cocugu oldugu icin, bu kontrol olmadan pointer capture click'i yutuyor.
  if (ev.target !== canvas) return;
  // Panel acikken sahne dokunuslari atisa donusmez.
  if (hud.isPanelOpen) return;
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
  aim.held = 0;
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

/**
 * Atis parmak kalkinca yapilir. Kisa dokunus dogrudan atar; basili tutmak
 * nisan halkasini acar ve parmak kaydirilarak hedef ayarlanir. Iki jest de
 * ayni yerde bitiyor, boylece oyuncu ogrenecek bir sey olmadan oynayabiliyor.
 */
function onPointerUp(ev: PointerEvent): void {
  if (!aim.active || ev.pointerId !== aim.pointerId) return;
  const rod = game.castAt(aim.x, aim.depth);
  aim.active = false;
  aim.pointerId = -1;
  aim.progress = 0;
  if (rod) stage.releasePointerCapture?.(ev.pointerId);
}

/** Dokunus iptal edilirse (sistem jesti vb.) atis yapilmaz. */
function onPointerCancel(ev: PointerEvent): void {
  if (ev.pointerId !== aim.pointerId) return;
  aim.active = false;
  aim.pointerId = -1;
  aim.progress = 0;
}

stage.addEventListener('pointerdown', onPointerDown);
stage.addEventListener('pointermove', onPointerMove);
stage.addEventListener('pointerup', onPointerUp);
stage.addEventListener('pointercancel', onPointerCancel);
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

function tick(now: number): void {
  // Sekme arka plandayken biriken zaman oyunu sicratmasin.
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (aim.active) {
    // Halka yalnizca gorsel geri bildirim: parmak bekledikce belirginlesir.
    aim.held += dt;
    aim.progress = clamp((aim.held - HOLD_TO_AIM) / 0.35, 0, 1);
  }

  game.update(dt);
  scene.render(game, dt, aim);
  hud.update();
  requestAnimationFrame(tick);
}

scene.init().then(() => {
  scene.resize();
  requestAnimationFrame((t) => {
    last = t;
    tick(t);
  });
});
