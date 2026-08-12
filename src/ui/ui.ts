import type { PayoutResult, RunManager } from '../game/run';
import type { ItemDef, PersistentState } from '../game/types';
import {
  ITEMS,
  MILESTONES,
  UI_SPRITES,
  UPGRADES,
  upgradeCost,
} from '../game/content';
import { buyUpgrade, canAfford } from '../game/state';
import { button, el, img, show } from './dom';

/** Every distinct thing the player can be looking at. `playing` is the only one
 *  with no full-screen panel over the arena. */
export type ScreenName =
  | 'menu'
  | 'intro'
  | 'playing'
  | 'result'
  | 'upgrades'
  | 'collection'
  | 'settings';

function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `0:${s.toString().padStart(2, '0')}`;
}

export interface UiRoots {
  /** Absolute overlay that hosts the full-screen panels. */
  overlay: HTMLElement;
  /** Solid bar above the arena. */
  top: HTMLElement;
  /** Solid bar below the arena. */
  bottom: HTMLElement;
}

export class Ui {
  private root: HTMLElement;
  private topBar: HTMLElement;
  private bottomBar: HTMLElement;
  private run: RunManager;
  private state: PersistentState;

  private screens = new Map<ScreenName, HTMLElement>();
  private current: ScreenName = 'menu';

  private coinLabel!: HTMLElement;
  private timeLabel!: HTMLElement;
  private timePill!: HTMLElement;
  private shotsPips!: HTMLElement;
  private pipCount = -1;
  private loadLabel!: HTMLElement;
  private haulStrip!: HTMLElement;
  private haulCount = -1;

  private introTitle!: HTMLElement;
  private menuStart!: HTMLElement;
  private menuStats!: HTMLElement;
  private resultTitle!: HTMLElement;
  private resultTable!: HTMLElement;
  private resultTotal!: HTMLElement;
  private resultNote!: HTMLElement;
  private upgradeList!: HTMLElement;
  private upgradeCoins!: HTMLElement;
  private collectionGrid!: HTMLElement;
  private collectionCount!: HTMLElement;

  /** Where Geliştirme / Koleksiyon / Ayarlar should return to. */
  private returnTo: ScreenName = 'menu';

  onStartShift?: () => void;
  onBackToMenu?: () => void;
  onResetProgress?: () => void;
  onFinishShift?: () => void;

  constructor(roots: UiRoots, run: RunManager, state: PersistentState) {
    this.root = roots.overlay;
    this.topBar = roots.top;
    this.bottomBar = roots.bottom;
    this.run = run;
    this.state = state;

    this.buildBars();
    this.buildMenu();
    this.buildIntro();
    this.buildResult();
    this.buildUpgrades();
    this.buildCollection();
    this.buildSettings();

    this.setScreen('menu');
  }

  // ---------------------------------------------------------------- screens

  private panel(name: ScreenName, extraClass = ''): HTMLElement {
    const panel = el('div', `screen ${extraClass}`.trim());
    this.screens.set(name, panel);
    this.root.appendChild(panel);
    return panel;
  }

  setScreen(name: ScreenName): void {
    this.current = name;
    for (const [key, node] of this.screens) show(node, key === name);

    // The bars keep their space in every screen so the arena never changes
    // size mid-flow; only their contents come and go.
    const playing = name === 'playing';
    this.topBar.classList.toggle('bar-idle', !playing);
    this.bottomBar.classList.toggle('bar-idle', !playing);

    if (name === 'menu') this.refreshMenu();
    if (name === 'upgrades') this.renderUpgrades();
    if (name === 'collection') this.renderCollection();
  }

  get screen(): ScreenName {
    return this.current;
  }

  /** Opens a sub-screen, remembering where to come back to. */
  private openSub(name: ScreenName): void {
    if (this.current !== name) this.returnTo = this.current;
    this.setScreen(name);
  }

  private closeSub(): void {
    this.setScreen(this.returnTo);
  }

  // ------------------------------------------------------------------- bars

  private statPill(icon: string): { pill: HTMLElement; label: HTMLElement } {
    const pill = el('div', 'stat-pill');
    const label = el('span');
    pill.append(img(icon), label);
    return { pill, label };
  }

  private buildBars(): void {
    // Top: money on the left, the two things under pressure dead centre and
    // oversized, settings on the right.
    const coin = this.statPill(UI_SPRITES.coin);
    this.coinLabel = coin.label;
    const topLeft = el('div', 'bar-group');
    topLeft.append(coin.pill);

    this.timePill = el('div', 'gauge timer');
    this.timeLabel = el('span', 'gauge-value');
    this.timePill.append(img(UI_SPRITES.hourglass), this.timeLabel);

    this.shotsPips = el('div', 'pips');
    const shotGauge = el('div', 'gauge');
    shotGauge.append(img(UI_SPRITES.lightning), this.shotsPips);

    const topCentre = el('div', 'bar-group centre');
    topCentre.append(this.timePill, shotGauge);

    const settingsBtn = button('', 'icon-btn square', () => this.openSub('settings'), UI_SPRITES.settings);
    settingsBtn.title = 'Ayarlar';
    const topRight = el('div', 'bar-group end');
    topRight.append(settingsBtn);

    this.topBar.append(topLeft, topCentre, topRight);

    // Bottom: carried weight and the haul, then the finish button on the right.
    const load = this.statPill(UI_SPRITES.magnet);
    this.loadLabel = load.label;
    this.haulStrip = el('div', 'haul-strip');

    const bottomLeft = el('div', 'bar-group grow');
    bottomLeft.append(load.pill, this.haulStrip);

    const finishBtn = button('Vardiyayı Bitir', 'icon-btn finish', () => this.onFinishShift?.(), UI_SPRITES.play);
    const bottomRight = el('div', 'bar-group');
    bottomRight.append(finishBtn);

    this.bottomBar.append(bottomLeft, bottomRight);
  }

  /** The bottom bar sits outside the arena, so the whole haul can be listed;
   *  it scrolls sideways rather than growing over the playfield. */
  private renderHaul(): void {
    const counts = new Map<string, { item: ItemDef; count: number }>();
    for (const carried of this.run.magnet.carried) {
      const item = ITEM_INDEX.get(carried.itemId);
      if (!item) continue;
      const entry = counts.get(item.id);
      if (entry) entry.count += 1;
      else counts.set(item.id, { item, count: 1 });
    }

    this.haulStrip.innerHTML = '';
    for (const { item, count } of counts.values()) {
      const chip = el('div', `haul-chip rarity-${item.rarity}`);
      chip.title = item.name;
      chip.appendChild(img(item.sprite));
      if (count > 1) chip.appendChild(el('span', 'haul-count', `${count}`));
      this.haulStrip.appendChild(chip);
    }
  }

  // ------------------------------------------------------------------- menu

  private buildMenu(): void {
    const panel = this.panel('menu', 'screen-center');

    const logo = el('div', 'logo');
    logo.innerHTML = 'MAGNET <span>INCREMENTAL</span>';

    const tagline = el(
      'div',
      'tagline',
      'Hurdalıkta bir vardiya. Mıknatısı çekip bırak, alanına giren metali topla, vardiya sonunda hepsini paraya çevir.',
    );

    this.menuStats = el('div', 'menu-stats');

    this.menuStart = button('VARDİYAYA BAŞLA', 'big-btn', () => this.onStartShift?.());

    const row = el('div', 'btn-row');
    row.append(
      button('Geliştirme', 'ghost-btn', () => this.openSub('upgrades'), UI_SPRITES.upgrade),
      button('Koleksiyon', 'ghost-btn', () => this.openSub('collection'), UI_SPRITES.collection),
      button('Ayarlar', 'ghost-btn', () => this.openSub('settings'), UI_SPRITES.settings),
    );

    panel.append(logo, tagline, this.menuStats, this.menuStart, row);
  }

  private refreshMenu(): void {
    const next = this.run.currentShift;
    this.menuStart.querySelector('span')!.textContent =
      this.state.shiftsDone === 0 ? 'VARDİYAYA BAŞLA' : `VARDİYA ${next}'E BAŞLA`;
    this.menuStats.innerHTML = '';
    this.menuStats.append(
      el('span', undefined, `${this.state.coins} para`),
      el('span', undefined, `${this.state.shiftsDone} vardiya`),
      el('span', undefined, `${this.state.discovered.length}/${ITEMS.length} koleksiyon`),
    );
  }

  // ------------------------------------------------------------------ intro

  /** Sits over the arena rather than blacking it out, so the player sees the
   *  empty bay and where the magnet landed before the scrap drops in. */
  private buildIntro(): void {
    const panel = this.panel('intro', 'screen-center screen-scrim');
    this.introTitle = el('div', 'intro-title');
    panel.append(el('div', 'intro-kicker', 'HURDALIK'), this.introTitle);
  }

  showIntro(shift: number): void {
    this.introTitle.textContent = `VARDİYA ${shift}`;
    this.setScreen('intro');
  }

  // ----------------------------------------------------------------- result

  private buildResult(): void {
    const panel = this.panel('result');
    const sheet = el('div', 'sheet report');

    const head = el('div', 'sheet-head');
    this.resultTitle = el('h2');
    const settingsBtn = button('', 'icon-btn square', () => this.openSub('settings'), UI_SPRITES.settings);
    settingsBtn.title = 'Ayarlar';
    head.append(this.resultTitle, settingsBtn);

    this.resultNote = el('div', 'sheet-note');
    this.resultTable = el('div', 'result-table');

    this.resultTotal = el('div', 'result-total');

    const actions = el('div', 'btn-row wide');
    actions.append(
      button('Geliştirme', 'big-btn alt', () => this.openSub('upgrades'), UI_SPRITES.upgrade),
      button('Yeni Vardiya', 'big-btn', () => this.onStartShift?.(), UI_SPRITES.play),
    );

    sheet.append(head, this.resultNote, this.resultTable, this.resultTotal, actions);
    panel.appendChild(sheet);
  }

  showResult(payout: PayoutResult): void {
    this.resultTitle.textContent = `Vardiya ${payout.shift} tamamlandı`;
    this.resultNote.textContent =
      payout.itemCount === 0
        ? 'Bu vardiyada hiçbir şey toplayamadın.'
        : `${payout.itemCount} parça hurda${payout.newCount > 0 ? ` · ${payout.newCount} yeni keşif` : ''}`;

    this.resultTable.innerHTML = '';
    for (const line of payout.lines) {
      const row = el('div', 'result-row');
      const icon = el('div', `result-icon rarity-${line.item.rarity}`);
      icon.appendChild(img(line.item.sprite));

      const name = el('div', 'result-name');
      name.appendChild(el('span', undefined, line.item.name));
      if (line.isNew) name.appendChild(el('span', 'new-tag', 'YENİ'));

      row.append(
        icon,
        name,
        el('div', 'result-count', `×${line.count}`),
        el('div', 'result-unit', `${line.unitValue} /adet`),
        el('div', 'result-sum', `${line.total}`),
      );
      this.resultTable.appendChild(row);
    }

    this.resultTotal.innerHTML = '';
    this.resultTotal.append(
      el('span', 'result-total-label', 'Toplam kazanç'),
      img(UI_SPRITES.coin),
      el('span', 'result-total-value', `${payout.total}`),
    );

    this.setScreen('result');
  }

  // --------------------------------------------------------------- upgrades

  private buildUpgrades(): void {
    const panel = this.panel('upgrades');
    const sheet = el('div', 'sheet');

    const head = el('div', 'sheet-head');
    head.append(
      button('Geri', 'ghost-btn', () => this.closeSub(), UI_SPRITES.back),
      el('h2', undefined, 'Geliştirmeler'),
    );
    this.upgradeCoins = el('div', 'coin-badge');
    head.appendChild(this.upgradeCoins);

    this.upgradeList = el('div', 'upgrade-list');

    const milestoneTitle = el('div', 'section-title', 'Kilitli — ileride skill tree ile açılacak');
    const milestoneList = el('div', 'milestone-list');
    for (const m of MILESTONES) {
      const row = el('div', 'milestone-row');
      const info = el('div');
      info.append(el('div', 'milestone-name', m.name), el('div', 'milestone-desc', m.description));
      row.append(img(m.icon), info);
      milestoneList.appendChild(row);
    }

    sheet.append(head, this.upgradeList, milestoneTitle, milestoneList);
    panel.appendChild(sheet);
  }

  private renderUpgrades(): void {
    this.upgradeCoins.innerHTML = '';
    this.upgradeCoins.append(img(UI_SPRITES.coin), el('span', undefined, `${this.state.coins}`));

    this.upgradeList.innerHTML = '';
    for (const def of UPGRADES) {
      const level = this.state.upgrades[def.id];
      const maxed = level >= def.maxLevel;

      const row = el('div', 'upgrade-row');
      const info = el('div', 'upgrade-info');
      const nameRow = el('div', 'name');
      nameRow.append(
        el('span', undefined, def.name),
        el('span', undefined, maxed ? 'MAX' : `Lv.${level}`),
      );
      const bar = el('div', 'upgrade-bar');
      const fill = el('div');
      fill.style.width = `${Math.min(100, (level / def.maxLevel) * 100)}%`;
      bar.appendChild(fill);
      info.append(nameRow, el('div', 'desc', def.description), bar);

      const buy = el('button', 'buy-btn');
      buy.disabled = maxed || !canAfford(this.state, def.id);
      buy.textContent = maxed ? 'MAX' : `${upgradeCost(def, level)}`;
      buy.addEventListener('click', () => {
        if (buyUpgrade(this.state, def.id)) this.renderUpgrades();
      });

      row.append(img(def.icon), info, buy);
      this.upgradeList.appendChild(row);
    }
  }

  // ------------------------------------------------------------- collection

  private buildCollection(): void {
    const panel = this.panel('collection');
    const sheet = el('div', 'sheet');

    const head = el('div', 'sheet-head');
    head.append(
      button('Geri', 'ghost-btn', () => this.closeSub(), UI_SPRITES.back),
      el('h2', undefined, 'Koleksiyon'),
    );
    this.collectionCount = el('div', 'coin-badge');
    head.appendChild(this.collectionCount);

    this.collectionGrid = el('div', 'collection-grid');
    sheet.append(head, this.collectionGrid);
    panel.appendChild(sheet);
  }

  private renderCollection(): void {
    const found = new Set(this.state.discovered);
    this.collectionCount.textContent = `${found.size} / ${ITEMS.length}`;

    this.collectionGrid.innerHTML = '';
    for (const item of ITEMS) {
      const has = found.has(item.id);
      const slot = el('div', `collection-slot${has ? ` rarity-${item.rarity}` : ' locked'}`);
      slot.title = has ? `${item.name} · ${item.value}` : '???';
      slot.appendChild(img(item.sprite));
      this.collectionGrid.appendChild(slot);
    }
  }

  // --------------------------------------------------------------- settings

  private buildSettings(): void {
    const panel = this.panel('settings');
    const sheet = el('div', 'sheet narrow');

    const head = el('div', 'sheet-head');
    head.append(
      button('Geri', 'ghost-btn', () => this.closeSub(), UI_SPRITES.back),
      el('h2', undefined, 'Ayarlar'),
    );

    const list = el('div', 'settings-list');
    list.append(
      button('Ana Menüye Dön', 'big-btn alt', () => this.onBackToMenu?.()),
      button('İlerlemeyi Sıfırla', 'danger-btn', () => this.confirmReset()),
    );

    const note = el(
      'div',
      'settings-note',
      'İlerleme bu cihazın tarayıcısında saklanır. Sıfırlarsan para, geliştirmeler ve koleksiyon silinir.',
    );

    sheet.append(head, list, note);
    panel.appendChild(sheet);
  }

  private confirmReset(): void {
    if (window.confirm('Tüm ilerleme silinecek. Emin misin?')) {
      this.onResetProgress?.();
    }
  }

  // ------------------------------------------------------------------- tick

  tick(): void {
    if (this.current !== 'playing') return;

    this.coinLabel.textContent = `${this.state.coins}`;
    this.renderShots();

    const t = this.run.timeRemaining;
    this.timeLabel.textContent = fmtTime(t);
    this.timePill.classList.toggle('warn', t <= 5 && t > 3);
    this.timePill.classList.toggle('critical', t <= 3);

    const load = this.run.magnet.load;
    this.loadLabel.textContent = load > 0 ? `${load} (-${Math.round(this.run.loadPenalty() * 100)}%)` : '0';

    if (this.run.magnet.carried.length !== this.haulCount) {
      this.haulCount = this.run.magnet.carried.length;
      this.renderHaul();
    }
  }

  /** Pips beat "2/5" for reading at a glance mid-shot. */
  private renderShots(): void {
    if (this.pipCount !== this.run.totalShots) {
      this.pipCount = this.run.totalShots;
      this.shotsPips.innerHTML = '';
      for (let i = 0; i < this.run.totalShots; i++) {
        this.shotsPips.appendChild(el('i'));
      }
    }
    const pips = this.shotsPips.children;
    for (let i = 0; i < pips.length; i++) {
      pips[i].classList.toggle('spent', i >= this.run.shotsRemaining);
    }
  }

  /** Called when a shift starts so the strip does not carry over stale loot. */
  resetHaul(): void {
    this.haulCount = -1;
    this.pipCount = -1;
    this.renderHaul();
  }
}

const ITEM_INDEX = new Map(ITEMS.map((i) => [i.id, i]));

