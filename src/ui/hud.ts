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
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export class Hud {
  private root: HTMLElement;
  private run: RunManager;
  private state: PersistentState;

  private coinLabel!: HTMLElement;
  private timeLabel!: HTMLElement;
  private shotsLabel!: HTMLElement;
  private timePill!: HTMLElement;
  private playBtn!: HTMLButtonElement;

  private startScreen!: HTMLElement;
  private upgradeOverlay!: HTMLElement;
  private collectionOverlay!: HTMLElement;
  private payoutOverlay!: HTMLElement;
  private upgradeList!: HTMLElement;
  private collectionGrid!: HTMLElement;
  private payoutList!: HTMLElement;
  private payoutTotal!: HTMLElement;
  private payoutNewCount!: HTMLElement;

  onRequestStart?: () => void;

  constructor(root: HTMLElement, run: RunManager, state: PersistentState) {
    this.root = root;
    this.run = run;
    this.state = state;
    this.buildTopBar();
    this.buildBottomBar();
    this.buildStartScreen();
    this.buildUpgradeModal();
    this.buildCollectionModal();
    this.buildPayoutModal();
    this.refreshTop();
  }

  private buildTopBar(): void {
    const bar = el('div', 'hud-top');

    const coinPill = el('div', 'stat-pill');
    const coinImg = el('img');
    coinImg.src = '/assets/hud/icon_coin.png';
    this.coinLabel = el('span');
    coinPill.append(coinImg, this.coinLabel);

    this.timePill = el('div', 'stat-pill');
    const timeImg = el('img');
    timeImg.src = '/assets/hud/icon_hourglass.png';
    this.timeLabel = el('span');
    this.timePill.append(timeImg, this.timeLabel);

    const shotsPill = el('div', 'stat-pill');
    const shotsImg = el('img');
    shotsImg.src = '/assets/hud/icon_magnet_small.png';
    this.shotsLabel = el('span');
    shotsPill.append(shotsImg, this.shotsLabel);

    bar.append(coinPill, this.timePill, shotsPill);
    this.root.appendChild(bar);
  }

  private buildBottomBar(): void {
    const bar = el('div', 'hud-bottom');

    const collectionBtn = el('button', 'btn btn-purple');
    const cImg = el('img');
    cImg.src = '/assets/buttons/btn_r4c3.png';
    collectionBtn.append(cImg, document.createTextNode('Koleksiyon'));
    collectionBtn.addEventListener('click', () => this.openCollection());

    const upgradeBtn = el('button', 'btn btn-amber');
    const uImg = el('img');
    uImg.src = '/assets/buttons/btn_r2c2.png';
    upgradeBtn.append(uImg, document.createTextNode('Yükselt'));
    upgradeBtn.addEventListener('click', () => this.openUpgrades());

    this.playBtn = el('button', 'btn btn-green');
    const pImg = el('img');
    pImg.src = '/assets/buttons/btn_r2c1.png';
    this.playBtn.append(pImg, document.createTextNode('Yeni Tur'));
    this.playBtn.addEventListener('click', () => this.onRequestStart?.());

    bar.append(collectionBtn, upgradeBtn, this.playBtn);
    this.root.appendChild(bar);
  }

  private buildStartScreen(): void {
    this.startScreen = el('div', 'center-screen hidden');
    const logo = el('div', 'logo');
    logo.innerHTML = 'MAGNET <span>INCREMENTAL</span>';
    const tag = el('div', 'tagline');
    tag.textContent =
      'Mıknatısı fırlat, metal objeleri çek, tur sonunda paraya çevir. Süre ve atış hakkın sınırlı — akıllı nişan al!';
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
    this.root.appendChild(overlay);
    return { overlay, body };
  }

  private buildUpgradeModal(): void {
    const { overlay, body } = this.modalShell('Geliştirmeler');
    this.upgradeOverlay = overlay;
    this.upgradeList = el('div');
    const milestoneHeader = el('h2');
    milestoneHeader.textContent = 'Yakında (Kilitli)';
    milestoneHeader.style.fontSize = '14px';
    milestoneHeader.style.marginTop = '14px';
    milestoneHeader.style.color = 'var(--text-dim)';
    const milestoneList = el('div');
    for (const m of MILESTONES) {
      const row = el('div', 'milestone-row');
      const lock = el('img');
      lock.src = '/assets/buttons/btn_r4c2.png';
      const info = el('div');
      const name = el('div');
      name.style.fontWeight = '700';
      name.style.fontSize = '13px';
      name.textContent = m.name;
      const desc = el('div');
      desc.style.fontSize = '11px';
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
      lvlSpan.textContent = `Lv.${level}${maxed ? ' (MAX)' : ''}`;
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
    this.collectionGrid = el('div', 'collection-grid');
    body.appendChild(this.collectionGrid);
  }

  private renderCollection(): void {
    this.collectionGrid.innerHTML = '';
    const discovered = new Set(this.state.discovered);
    for (const item of ITEMS) {
      const found = discovered.has(item.id);
      const slot = el('div', `collection-slot${found ? ` rarity-${item.rarity}` : ' locked'}`);
      const img = el('img');
      img.src = item.sprite;
      slot.appendChild(img);
      this.collectionGrid.appendChild(slot);
    }
  }

  private buildPayoutModal(): void {
    const { overlay, body } = this.modalShell('Tur Tamamlandı');
    this.payoutOverlay = overlay;
    this.payoutTotal = el('div', 'payout-total');
    const coinImg = el('img');
    coinImg.src = '/assets/hud/icon_coin.png';
    const totalSpan = el('span');
    totalSpan.id = 'payout-total-span';
    this.payoutTotal.append(coinImg, totalSpan);

    this.payoutNewCount = el('div');
    this.payoutNewCount.style.fontSize = '13px';
    this.payoutNewCount.style.color = 'var(--accent)';
    this.payoutNewCount.style.marginBottom = '6px';

    this.payoutList = el('div', 'payout-list');

    const continueBtn = el('button', 'big-btn');
    continueBtn.style.width = '100%';
    continueBtn.textContent = 'Devam Et';
    continueBtn.addEventListener('click', () => {
      this.payoutOverlay.classList.add('hidden');
    });

    body.append(this.payoutTotal, this.payoutNewCount, this.payoutList, continueBtn);
  }

  showPayout(payout: PayoutResult): void {
    const span = this.payoutTotal.querySelector('#payout-total-span')!;
    span.textContent = `+${payout.total}`;
    this.payoutNewCount.textContent =
      payout.newDiscoveries.length > 0
        ? `${payout.newDiscoveries.length} yeni obje koleksiyona eklendi!`
        : `${payout.items.length} obje topladın.`;
    this.payoutList.innerHTML = '';
    const newIds = new Set(payout.newDiscoveries.map((i) => i.id));
    for (const item of payout.items) {
      const cell = el('div', 'payout-item');
      cell.style.position = 'relative';
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

  showStartScreenIfIdle(): void {
    if (this.run.phase === 'idle' && this.run.state.totalRuns === 0) {
      this.startScreen.classList.remove('hidden');
    }
  }

  setPlayButtonMode(hasPlayedBefore: boolean): void {
    this.playBtn.lastChild!.textContent = hasPlayedBefore ? 'Yeni Tur' : 'Oyna';
  }

  refreshTop(): void {
    this.coinLabel.textContent = `${this.state.coins}`;
    this.shotsLabel.textContent = `${this.run.shotsRemaining}/${this.run.totalShots}`;
    this.timeLabel.textContent = fmtTime(this.run.phase === 'playing' ? this.run.timeRemaining : BASE_RUN_DURATION);
    this.timePill.style.borderColor = this.run.timeRemaining < 6 && this.run.phase === 'playing' ? 'var(--red)' : '';
  }

  tick(): void {
    this.refreshTop();
  }
}
