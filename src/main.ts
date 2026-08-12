import './style.css';
import { RARITY_LABEL } from './game/content';
import { fmt, fmtKg } from './game/format';
import { Game } from './game/state';
import { SceneView } from './render/scene';
import { Hud } from './ui/hud';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const floats = document.getElementById('floats') as HTMLElement;
const stage = document.getElementById('stage') as HTMLElement;

const scene = new SceneView(canvas, floats);

const game = new Game({
  onCatch: (e) => {
    const s = e.hooked.species;
    if (s.kind === 'junk' && !s.treasure) {
      scene.spawnFloatAtRod(e.rod, s.name, 'float-junk');
      hud.toast(`${s.name} topladın — deniz biraz daha temiz`, 'toast-junk');
    } else {
      const parts = [`+${fmt(e.money)}`];
      if (e.perfect) parts.push('×2');
      scene.spawnFloatAtRod(e.rod, parts.join(' '), e.perfect ? 'float-perfect' : 'float-money');
    }
    if (e.firstTime && s.kind === 'fish') {
      hud.toast(`Yeni tür: ${s.name} (${RARITY_LABEL[s.rarity]})`, 'toast-new');
    } else if (e.record && e.hooked.huge) {
      hud.toast(`DEV ${s.name} — ${fmtKg(e.hooked.kg)}`, 'toast-huge');
    }
  },
  onMiss: (rod) => {
    scene.spawnFloatAtRod(rod, 'boş', 'float-empty');
  },
  onReward: (label) => {
    hud.toast(`Temiz Deniz ödülü: ${label}`, 'toast-reward');
  },
});

const hud = new Hud(game);

if (game.offlineEarned > 0) {
  hud.toast(`Sen yokken oltalar çalıştı: +${fmt(game.offlineEarned)}`, 'toast-reward');
}

// --- Giris ----------------------------------------------------------------

/**
 * Dokunus, o noktaya en yakin bostaki oltayi o derinlige indirir ve odagi ona
 * tasir. Tek dokunus = olta sec (yatay) + derinlik sec (dikey) + birak.
 */
function onPointerDown(ev: PointerEvent): void {
  if (ev.button !== undefined && ev.button !== 0) return;
  if (ev.target !== canvas) return;
  if (hud.isPanelOpen) return;
  const point = scene.pointerToAim(ev.clientX, ev.clientY);
  if (point.depth <= 0) return;
  game.dropAt(point.x, point.depth);
}

stage.addEventListener('pointerdown', onPointerDown);
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
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  scene.render(game, dt);
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
