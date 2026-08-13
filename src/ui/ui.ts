import type { PayoutResult, RunManager } from '../game/run';
import type { ItemDef, PersistentState, Rarity } from '../game/types';
import {
  ITEMS,
  MILESTONES,
  RARITY_COLOR,
  RARITY_GEM,
  UI_SPRITES,
  UPGRADES,
  upgradeCost,
} from '../game/content';
import {
  COLLECTION_BONUS_PER_ITEM,
  buyUpgrade,
  canAfford,
  collectionBonus,
  magnetPower,
  saveState,
  shiftDuration,
  shiftShots,
} from '../game/state';
import { ZONES, isZoneUnlocked, nextZone } from '../game/zones';
import { isAudioEnabled, playSfx, setAudioEnabled, setSfxVolume } from '../audio/sfx';
import { button as rawButton, el, img, show } from './dom';

/** Every button in the UI ticks. */
function button(
  label: string,
  className: string,
  onClick: () => void,
  iconSrc?: string,
): HTMLButtonElement {
  return rawButton(
    label,
    className,
    () => {
      playSfx('click');
      onClick();
    },
    iconSrc,
  );
}

/** Full-screen states. `playing` is the only one with no panel over the arena. */
export type ScreenName = 'menu' | 'intro' | 'playing' | 'result' | 'hub';

/** Sections inside the hub, reachable from each other without backing out. */
export type HubTab = 'upgrades' | 'collection' | 'settings';

type RarityFilter = Rarity | 'all' | 'epic' | 'legendary';

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Sıradan',
  uncommon: 'Az Bulunur',
  rare: 'Nadir',
  epic: 'Epik',
  legendary: 'Efsanevi',
};

const FILTERS: Array<{ id: RarityFilter; label: string; locked?: boolean }> = [
  { id: 'all', label: 'Tümü' },
  { id: 'common', label: 'Sıradan' },
  { id: 'uncommon', label: 'Az Bulunur' },
  { id: 'rare', label: 'Nadir' },
  { id: 'epic', label: 'Epik' },
  { id: 'legendary', label: 'Efsanevi' },
];

/** Thousands separator, so a five-figure balance is still readable at a glance. */
function fmtCoins(n: number): string {
  return n.toLocaleString('tr-TR');
}

function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `0:${s.toString().padStart(2, '0')}`;
}

export interface UiRoots {
  overlay: HTMLElement;
  top: HTMLElement;
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

  // arena bars
  private coinLabel!: HTMLElement;
  private timeLabel!: HTMLElement;
  private timePill!: HTMLElement;
  private shotsPips!: HTMLElement;
  private pipCount = -1;
  private loadLabel!: HTMLElement;
  private haulStrip!: HTMLElement;
  private haulCount = -1;

  // menu
  private menuStart!: HTMLButtonElement;
  private menuStats!: HTMLElement;
  private menuCoins!: HTMLElement;
  private zoneCard!: HTMLElement;
  private zoneStrip!: HTMLElement;

  // intro
  private introTitle!: HTMLElement;

  // result
  private resultTitle!: HTMLElement;
  private resultPile!: HTMLElement;
  private resultSummary!: HTMLElement;
  private resultTable!: HTMLElement;

  // hub
  private hubTitle!: HTMLElement;
  private hubCoins!: HTMLElement;
  private hubPanels = new Map<HubTab, HTMLElement>();
  private hubTabButtons = new Map<HubTab, HTMLButtonElement>();

  private upgradeList!: HTMLElement;
  private collectionGrid!: HTMLElement;
  private collectionCount!: HTMLElement;
  private collectionDetail!: HTMLElement;
  private collectionFilters!: HTMLElement;
  private collectionBonusCard!: HTMLElement;
  private activeFilter: RarityFilter = 'all';
  private selectedItemId: string | null = null;
  private soundBtn!: HTMLButtonElement;
  private volumeSlider!: HTMLInputElement;

  /** Where the hub's back button returns to. */
  private returnTo: ScreenName = 'menu';

  onStartShift?: () => void;
  onBackToMenu?: () => void;
  onResetProgress?: () => void;
  onFinishShift?: () => void;
  onParticlesChanged?: (on: boolean) => void;

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
    this.buildHub();

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
  }

  get screen(): ScreenName {
    return this.current;
  }

  /** Opens the hub on a tab, remembering where to come back to. */
  openHub(tab: HubTab): void {
    if (this.current !== 'hub') this.returnTo = this.current;
    this.setHubTab(tab);
    this.setScreen('hub');
  }

  private setHubTab(tab: HubTab): void {
    for (const [key, node] of this.hubPanels) show(node, key === tab);
    for (const [key, btn] of this.hubTabButtons) btn.classList.toggle('active', key === tab);

    this.hubTitle.textContent =
      tab === 'upgrades' ? 'Geliştirmeler' : tab === 'collection' ? 'Koleksiyon' : 'Ayarlar';
    show(this.hubCoins, tab !== 'settings');

    if (tab === 'upgrades') this.renderUpgrades();
    if (tab === 'collection') this.renderCollection();
  }

  // ------------------------------------------------------------------- bars

  private statPill(icon: string): { pill: HTMLElement; label: HTMLElement } {
    const pill = el('div', 'stat-pill');
    const label = el('span');
    pill.append(img(icon), label);
    return { pill, label };
  }

  private buildBars(): void {
    const coin = this.statPill(UI_SPRITES.coin);
    this.coinLabel = coin.label;
    const topLeft = el('div', 'bar-group');
    topLeft.append(coin.pill);

    this.timePill = el('div', 'gauge timer');
    this.timeLabel = el('span', 'gauge-value');
    this.timePill.append(this.timeLabel);

    this.shotsPips = el('div', 'pips');
    const shotGauge = el('div', 'gauge');
    shotGauge.append(img(UI_SPRITES.charge), this.shotsPips);

    const topCentre = el('div', 'bar-group centre');
    topCentre.append(this.timePill, shotGauge);

    const settingsBtn = button('', 'icon-btn square', () => this.openHub('settings'), UI_SPRITES.settings);
    settingsBtn.title = 'Ayarlar';
    const topRight = el('div', 'bar-group end');
    topRight.append(settingsBtn);

    this.topBar.append(topLeft, topCentre, topRight);

    const load = this.statPill(UI_SPRITES.magnet);
    this.loadLabel = load.label;
    this.haulStrip = el('div', 'haul-strip');

    const finishBtn = button('Vardiyayı Bitir', 'icon-btn finish', () => this.onFinishShift?.(), UI_SPRITES.play);
    const main = el('div', 'bar-main');
    main.append(load.pill, finishBtn);

    this.bottomBar.append(main, this.haulStrip);
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

  pulseHaul(): void {
    this.haulStrip.classList.remove('pulse');
    void this.haulStrip.offsetWidth;
    this.haulStrip.classList.add('pulse');
  }

  // ------------------------------------------------------------------- menu

  /**
   * The menu is the game's shop window: it has to answer "where am I, how
   * strong am I, and what can I press" before anything else. So it leads with
   * the zone card — the thing that says the shift has a destination — then the
   * four stats an upgrade actually moves, then the play button.
   */
  private buildMenu(): void {
    const panel = this.panel('menu', 'menu-screen');

    const topBar = el('div', 'menu-top');
    this.menuCoins = el('div', 'coin-pill');
    const settingsBtn = button('', 'round-btn', () => this.openHub('settings'), UI_SPRITES.settings);
    settingsBtn.title = 'Ayarlar';
    topBar.append(this.menuCoins, settingsBtn);

    // Zone card: name, quota bar and the zone's own accent stripe.
    this.zoneCard = el('div', 'zone-card');
    // A cleared zone stays open, so the strip is a switcher rather than a
    // one-way door — an early zone is still the fastest place to farm a
    // missing common item for the collection.
    this.zoneStrip = el('div', 'zone-strip');

    this.menuStats = el('div', 'stat-rows');

    this.menuStart = button('OYNA', 'play-btn', () => this.onStartShift?.());

    const tiles = el('div', 'menu-tiles');
    tiles.append(
      this.menuTile('Geliştirmeler', 'tile-upgrades', UI_SPRITES.upgrade, () =>
        this.openHub('upgrades'),
      ),
      this.menuTile('Koleksiyon', 'tile-collection', UI_SPRITES.collection, () =>
        this.openHub('collection'),
      ),
    );

    panel.append(topBar, this.zoneCard, this.zoneStrip, this.menuStats, this.menuStart, tiles);
  }

  private menuTile(
    label: string,
    tone: string,
    icon: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const tile = button(label, `menu-tile ${tone}`, onClick, icon);
    return tile;
  }

  /** One "label ......... value" line, the shape the stat block uses. */
  private statRow(icon: string | null, label: string, value: string): HTMLElement {
    const row = el('div', 'stat-row');
    if (icon) row.appendChild(img(icon));
    else row.classList.add('no-icon');
    row.append(el('span', 'stat-row-label', label), el('strong', 'stat-row-value', value));
    return row;
  }

  private refreshMenu(): void {
    this.menuCoins.innerHTML = '';
    this.menuCoins.append(img(UI_SPRITES.coin), el('span', undefined, fmtCoins(this.state.coins)));

    const zone = this.run.zone;
    const banked = this.state.zoneProgress[zone.id] ?? 0;
    const cleared = zone.quota === null || banked >= zone.quota;
    const next = nextZone(zone.id);

    this.zoneCard.innerHTML = '';
    this.zoneCard.style.setProperty('--zone-accent', zone.accent);

    const head = el('div', 'zone-head');
    head.append(
      el('div', 'zone-name', zone.name),
      el('div', 'zone-shift', `Vardiya ${this.run.currentShift}`),
    );

    const bar = el('div', 'zone-bar');
    const fill = el('div', 'zone-bar-fill');
    fill.style.width = zone.quota === null ? '100%' : `${Math.min(100, (banked / zone.quota) * 100)}%`;
    bar.appendChild(fill);

    // The line under the bar is the only place that says why the bar matters,
    // so it names what clearing the quota actually opens.
    const note = cleared
      ? next
        ? `Tamamlandı — ${next.name} açıldı`
        : zone.subtitle
      : `${fmtCoins(banked)} / ${fmtCoins(zone.quota!)} — ${next ? `${next.name} açılır` : 'hedef'}`;

    this.zoneCard.append(head, el('div', 'zone-sub', zone.subtitle), bar, el('div', 'zone-note', note));

    this.zoneStrip.innerHTML = '';
    for (const z of ZONES) {
      const unlocked = isZoneUnlocked(z.id, this.state.zoneProgress);
      const chip = button(
        unlocked ? z.name : '???',
        `zone-chip${z.id === zone.id ? ' active' : ''}${unlocked ? '' : ' locked'}`,
        () => {
          if (!unlocked || z.id === this.state.zone) return;
          this.state.zone = z.id;
          saveState(this.state);
          this.refreshMenu();
        },
        unlocked ? undefined : UI_SPRITES.lock,
      );
      chip.style.setProperty('--zone-accent', z.accent);
      chip.disabled = !unlocked;
      this.zoneStrip.appendChild(chip);
    }

    this.menuStats.innerHTML = '';
    this.menuStats.append(
      this.statRow(null, 'Vardiya süresi', `${shiftDuration(this.state)} sn`),
      this.statRow(UI_SPRITES.charge, 'Atış hakkı', `${shiftShots(this.state)}`),
      this.statRow(UI_SPRITES.magnet, 'Mıknatıs gücü', magnetPower(this.state).toFixed(1)),
      this.statRow(
        UI_SPRITES.collection,
        'Koleksiyon',
        `${this.state.discovered.length}/${ITEMS.length}`,
      ),
    );
  }

  // ------------------------------------------------------------------ intro

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
    const settingsBtn = button('', 'icon-btn square', () => this.openHub('settings'), UI_SPRITES.settings);
    settingsBtn.title = 'Ayarlar';
    head.append(this.resultTitle, settingsBtn);

    // Left: the haul as a pile. Right: the numbers that matter.
    this.resultPile = el('div', 'result-pile');
    this.resultSummary = el('div', 'result-summary');
    const top = el('div', 'result-top');
    top.append(this.resultPile, this.resultSummary);

    this.resultTable = el('div', 'result-table');
    const tableWrap = el('details', 'result-details');
    const summaryToggle = el('summary', undefined, 'Parça dökümü');
    tableWrap.append(summaryToggle, this.resultTable);

    // The primary action gets its own full-width row; the two side trips share
    // the row below it, so nothing wraps mid-label on a narrow screen.
    const actions = el('div', 'result-actions');
    actions.append(
      button('Yeni Vardiya', 'big-btn primary-action', () => this.onStartShift?.(), UI_SPRITES.play),
      button('Geliştirmeler', 'big-btn alt', () => this.openHub('upgrades'), UI_SPRITES.upgrade),
      button('Koleksiyon', 'big-btn info', () => this.openHub('collection'), UI_SPRITES.collection),
    );

    sheet.append(head, top, tableWrap, actions);
    panel.appendChild(sheet);
  }

  private summaryRow(
    icon: string | null,
    label: string,
    value: string,
    tone: 'normal' | 'accent' | 'rare' = 'normal',
  ): HTMLElement {
    const row = el('div', `summary-row ${tone}`);
    if (icon) row.appendChild(img(icon));
    else row.classList.add('no-icon');
    row.append(el('span', 'summary-label', label), el('strong', 'summary-value', value));
    return row;
  }

  showResult(payout: PayoutResult): void {
    this.resultTitle.textContent = `Vardiya ${payout.shift} tamamlandı`;

    // Pile: one sprite per collected piece, scattered in a phyllotaxis spiral
    // so a big haul reads as a heap rather than a list.
    this.resultPile.innerHTML = '';
    const pieces: ItemDef[] = [];
    for (const line of payout.lines) {
      for (let i = 0; i < line.count; i++) pieces.push(line.item);
    }
    if (pieces.length === 0) {
      this.resultPile.appendChild(el('div', 'pile-empty', 'Eli boş döndün'));
    } else {
      pieces.slice(0, 26).forEach((item, i) => {
        const node = img(item.sprite, 'pile-item');
        const angle = i * 2.399963;
        const radius = 6 + Math.sqrt(i) * 15;
        node.style.left = `calc(50% + ${Math.cos(angle) * radius}px)`;
        node.style.top = `calc(50% + ${Math.sin(angle) * radius * 0.72}px)`;
        node.style.setProperty('--i', `${i}`);
        if (item.rarity !== 'common') {
          node.style.filter = `drop-shadow(0 0 6px ${RARITY_COLOR[item.rarity]})`;
        }
        this.resultPile.appendChild(node);
      });
    }

    this.resultSummary.innerHTML = '';
    this.resultSummary.append(
      this.summaryRow(UI_SPRITES.magnet, 'Toplanan parça', `${payout.itemCount}`),
      this.summaryRow(
        UI_SPRITES.collection,
        'Nadir bonusu',
        payout.rareBonus > 0 ? `+${payout.rareBonus}` : '—',
        payout.rareBonus > 0 ? 'rare' : 'normal',
      ),
      this.summaryRow(null, 'Kalan süre', fmtTime(payout.timeLeft)),
      this.summaryRow(UI_SPRITES.charge, 'Kalan atış', `${payout.shotsLeft}`),
    );

    const totalRow = this.summaryRow(UI_SPRITES.coin, 'Toplam kazanç', '0', 'accent');
    totalRow.classList.add('total');
    this.resultSummary.appendChild(totalRow);
    this.countUp(totalRow.querySelector('.summary-value')!, payout.total);

    if (payout.newCount > 0) {
      this.resultSummary.appendChild(
        el('div', 'discovery-note', `${payout.newCount} yeni parça koleksiyona eklendi`),
      );
    }

    this.resultTable.innerHTML = '';
    let index = 0;
    for (const line of payout.lines) {
      const row = el('div', 'result-row');
      row.style.setProperty('--i', `${index++}`);
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

    this.setScreen('result');
  }

  /** Tallies the payout up instead of dropping the final number in. */
  private countUp(node: HTMLElement, target: number): void {
    if (target <= 0) {
      node.textContent = '0';
      return;
    }
    const duration = 650;
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = `${Math.round(target * eased)}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // -------------------------------------------------------------------- hub

  private buildHub(): void {
    const panel = this.panel('hub', 'screen-full');
    const shell = el('div', 'hub');

    const head = el('div', 'hub-head');
    const back = button('', 'icon-btn square back', () => this.setScreen(this.returnTo), UI_SPRITES.back);
    back.title = 'Geri';
    this.hubTitle = el('h2');
    this.hubCoins = el('div', 'coin-badge');
    head.append(back, this.hubTitle, this.hubCoins);

    const body = el('div', 'hub-body');
    this.hubPanels.set('upgrades', this.buildUpgradesPanel());
    this.hubPanels.set('collection', this.buildCollectionPanel());
    this.hubPanels.set('settings', this.buildSettingsPanel());
    for (const node of this.hubPanels.values()) body.appendChild(node);

    const tabs = el('div', 'hub-tabs');
    const defs: Array<[HubTab, string, string]> = [
      ['upgrades', 'Geliştirmeler', UI_SPRITES.upgrade],
      ['collection', 'Koleksiyon', UI_SPRITES.collection],
      ['settings', 'Ayarlar', UI_SPRITES.settings],
    ];
    for (const [id, label, icon] of defs) {
      const btn = button(label, 'hub-tab', () => this.setHubTab(id), icon);
      this.hubTabButtons.set(id, btn);
      tabs.appendChild(btn);
    }

    shell.append(head, body, tabs);
    panel.appendChild(shell);
  }

  // --------------------------------------------------------------- upgrades

  private buildUpgradesPanel(): HTMLElement {
    const panel = el('div', 'hub-panel scroll-panel');
    this.upgradeList = el('div', 'upgrade-list');

    const milestoneList = el('div', 'milestone-list');
    for (const m of MILESTONES) {
      const row = el('div', 'milestone-row');
      const info = el('div');
      info.append(el('div', 'milestone-name', m.name), el('div', 'milestone-desc', m.description));
      if (m.icon) row.appendChild(img(m.icon));
      row.appendChild(info);
      milestoneList.appendChild(row);
    }

    const locked = el('details', 'locked-block');
    locked.append(
      el('summary', undefined, 'Kilitli özellikler — ileride skill tree ile açılacak'),
      milestoneList,
    );

    panel.append(this.upgradeList, locked);
    return panel;
  }

  private renderUpgrades(): void {
    this.hubCoins.innerHTML = '';
    this.hubCoins.append(img(UI_SPRITES.coin), el('span', undefined, `${this.state.coins}`));

    this.upgradeList.innerHTML = '';
    for (const def of UPGRADES) {
      const level = this.state.upgrades[def.id];
      const maxed = level >= def.maxLevel;
      const affordable = canAfford(this.state, def.id);
      const cost = upgradeCost(def, level);

      const card = el('div', `upgrade-card${maxed ? ' maxed' : affordable ? ' affordable' : ''}`);

      const head = el('div', 'upgrade-head');
      const iconWrap = el('div', 'upgrade-icon');
      if (def.icon) iconWrap.appendChild(img(def.icon));
      else iconWrap.classList.add('empty');
      const titles = el('div', 'upgrade-titles');
      titles.append(
        el('div', 'upgrade-name', def.name),
        el('div', 'upgrade-level', maxed ? 'MAX' : `Seviye ${level}`),
      );
      head.append(iconWrap, titles);

      // The number that actually decides the purchase: what changes if I buy.
      const effect = el('div', 'upgrade-effect');
      effect.append(el('span', 'effect-now', def.valueAt(level)));
      if (!maxed) {
        effect.append(el('span', 'effect-arrow', '→'), el('span', 'effect-next', def.valueAt(level + 1)));
      }
      effect.append(el('span', 'effect-unit', def.unit));

      const buy = el('button', 'buy-btn');
      buy.disabled = maxed || !affordable;
      if (maxed) {
        buy.textContent = 'MAX';
      } else {
        buy.append(img(UI_SPRITES.coin), el('span', undefined, `${cost}`));
      }
      buy.addEventListener('click', () => {
        if (buyUpgrade(this.state, def.id)) {
          playSfx('upgrade');
          this.renderUpgrades();
        } else {
          playSfx('click');
        }
      });

      const foot = el('div', 'upgrade-foot');
      foot.append(effect, buy);

      // Level progress reads as a hairline under the header rather than its own row.
      const bar = el('div', 'upgrade-bar');
      const fill = el('div');
      fill.style.width = `${Math.min(100, (level / def.maxLevel) * 100)}%`;
      bar.appendChild(fill);

      card.append(head, bar, el('div', 'upgrade-desc', def.description), foot);
      this.upgradeList.appendChild(card);
    }
  }

  // ------------------------------------------------------------- collection

  private buildCollectionPanel(): HTMLElement {
    const panel = el('div', 'hub-panel collection-panel');

    this.collectionFilters = el('div', 'filter-row');
    for (const f of FILTERS) {
      // Each chip carries its tier's colour, so the filter row doubles as the
      // rarity legend the grid's dots are read against.
      const btn = button(f.label, `filter-chip f-${f.id}${f.locked ? ' locked' : ''}`, () => {
        if (f.locked) return;
        this.activeFilter = f.id;
        this.renderCollection();
      });
      btn.dataset.filter = f.id;
      if (f.locked) {
        btn.disabled = true;
        btn.title = 'Bu katman henüz açılmadı';
      }
      this.collectionFilters.appendChild(btn);
    }

    this.collectionCount = el('div', 'collection-count');
    this.collectionGrid = el('div', 'collection-grid');
    this.collectionDetail = el('div', 'collection-detail');

    // Filters and the detail bar stay put; only the grid between them scrolls,
    // so the controls never scroll out of reach on a short screen.
    const head = el('div', 'collection-head');
    head.append(this.collectionFilters, this.collectionCount);
    const scroll = el('div', 'collection-scroll');
    scroll.appendChild(this.collectionGrid);

    this.collectionBonusCard = el('div', 'collection-bonus');

    panel.append(head, scroll, this.collectionDetail, this.collectionBonusCard);
    return panel;
  }

  private renderCollection(): void {
    this.hubCoins.innerHTML = '';
    this.hubCoins.append(img(UI_SPRITES.coin), el('span', undefined, `${this.state.coins}`));

    const found = new Set(this.state.discovered);
    const visible =
      this.activeFilter === 'all'
        ? ITEMS
        : ITEMS.filter((i) => i.rarity === this.activeFilter);

    const foundHere = visible.filter((i) => found.has(i.id)).length;
    this.collectionCount.textContent = `${foundHere} / ${visible.length} keşfedildi`;

    for (const btn of this.collectionFilters.children) {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.filter === this.activeFilter);
    }

    this.collectionGrid.innerHTML = '';
    for (const item of visible) {
      const has = found.has(item.id);
      const slot = el('div', `collection-slot${has ? ` rarity-${item.rarity}` : ' locked'}`);
      slot.appendChild(img(item.sprite));
      // The frame already carries the tier, but grey-on-blue is nearly
      // invisible at this size, so the corner dot states it outright.
      const dot = el('span', 'slot-dot');
      dot.style.background = RARITY_COLOR[item.rarity];
      slot.appendChild(dot);
      if (!has) slot.appendChild(el('span', 'slot-lock', '?'));
      if (this.selectedItemId === item.id) slot.classList.add('selected');
      slot.addEventListener('click', () => {
        playSfx('click');
        this.selectedItemId = this.selectedItemId === item.id ? null : item.id;
        this.renderCollection();
      });
      this.collectionGrid.appendChild(slot);
    }

    this.collectionBonusCard.innerHTML = '';
    const bonus = collectionBonus(this.state);
    const head = el('div', 'bonus-head');
    head.append(
      el('span', 'bonus-title', 'Koleksiyon Bonusu'),
      el('strong', 'bonus-value', `+%${(bonus * 100).toFixed(1)}`),
    );
    this.collectionBonusCard.append(
      head,
      el(
        'div',
        'bonus-note',
        `Keşfedilen her parça kazancını kalıcı olarak %${(COLLECTION_BONUS_PER_ITEM * 100).toFixed(1)} artırır.`,
      ),
    );

    this.renderCollectionDetail(found);
  }

  private renderCollectionDetail(found: Set<string>): void {
    this.collectionDetail.innerHTML = '';
    const item = this.selectedItemId ? ITEM_INDEX.get(this.selectedItemId) : undefined;

    if (!item) {
      this.collectionDetail.appendChild(
        el('div', 'detail-hint', 'Bir parçaya dokunarak ağırlığını ve değerini gör.'),
      );
      return;
    }

    const known = found.has(item.id);
    const icon = el('div', `detail-icon rarity-${item.rarity}`);
    icon.appendChild(img(item.sprite));
    if (!known) icon.classList.add('locked');

    // The tier gets its gem badge next to the word, so the five rarities are
    // told apart by colour and shape rather than by reading alone.
    const rarityRow = el('div', `detail-rarity r-${item.rarity}`);
    rarityRow.append(img(RARITY_GEM[item.rarity], 'rarity-gem'), el('span', undefined, RARITY_LABEL[item.rarity]));

    const info = el('div', 'detail-info');
    info.append(el('div', 'detail-name', known ? item.name : 'Henüz bulunmadı'), rarityRow);

    const stats = el('div', 'detail-stats');
    stats.append(
      this.detailStat('Ağırlık', known ? `${item.weight}` : '?'),
      this.detailStat('Değer', known ? `${item.value}` : '?'),
    );

    this.collectionDetail.append(icon, info, stats);
  }

  private detailStat(label: string, value: string): HTMLElement {
    const node = el('div', 'detail-stat');
    node.append(el('span', undefined, label), el('strong', undefined, value));
    return node;
  }

  // --------------------------------------------------------------- settings

  private buildSettingsPanel(): HTMLElement {
    const panel = el('div', 'hub-panel scroll-panel');

    // --- sound
    const sound = this.settingsSection('Ses');
    this.soundBtn = button('', 'toggle-row', () => this.toggleSound());
    sound.appendChild(this.soundBtn);

    const volumeRow = el('div', 'slider-row');
    this.volumeSlider = el('input') as HTMLInputElement;
    this.volumeSlider.type = 'range';
    this.volumeSlider.min = '0';
    this.volumeSlider.max = '100';
    this.volumeSlider.value = `${Math.round(this.state.sfxVolume * 100)}`;
    const volumeValue = el('span', 'slider-value', `${this.volumeSlider.value}%`);
    this.volumeSlider.addEventListener('input', () => {
      const v = Number(this.volumeSlider.value) / 100;
      this.state.sfxVolume = v;
      setSfxVolume(v);
      volumeValue.textContent = `${this.volumeSlider.value}%`;
    });
    // Preview and persist once the drag ends, not on every pixel of movement.
    const commitVolume = (): void => {
      saveState(this.state);
      playSfx('collect');
    };
    this.volumeSlider.addEventListener('change', commitVolume);
    volumeRow.append(el('span', 'slider-label', 'Efekt Seviyesi'), this.volumeSlider, volumeValue);
    sound.appendChild(volumeRow);

    // --- visuals
    const visuals = this.settingsSection('Görüntü');
    visuals.appendChild(
      this.toggleRow('Parçacık Efektleri', this.state.particles, (on) => {
        this.state.particles = on;
        saveState(this.state);
        this.onParticlesChanged?.(on);
      }),
    );

    // --- device
    const device = this.settingsSection('Cihaz');
    if ('vibrate' in navigator) {
      device.appendChild(
        this.toggleRow('Titreşim', this.state.haptics, (on) => {
          this.state.haptics = on;
          saveState(this.state);
          if (on) navigator.vibrate?.(20);
        }),
      );
    }
    const deviceActions = el('div', 'settings-actions');
    deviceActions.append(
      button('Ana Menüye Dön', 'big-btn alt', () => this.onBackToMenu?.()),
      button('İlerlemeyi Sıfırla', 'danger-btn', () => this.confirmReset()),
    );
    device.appendChild(deviceActions);

    const note = el(
      'div',
      'settings-note',
      'İlerleme bu cihazın tarayıcısında saklanır. Sıfırlarsan para, geliştirmeler ve koleksiyon silinir; ses ve görüntü tercihlerin kalır.',
    );

    panel.append(sound, visuals, device, note);
    this.updateSoundLabel();
    return panel;
  }

  private settingsSection(title: string): HTMLElement {
    const section = el('div', 'settings-section');
    section.appendChild(el('div', 'section-title', title));
    return section;
  }

  private toggleRow(label: string, initial: boolean, onChange: (on: boolean) => void): HTMLElement {
    const row = el('button', 'toggle-row') as HTMLButtonElement;
    const knob = el('span', 'switch');
    let value = initial;
    const apply = (): void => {
      row.classList.toggle('on', value);
      knob.classList.toggle('on', value);
    };
    row.append(el('span', undefined, label), knob);
    row.addEventListener('click', () => {
      value = !value;
      apply();
      playSfx('click');
      onChange(value);
    });
    apply();
    return row;
  }

  private toggleSound(): void {
    const on = !isAudioEnabled();
    setAudioEnabled(on);
    this.state.muted = !on;
    saveState(this.state);
    this.updateSoundLabel();
  }

  private updateSoundLabel(): void {
    const on = isAudioEnabled();
    this.soundBtn.innerHTML = '';
    this.soundBtn.append(el('span', undefined, 'Ses'), el('span', `switch${on ? ' on' : ''}`));
    this.soundBtn.classList.toggle('on', on);
    this.volumeSlider.disabled = !on;
  }

  private confirmReset(): void {
    if (window.confirm('Tüm ilerleme silinecek. Emin misin?')) {
      this.onResetProgress?.();
    }
  }

  // ------------------------------------------------------------------- tick

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

  tick(): void {
    if (this.current !== 'playing') return;

    this.coinLabel.textContent = `${this.state.coins}`;
    this.renderShots();

    const t = this.run.timeRemaining;
    this.timeLabel.textContent = fmtTime(t);
    this.timePill.classList.toggle('warn', t <= 5 && t > 3);
    this.timePill.classList.toggle('critical', t <= 3);

    const load = this.run.magnet.load;
    this.loadLabel.textContent =
      load > 0 ? `${load} (-${Math.round(this.run.loadPenalty() * 100)}%)` : '0';

    if (this.run.magnet.carried.length !== this.haulCount) {
      this.haulCount = this.run.magnet.carried.length;
      this.renderHaul();
    }
  }

  resetHaul(): void {
    this.haulCount = -1;
    this.pipCount = -1;
    this.renderHaul();
  }
}

const ITEM_INDEX = new Map(ITEMS.map((i) => [i.id, i]));
