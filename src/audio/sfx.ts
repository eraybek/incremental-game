import { ZZFX, zzfx } from 'zzfx';

/**
 * ZzFX parameter order (only the ones we use are named here):
 *   volume, randomness, frequency, attack, sustain, release, shape, shapeCurve,
 *   slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation,
 *   bitCrush, delay, sustainVolume, decay, tremolo
 *
 * Shapes: 0 sine · 1 triangle · 2 sawtooth · 3 tan · 4 noise
 *
 * Everything is tuned around a scrapyard: metal on metal, a coil discharge for
 * the launch, a shift horn. Retune by editing the arrays — nothing else in the
 * game reads these numbers.
 */
const BANK = {
  /** Magnet leaves the hand: a coil discharge sweeping down. */
  launch: [1.1, 0.05, 340, 0.01, 0.05, 0.2, 2, 1.6, -7, 0, 0, 0, 0, 0.7, 0, 0, 0.03, 0.7, 0.05],
  /** Steel hitting the bay wall. */
  bounce: [0.9, 0.1, 150, 0.01, 0, 0.09, 3, 1.4, 0, 0, 0, 0, 0, 4.5, 0, 0.1, 0, 0.6, 0.02],
  /** A piece of scrap snapping onto the magnet. Pitched up per combo step. */
  collect: [0.7, 0.06, 620, 0.01, 0.02, 0.09, 1, 1.9, 0, 0, 0, 0, 0, 0.4, 0, 0, 0, 0.6, 0.02],
  /** Something genuinely valuable. */
  collectRare: [0.9, 0.05, 1180, 0, 0.05, 0.22, 1, 1.8, 0, 0, 620, 0.05, 0, 0, 0, 0, 0.05, 0.7, 0.06],
  /** Factory horn opening the shift. */
  shiftStart: [0.8, 0.02, 110, 0.05, 0.38, 0.35, 2, 0.4, 0, 0, 0, 0, 0.12, 0.2, 0, 0, 0.1, 0.9, 0.25],
  /** Cash register at the end of the shift. */
  shiftEnd: [0.9, 0.04, 830, 0, 0.09, 0.3, 1, 1.7, 0, 0, 420, 0.06, 0.08, 0, 0, 0, 0.06, 0.8, 0.1],
  /** Upgrade bought. */
  upgrade: [0.9, 0.03, 480, 0, 0.05, 0.3, 1, 1.9, 0, 0, 560, 0.03, 0.03, 0, 0, 0, 0.05, 0.8, 0.08],
  /** Any button. */
  click: [0.5, 0.02, 900, 0, 0.01, 0.04, 1, 2.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.01],
  /** Clock about to run out. */
  warn: [0.6, 0.02, 420, 0, 0.03, 0.1, 1, 1.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0.03],
} satisfies Record<string, number[]>;

export type SfxName = keyof typeof BANK;

/** Ceiling for the user-facing volume slider, so 100% is loud but not harsh. */
const MASTER_VOLUME = 0.4;

let enabled = true;
let volume = 0.8;
let unlocked = false;

function applyVolume(): void {
  ZZFX.volume = enabled ? MASTER_VOLUME * volume : 0;
}

/** Consecutive pickups raise the pitch, then decay back — the standard trick
 *  that makes a stream of collections feel like a run rather than a list. */
let combo = 0;
let comboExpiresAt = 0;
const COMBO_WINDOW_MS = 900;
const COMBO_MAX = 12;

/**
 * Browsers start the audio context suspended until a real user gesture, so the
 * first touch anywhere resumes it. Called once at boot.
 */
export function initAudio(startEnabled: boolean, startVolume = 0.8): void {
  enabled = startEnabled;
  volume = Math.min(1, Math.max(0, startVolume));
  applyVolume();

  const unlock = (): void => {
    if (unlocked) return;
    unlocked = true;
    void ZZFX.audioContext.resume();
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
  };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
}

export function setAudioEnabled(on: boolean): void {
  enabled = on;
  applyVolume();
}

export function setSfxVolume(v: number): void {
  volume = Math.min(1, Math.max(0, v));
  applyVolume();
}

export function isAudioEnabled(): boolean {
  return enabled;
}

/** `pitch` multiplies the base frequency; 1 leaves the preset alone. */
export function playSfx(name: SfxName, pitch = 1): void {
  if (!enabled) return;
  const params = BANK[name].slice();
  if (pitch !== 1) params[2] *= pitch;
  try {
    zzfx(...params);
  } catch {
    // A blocked or closed audio context must never break the game loop.
  }
}

/** Pickup sound whose pitch climbs while the player keeps collecting. */
export function playCollect(rare: boolean): void {
  const now = performance.now();
  combo = now < comboExpiresAt ? Math.min(combo + 1, COMBO_MAX) : 0;
  comboExpiresAt = now + COMBO_WINDOW_MS;
  playSfx(rare ? 'collectRare' : 'collect', Math.pow(1.06, combo));
}

export function resetCombo(): void {
  combo = 0;
  comboExpiresAt = 0;
}
