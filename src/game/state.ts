import type { PersistentState, UpgradeId } from './types';
import { UPGRADES, upgradeCost } from './content';

const STORAGE_KEY = 'magnet-incremental-save-v1';

function emptyUpgrades(): Record<UpgradeId, number> {
  const rec = {} as Record<UpgradeId, number>;
  for (const u of UPGRADES) rec[u.id] = 0;
  return rec;
}

export function createInitialState(): PersistentState {
  return {
    coins: 0,
    upgrades: emptyUpgrades(),
    discovered: [],
    totalRuns: 0,
  };
}

export function loadState(): PersistentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as PersistentState;
    const base = createInitialState();
    return {
      coins: typeof parsed.coins === 'number' ? parsed.coins : base.coins,
      upgrades: { ...base.upgrades, ...(parsed.upgrades ?? {}) },
      discovered: Array.isArray(parsed.discovered) ? parsed.discovered : [],
      totalRuns: typeof parsed.totalRuns === 'number' ? parsed.totalRuns : 0,
    };
  } catch {
    return createInitialState();
  }
}

export function saveState(state: PersistentState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable, ignore
  }
}

export function canAfford(state: PersistentState, id: UpgradeId): boolean {
  const def = UPGRADES.find((u) => u.id === id)!;
  const level = state.upgrades[id];
  if (level >= def.maxLevel) return false;
  return state.coins >= upgradeCost(def, level);
}

export function buyUpgrade(state: PersistentState, id: UpgradeId): boolean {
  const def = UPGRADES.find((u) => u.id === id)!;
  const level = state.upgrades[id];
  if (level >= def.maxLevel) return false;
  const cost = upgradeCost(def, level);
  if (state.coins < cost) return false;
  state.coins -= cost;
  state.upgrades[id] = level + 1;
  saveState(state);
  return true;
}

export function magnetPower(state: PersistentState): number {
  return 3 + state.upgrades.power * 0.8;
}

export function rangeMultiplier(state: PersistentState): number {
  return 1 + state.upgrades.range * 0.1;
}

export function launchMultiplier(state: PersistentState): number {
  return 1 + state.upgrades.launch * 0.11;
}

export function loadEfficiency(state: PersistentState): number {
  return Math.min(0.85, state.upgrades.loadEff * 0.07);
}

export function lootValueMultiplier(state: PersistentState): number {
  return 1 + state.upgrades.lootValue * 0.12;
}

export function lootQualityLevel(state: PersistentState): number {
  return state.upgrades.lootQuality;
}
