/**
 * wiki-search.js — универсальная поиск + сортировка для страниц вики
 *
 * Требования к карточкам:
 *   data-name="Имя карточки"          — отображаемое имя (для поиска и алфавита)
 *   data-order="1"                    — порядковый номер добавления (1 = первый, выше = новее)
 *
 * Пример:
 *   <a href="..." class="wiki-card" data-name="Наутилус" data-order="3" ...>
 */

(function () {
  'use strict';

  /* ── Inject styles ── */
  var style = document.createElement('style');
  style.textContent = `
    /* ── Search/sort bar ── */
    .ws-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding: 0 48px 28px;
      max-width: 1100px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      animation: fadeUp .5s ease .05s both;
    }
    @media (max-width: 700px) {
      .ws-bar { padding: 0 18px 20px; }
    }

    /* Search input */
    .ws-input-wrap {
      position: relative;
      flex: 1;
      min-width: 180px;
    }
    .ws-input-icon {
      position: absolute;
      left: 12px; top: 50%;
      transform: translateY(-50%);
      width: 15px; height: 15px;
      opacity: .45;
      pointer-events: none;
    }
    .ws-input {
      width: 100%;
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text);
      font-family: var(--font);
      font-size: 14px;
      padding: 9px 12px 9px 34px;
      outline: none;
      transition: border-color .15s, box-shadow .15s;
      box-sizing: border-box;
      letter-spacing: .04em;
    }
    .ws-input::placeholder { color: var(--text2); opacity: .7; }
    .ws-input:focus {
      border-color: var(--border2);
      box-shadow: 0 0 0 2px var(--glow);
    }

    /* Sort buttons */
    .ws-sort-group {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }
    .ws-sort-btn {
      font-family: var(--font);
      font-size: 12px;
      letter-spacing: .07em;
      padding: 8px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: var(--bg3);
      color: var(--text2);
      cursor: pointer;
      transition: color .15s, border-color .15s, background .15s, transform .12s;
      white-space: nowrap;
    }
    .ws-sort-btn:hover {
      color: var(--accent);
      border-color: var(--border2);
      transform: scale(1.06);
    }
    .ws-sort-btn.active {
      color: var(--accent);
      border-color: var(--border2);
      background: var(--bg);
      box-shadow: 0 0 8px var(--glow);
    }

    /* Count badge */
    .ws-count {
      font-family: var(--font);
      font-size: 12px;
      color: var(--text2);
      letter-spacing: .05em;
      white-space: nowrap;
      padding: 8px 0;
    }

    /* Empty state */
    .ws-empty {
      display: none;
      width: 100%;
      text-align: center;
      padding: 60px 20px;
      color: var(--text2);
      font-family: var(--font);
      font-size: 14px;
      letter-spacing: .06em;
    }
    .ws-empty-icon {
      font-size: 36px;
      display: block;
      margin-bottom: 14px;
      opacity: .5;
    }

    /* Card hide/show */
    .wiki-card.ws-hidden {
      display: none !important;
    }

    /* Smooth reorder transition */
    .wiki-card {
      transition:
        transform .22s ease,
        box-shadow .22s ease,
        opacity .2s ease !important;
    }
  `;
  document.head.appendChild(style);

  /* ── Wait for DOM ── */
  function init() {
    var grid = document.querySelector('.cards-grid');
    var navRow = document.querySelector('.wiki-nav-row');
    if (!grid || !navRow) return;

    /* ── Build bar ── */
    var bar = document.createElement('div');
    bar.className = 'ws-bar';
    bar.innerHTML = `
      <div class="ws-input-wrap">
        <svg class="ws-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input class="ws-input" type="text" placeholder="Поиск по названию..." autocomplete="off" spellcheck="false" id="wsSearchInput">
      </div>
      <div class="ws-sort-group">
        <button class="ws-sort-btn active" data-sort="default" title="По умолчанию">По умолчанию</button>
        <button class="ws-sort-btn" data-sort="newest" title="Новые сначала">Новее ↑</button>
        <button class="ws-sort-btn" data-sort="oldest" title="Старые сначала">Старее ↓</button>
        <button class="ws-sort-btn" data-sort="alpha" title="По алфавиту А→Я">А → Я</button>
        <button class="ws-sort-btn" data-sort="views" title="По просмотрам">🔥 Популярные</button>
      </div>
      <span class="ws-count" id="wsCount"></span>
    `;

    /* Insert bar after wiki-nav-row */
    navRow.insertAdjacentElement('afterend', bar);

    /* Empty state node */
    var empty = document.createElement('div');
    empty.className = 'ws-empty';
    empty.innerHTML = '<span class="ws-empty-icon">🔍</span>Ничего не найдено';
    grid.insertAdjacentElement('afterend', empty);

    /* ── Collect cards ── */
    var cards = Array.from(grid.querySelectorAll('.wiki-card'));

    /* Store original DOM order as fallback */
    cards.forEach(function (card, i) {
      card._wsOrigIndex = i;
      /* read data-order (number), default to original index */
      var o = parseInt(card.getAttribute('data-order'), 10);
      card._wsOrder = isNaN(o) ? i + 1 : o;
      card._wsName = (card.getAttribute('data-name') || card.querySelector('.card-title')?.textContent || '').trim().toLowerCase();
    });

    var currentSort = 'default';
    var currentQuery = '';

    /* ── Render ── */
    function render() {
      /* 1. Filter */
      var q = currentQuery.trim().toLowerCase();
      var visible = cards.filter(function (card) {
        if (!q) return true;
        return card._wsName.includes(q);
      });
      var hidden = cards.filter(function (card) {
        return !visible.includes(card);
      });

      /* 2. Sort visible */
      var sorted = visible.slice();
      if (currentSort === 'oldest') {
        sorted.sort(function (a, b) { return a._wsOrder - b._wsOrder; });
      } else if (currentSort === 'newest') {
        sorted.sort(function (a, b) { return b._wsOrder - a._wsOrder; });
      } else if (currentSort === 'alpha') {
        sorted.sort(function (a, b) { return a._wsName.localeCompare(b._wsName, 'ru'); });
      } else if (currentSort === 'views') {
        /* sort by Firebase views — use cached _wsViews, loaded async */
        sorted.sort(function (a, b) { return (b._wsViews||0) - (a._wsViews||0); });
      } else {
        /* default: original DOM order */
        sorted.sort(function (a, b) { return a._wsOrigIndex - b._wsOrigIndex; });
      }

      /* 3. Hide filtered-out cards */
      hidden.forEach(function (card) { card.classList.add('ws-hidden'); });
      visible.forEach(function (card) { card.classList.remove('ws-hidden'); });

      /* 4. Reorder in DOM */
      sorted.forEach(function (card) { grid.appendChild(card); });

      /* 5. Count */
      var countEl = document.getElementById('wsCount');
      if (countEl) {
        countEl.textContent = visible.length + ' / ' + cards.length;
      }

      /* 6. Empty state */
      empty.style.display = visible.length === 0 ? 'block' : 'none';
    }

    /* ── Search input ── */
    var input = document.getElementById('wsSearchInput');
    if (input) {
      input.addEventListener('input', function () {
        currentQuery = this.value;
        render();
      });
    }

    /* ── Sort buttons ── */
    bar.querySelectorAll('.ws-sort-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        bar.querySelectorAll('.ws-sort-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentSort = btn.getAttribute('data-sort');
        render();
      });
    });

    /* Initial render */
    render();

    /* ── Preload view counts from Firebase for popularity sort ── */
    function loadViews() {
      if (!window.WikiDB) { setTimeout(loadViews, 500); return; }
      cards.forEach(function(card) {
        var pid = (card.getAttribute('href') || '').replace('.html','').replace(/^\//,'');
        if (!pid) return;
        window.WikiDB.db.ref('pages/' + pid + '/views').once('value', function(snap){
          card._wsViews = snap.val() || 0;
        });
      });
    }
    loadViews();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
