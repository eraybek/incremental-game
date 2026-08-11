import {
  CLEAN_REWARDS, FISH, JUNK, RARITY_COLOR, RARITY_LABEL, UPGRADES, zoneFor,
} from '../game/content';
import { fmt, fmtDepth, fmtKg } from '../game/format';
import type { Game } from '../game/state';
import type { Catchable, UpgradeId } from '../game/types';
import { spriteCss } from '../render/atlas';

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

export class Hud {
  private game: Game;
  private money = $('money');
  private rate = $('rate');
  private depth = $('depth');
  private zoneLabel = $('zone-label');
  private gearBody = $('tab-gear');
  private bookBody = $('tab-book');
  private cleanBody = $('tab-clean');
  private toasts = $('toasts');
  private hint = $('hint');

  /** Yukseltme karti govdeleri; her cerceve yeniden kurulmasin diye saklanir. */
  private cards = new Map<UpgradeId, {
    root: HTMLElement; value: HTMLElement; cost: HTMLElement; level: HTMLElement;
  }>();
  private bookBuilt = false;
  private activeTab = 'gear';

  constructor(game: Game) {
    this.game = game;
    this.buildTabs();
    this.buildGear();
    this.buildClean();
  }

  private buildTabs(): void {
    for (const btn of document.querySelectorAll<HTMLButtonElement>('.tab')) {
      btn.addEventListener('click', () => {
        const name = btn.dataset.tab!;
        this.activeTab = name;
        for (const b of document.querySelectorAll('.tab')) b.classList.toggle('is-active', b === btn);
        for (const body of document.querySelectorAll('.tab-body')) {
          body.classList.toggle('is-active', body.id === `tab-${name}`);
        }
        if (name === 'book') this.buildBook();
      });
    }
  }

  // --- Techizat sekmesi ----------------------------------------------------

  private buildGear(): void {
    for (const u of UPGRADES) {
      const root = document.createElement('button');
      root.className = 'card';
      root.type = 'button';
      root.innerHTML = `
        <span class="card-icon" style="${spriteCss(u.sprite, 34)}"></span>
        <span class="card-main">
          <span class="card-head">
            <span class="card-name">${u.name}</span>
            <span class="card-level"></span>
          </span>
          <span class="card-desc"></span>
        </span>
        <span class="card-cost"></span>`;
      root.addEventListener('click', () => {
        if (this.game.buy(u.id)) this.refreshGear(true);
      });
      this.gearBody.appendChild(root);
      this.cards.set(u.id, {
        root,
        value: root.querySelector('.card-desc')!,
        cost: root.querySelector('.card-cost')!,
        level: root.querySelector('.card-level')!,
      });
    }
    this.refreshGear(true);
  }

  private refreshGear(full: boolean): void {
    for (const u of UPGRADES) {
      const c = this.cards.get(u.id)!;
      const revealed = this.game.isRevealed(u.id);
      c.root.classList.toggle('is-hidden', !revealed);
      if (!revealed) continue;

      const level = this.game.upgrades[u.id];
      const maxed = this.game.isMaxed(u.id);
      c.root.classList.toggle('can-buy', this.game.canAfford(u.id));
      c.root.classList.toggle('is-maxed', maxed);
      c.cost.textContent = maxed ? 'TAM' : fmt(this.game.costFor(u.id));
      if (full || true) {
        c.level.textContent = level > 0 ? `sv ${level}` : '';
        c.value.textContent = u.desc.replace('{v}', u.valueAt(level));
      }
    }
  }

  // --- Defter --------------------------------------------------------------

  private buildBook(): void {
    if (this.bookBuilt) {
      this.refreshBook();
      return;
    }
    this.bookBuilt = true;
    const groups: { title: string; items: Catchable[] }[] = [
      { title: 'Balıklar', items: FISH },
      { title: 'Çöp ve Hazine', items: JUNK },
    ];
    for (const g of groups) {
      const h = document.createElement('h3');
      h.className = 'book-title';
      h.textContent = g.title;
      this.bookBody.appendChild(h);
      const grid = document.createElement('div');
      grid.className = 'book-grid';
      for (const s of g.items) {
        const cell = document.createElement('div');
        cell.className = 'book-cell';
        cell.dataset.id = s.id;
        cell.innerHTML = `
          <span class="book-icon" style="${spriteCss(s.sprite, 40)}"></span>
          <span class="book-name"></span>
          <span class="book-meta"></span>`;
        grid.appendChild(cell);
      }
      this.bookBody.appendChild(grid);
    }
    this.refreshBook();
  }

  private refreshBook(): void {
    for (const cell of this.bookBody.querySelectorAll<HTMLElement>('.book-cell')) {
      const id = cell.dataset.id!;
      const entry = this.game.log[id];
      const species = [...FISH, ...JUNK].find((s) => s.id === id)!;
      const known = !!entry;
      cell.classList.toggle('is-known', known);
      const name = cell.querySelector('.book-name')!;
      const meta = cell.querySelector('.book-meta')!;
      name.textContent = known ? species.name : '???';
      if (species.kind === 'fish') {
        (name as HTMLElement).style.color = known ? RARITY_COLOR[species.rarity] : '';
        (name as HTMLElement).title = RARITY_LABEL[species.rarity];
      }
      meta.textContent = known
        ? entry.best > 0
          ? `×${entry.count} · rekor ${fmtKg(entry.best)}`
          : `×${entry.count}`
        : '';
    }
  }

  // --- Temiz Deniz ---------------------------------------------------------

  private buildClean(): void {
    this.cleanBody.innerHTML = `
      <p class="clean-intro">
        Denizden çıkardığın her çöp bu sayacı besliyor. Çöp para etmez ama
        kalıcı ödüller açar.
      </p>
      <div class="clean-count"><span id="clean-n">0</span> parça çöp toplandı</div>
      <div class="clean-bar"><div class="clean-fill" id="clean-fill"></div></div>
      <div class="clean-next" id="clean-next"></div>
      <ul class="clean-list" id="clean-list"></ul>`;
    const list = $('clean-list');
    for (const r of CLEAN_REWARDS) {
      const li = document.createElement('li');
      li.dataset.at = String(r.at);
      li.innerHTML = `<span class="clean-at">${r.at}</span><span>${r.label}</span>`;
      list.appendChild(li);
    }
    this.refreshClean();
  }

  private refreshClean(): void {
    const n = this.game.cleanliness;
    $('clean-n').textContent = String(n);
    const next = this.game.nextCleanReward;
    // Onceki esikten sonrakine kadar olan ilerleme.
    let prev = 0;
    for (const r of CLEAN_REWARDS) {
      if (r.at <= n) prev = r.at;
    }
    const span = next ? next.at - prev : 1;
    const done = next ? n - prev : 1;
    $('clean-fill').style.width = `${Math.min(100, (done / span) * 100)}%`;
    $('clean-next').textContent = next
      ? `Sonraki ödül ${next.at - n} çöp sonra: ${next.label}`
      : 'Tüm ödüller açıldı.';
    for (const li of this.cleanBody.querySelectorAll<HTMLElement>('.clean-list li')) {
      li.classList.toggle('is-done', n >= Number(li.dataset.at));
    }
  }

  // --- Toast ---------------------------------------------------------------

  toast(text: string, kind = ''): void {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    this.toasts.appendChild(el);
    setTimeout(() => el.classList.add('is-out'), 2200);
    setTimeout(() => el.remove(), 2800);
  }

  setHint(text: string | null): void {
    this.hint.textContent = text ?? '';
    this.hint.classList.toggle('is-visible', !!text);
  }

  // --- Cerceve -------------------------------------------------------------

  private frame = 0;

  update(): void {
    this.money.textContent = fmt(this.game.money);
    this.rate.textContent = `${fmt(this.game.incomePerSecond)}/sn`;
    this.depth.textContent = fmtDepth(this.game.maxDepth);
    this.zoneLabel.textContent = zoneFor(this.game.maxDepth).name;

    // Panel her cerceve degil, saniyede ~6 kez tazelenir.
    this.frame++;
    if (this.frame % 10 !== 0) return;
    if (this.activeTab === 'gear') this.refreshGear(false);
    else if (this.activeTab === 'book') this.refreshBook();
    else this.refreshClean();
  }
}
