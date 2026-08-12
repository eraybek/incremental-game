import type { RunManager, PayoutResult } from '../game/run';
import type { PersistentState } from '../game/types';
import { ITEMS, MILESTONES, UPGRADES, upgradeCost, BASE_RUN_DURATION } from '../game/content';
import { buyUpgrade, canAfford } from '../game/state';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `0:${s.toString().padStart(2, '0')}`;
}

export class Hud {
  private root: HTMLElement;
  private run: RunManager;
  private state: PersistentState;

  private coinLabel!: HTMLElement;
  private timeLabel!: HTMLElement;
  private shotsLabel!: HTMLElement;
  private loadLabel!: HTMLElement;
  private timePill!: HTMLElement;
  private playLabel!: HTMLElement;

  private startScreen!: HTMLElement;
  private upgradeOverlay!: HTMLElement;
  private collectionOverlay!: HTMLElement;
  private payoutOverlay!: HTMLElement;
  private upgradeList!: HTMLElement;
  private collectionGrid!: HTMLElement;
  private collectionCount!: HTMLElement;
  private payoutList!: HTMLElement;
  private payoutTotalValue!: HTMLElement;
  private payoutNote!: HTMLElement;

  onRequestStart?: () => void;

  constructor(root: HTMLElement, run: RunManager, state: PersistentState) {
    this.root = root;
    this.run = run;
    this.state = state;
    this.buildTopBar();
    this.buildStartScreen();
    this.buildUpgradeModal();
    this.buildCollectionModal();
    this.buildPayoutModal();
    this.refreshTop();
  }

  private statPill(icon: string): { pill: HTMLElement; label: HTMLElement } {
    const pill = el('div', 'stat-pill');
    const img = el('img');
    img.src = icon;
    const label = el('span');
    pill.append(img, label);
    return { pill, label };
  }

  private actionButton(icon: string, text: string, primary = false): {
    btn: HTMLButtonElement;
    label: HTMLElement;
  } {
    const btn = el('button', `icon-btn${primary ? ' primary' : ''}`);
    const img = el('img');
    img.src = icon;
    const label = el('span');
    label.textContent = text;
    btn.append(img, label);
    return { btn, label };
  }

  private buildTopBar(): void {
    const bar = el('div', 'hud-top');

    const stats = el('div', 'hud-group');
    const coin = this.statPill('/assets/hud/icon_coin.png');
    this.coinLabel = coin.label;
    const time = this.statPill('/assets/hud/icon_hourglass.png');
    this.timePill = time.pill;
    this.timeLabel = time.label;
    const shots = this.statPill('/assets/hud/icon_target.png');
    this.shotsLabel = shots.label;
    const load = this.statPill('/assets/hud/icon_magnet_small.png');
    this.loadLabel = load.label;
    stats.append(coin.pill, time.pill, shots.pill, load.pill);

    const actions = el('div', 'hud-group actions');
    const collection = this.actionButton('/assets/buttons/btn_r4c3.png', 'Koleksiyon');
    collection.btn.addEventListener('click', () => this.openCollection());
    const upgrade = this.actionButton('/assets/buttons/btn_r2c2.png', 'Yükselt');
    upgrade.btn.addEventListener('click', () => this.openUpgrades());
    const play = this.actionButton('/assets/buttons/btn_r2c1.png', 'Oyna', true);
    this.playLabel = play.label;
    play.btn.addEventListener('click', () => this.onRequestStart?.());
    actions.append(collection.btn, upgrade.btn, play.btn);

    bar.append(stats, actions);
    this.root.appendChild(bar);
  }

  private buildStartScreen(): void {
    this.startScreen = el('div', 'center-screen hidden');
    const logo = el('div', 'logo');
    logo.innerHTML = 'MAGNET <span>INCREMENTAL</span>';
    const tag = el('div', 'tagline');
    tag.textContent =
      'Mıknatısı geri çekip bırak, durduğu yerde metal objeleri kendine çeksin. Ağır objeler tek atışta gelmez — süren ve atış hakkın bitmeden en değerli yığını topla.';
    const btn = el('button', 'big-btn');
    btn.textContent = 'OYNA';
    btn.addEventListener('click', () => this.onRequestStart?.());
    this.startScreen.append(logo, tag, btn);
    this.root.appendChild(this.startScreen);
  }

  private modalShell(title: string): { overlay: HTMLElement; body: HTMLElement } {
    const overlay = el('div', 'overlay hidden');
    const modal = el('div', 'modal');
    const closeBtn = el('button', 'modal-close');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));
    const h2 = el('h2');
    h2.textContent = title;
    const body = el('div');
    modal.append(closeBtn, h2, body);
    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
    this.root.appendChild(overlay);
    return { overlay, body };
  }

  private buildUpgradeModal(): void {
    const { overlay, body } = this.modalShell('Geliştirmeler');
    this.upgradeOverlay = overlay;
    this.upgradeList = el('div', 'upgrade-list');

    const milestoneHeader = el('div', 'section-title');
    milestoneHeader.textContent = 'Yakında (Kilitli)';
    const milestoneList = el('div', 'milestone-list');
    for (const m of MILESTONES) {
      const row = el('div', 'milestone-row');
      const lock = el('img');
      lock.src = m.icon;
      const info = el('div');
      const name = el('div');
      name.style.fontWeight = '700';
      name.style.fontSize = '12px';
      name.textContent = m.name;
      const desc = el('div');
      desc.style.fontSize = '10.5px';
      desc.style.color = 'var(--text-dim)';
      desc.textContent = m.description;
      info.append(name, desc);
      row.append(lock, info);
      milestoneList.appendChild(row);
    }

    body.append(this.upgradeList, milestoneHeader, milestoneList);
    this.renderUpgradeList();
  }

  private renderUpgradeList(): void {
    this.upgradeList.innerHTML = '';
    for (const def of UPGRADES) {
      const level = this.state.upgrades[def.id];
      const maxed = level >= def.maxLevel;
      const row = el('div', 'upgrade-row');
      const img = el('img');
      img.src = def.icon;

      const info = el('div', 'upgrade-info');
      const nameRow = el('div', 'name');
      const nameSpan = el('span');
      nameSpan.textContent = def.name;
      const lvlSpan = el('span');
      lvlSpan.textContent = maxed ? 'MAX' : `Lv.${level}`;
      nameRow.append(nameSpan, lvlSpan);
      const desc = el('div', 'desc');
      desc.textContent = def.description;
      const barWrap = el('div', 'upgrade-bar');
      const barFill = el('div');
      barFill.style.width = `${Math.min(100, (level / def.maxLevel) * 100)}%`;
      barWrap.appendChild(barFill);
      info.append(nameRow, desc, barWrap);

      const buyBtn = el('button', 'buy-btn');
      buyBtn.disabled = maxed || !canAfford(this.state, def.id);
      buyBtn.textContent = maxed ? 'MAX' : `${upgradeCost(def, level)}`;
      buyBtn.addEventListener('click', () => {
        if (buyUpgrade(this.state, def.id)) {
          this.refreshTop();
          this.renderUpgradeList();
        }
      });

      row.append(img, info, buyBtn);
      this.upgradeList.appendChild(row);
    }
  }

  private buildCollectionModal(): void {
    const { overlay, body } = this.modalShell('Koleksiyon');
    this.collectionOverlay = overlay;
    this.collectionCount = el('div', 'section-title');
    this.collectionCount.style.margin = '0 0 8px';
    this.collectionGrid = el('div', 'collection-grid');
    body.append(this.collectionCount, this.collectionGrid);
  }

  private renderCollection(): void {
    this.collectionGrid.innerHTML = '';
    const discovered = new Set(this.state.discovered);
    for (const item of ITEMS) {
      const found = discovered.has(item.id);
      const slot = el('div', `collection-slot${found ? ` rarity-${item.rarity}` : ' locked'}`);
      slot.title = found ? `${item.name} · ${item.value}` : '???';
      const img = el('img');
      img.src = item.sprite;
      slot.appendChild(img);
      this.collectionGrid.appendChild(slot);
    }
    this.collectionCount.textContent = `${discovered.size} / ${ITEMS.length} obje keşfedildi`;
  }

  private buildPayoutModal(): void {
    const { overlay, body } = this.modalShell('Tur Tamamlandı');
    this.payoutOverlay = overlay;

    const total = el('div', 'payout-total');
    const coinImg = el('img');
    coinImg.src = '/assets/hud/icon_coin.png';
    this.payoutTotalValue = el('span');
    total.append(coinImg, this.payoutTotalValue);

    this.payoutNote = el('div');
    this.payoutNote.style.fontSize = '12.5px';
    this.payoutNote.style.color = 'var(--accent)';

    this.payoutList = el('div', 'payout-list');

    const actions = el('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';

    const upgradeBtn = el('button', 'big-btn');
    upgradeBtn.style.flex = '1';
    upgradeBtn.style.background = '#6741d9';
    upgradeBtn.style.boxShadow = '0 4px 0 #452a94';
    upgradeBtn.style.fontSize = '16px';
    upgradeBtn.textContent = 'Yükselt';
    upgradeBtn.addEventListener('click', () => {
      this.payoutOverlay.classList.add('hidden');
      this.openUpgrades();
    });

    const againBtn = el('button', 'big-btn');
    againBtn.style.flex = '1';
    againBtn.style.fontSize = '16px';
    againBtn.textContent = 'Yeni Tur';
    againBtn.addEventListener('click', () => {
      this.payoutOverlay.classList.add('hidden');
      this.onRequestStart?.();
    });

    actions.append(upgradeBtn, againBtn);
    body.append(total, this.payoutNote, this.payoutList, actions);
  }

  showPayout(payout: PayoutResult): void {
    this.payoutTotalValue.textContent = `+${payout.total}`;
    this.payoutNote.textContent =
      payout.newDiscoveries.length > 0
        ? `${payout.items.length} obje · ${payout.newDiscoveries.length} yeni keşif!`
        : `${payout.items.length} obje topladın.`;

    this.payoutList.innerHTML = '';
    const newIds = new Set(payout.newDiscoveries.map((i) => i.id));
    for (const item of payout.items) {
      const cell = el('div', `payout-item rarity-${item.rarity}`);
      const img = el('img');
      img.src = item.sprite;
      cell.appendChild(img);
      if (newIds.has(item.id)) {
        const tag = el('span', 'new-tag');
        tag.textContent = 'YENİ';
        cell.appendChild(tag);
      }
      this.payoutList.appendChild(cell);
    }
    this.payoutOverlay.classList.remove('hidden');
    this.refreshTop();
  }

  openUpgrades(): void {
    this.renderUpgradeList();
    this.upgradeOverlay.classList.remove('hidden');
  }

  openCollection(): void {
    this.renderCollection();
    this.collectionOverlay.classList.remove('hidden');
  }

  hideStartScreen(): void {
    this.startScreen.classList.add('hidden');
  }

  showStartScreenIfNew(): void {
    if (this.state.totalRuns === 0) {
      this.startScreen.classList.remove('hidden');
    }
  }

  refreshTop(): void {
    const playing = this.run.phase === 'playing';
    this.coinLabel.textContent = `${this.state.coins}`;
    this.shotsLabel.textContent = `${this.run.shotsRemaining}/${this.run.totalShots}`;
    this.timeLabel.textContent = fmtTime(playing ? this.run.timeRemaining : BASE_RUN_DURATION);
    this.timePill.classList.toggle('urgent', playing && this.run.timeRemaining < 6);

    const load = this.run.magnet.load;
    this.loadLabel.textContent = load > 0 ? `${load} (-${Math.round(this.run.loadPenalty() * 100)}%)` : '0';

    this.playLabel.textContent = playing ? 'Yeniden' : this.state.totalRuns > 0 ? 'Yeni Tur' : 'Oyna';
  }

  tick(): void {
    this.refreshTop();
  }
}
