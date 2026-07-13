/* achievements.js — система достижений МапДев Вики
   Подключать ПОСЛЕ firebase-wiki.js на любой странице:
     <script src="achievements.js"></script>
   Хранение: profiles/{uid}/achievements/{id} = timestamp
   API:
     WikiAchievements.grantSelf(id)   — выдать достижение текущему юзеру (+тост если новое)
     WikiAchievements.grant(uid, id)  — выдать конкретному uid (без тоста, для VIP и т.п.)
     WikiAchievements.checkSelf()     — перечитать свой профиль и выдать все count-достижения по порогам
     WikiAchievements.checkStats(obj) — выдать count-достижения по объекту {commentCount,likesGiven,msgCount,reputation}
     WikiAchievements.catalog         — каталог всех достижений (в порядке отображения)
*/
(function () {
  'use strict';

  function safeKey(s) { return String(s).replace(/[.#$/\[\]]/g, '_'); }

  /* ═══════════════════════════════════════════
     КАТАЛОГ ДОСТИЖЕНИЙ (порядок = порядок в профиле)
     count-based: есть stat+need — выдаются автоматически по статистике
     flag-based:  выдаются событием через grantSelf(id)
     secret: true — скрыто в профиле пока не получено (показывается «???»)
  ═══════════════════════════════════════════ */
  var catalog = {
    /* ── Комментарии ── */
    first_comment:  { icon: '💬', title: 'Первое слово',      desc: 'Оставить первый комментарий',        stat: 'commentCount', need: 1 },
    comment_10:     { icon: '🗣️', title: 'Болтун',            desc: 'Оставить 10 комментариев',            stat: 'commentCount', need: 10 },
    comment_50:     { icon: '📢', title: 'Оратор',             desc: 'Оставить 50 комментариев',            stat: 'commentCount', need: 50 },
    comment_100:    { icon: '🎙️', title: 'Голос сообщества',   desc: 'Оставить 100 комментариев',           stat: 'commentCount', need: 100 },

    /* ── Лайки ── */
    likes_10:       { icon: '👍', title: 'Щедрый',             desc: 'Поставить 10 лайков',                 stat: 'likesGiven', need: 10 },
    likes_50:       { icon: '💛', title: 'Меценат',            desc: 'Поставить 50 лайков',                 stat: 'likesGiven', need: 50 },
    likes_100:      { icon: '💝', title: 'Фанат',              desc: 'Поставить 100 лайков',                stat: 'likesGiven', need: 100 },

    /* ── Репутация ── */
    rep_10:         { icon: '⭐', title: 'Признание',          desc: 'Набрать 10 репутации',                stat: 'reputation', need: 10 },
    rep_50:         { icon: '🌟', title: 'Авторитет',          desc: 'Набрать 50 репутации',                stat: 'reputation', need: 50 },
    rep_100:        { icon: '👑', title: 'Легенда вики',       desc: 'Набрать 100 репутации',               stat: 'reputation', need: 100 },

    /* ── Сообщения ── */
    msg_10:         { icon: '✉️', title: 'Собеседник',         desc: 'Отправить 10 сообщений',              stat: 'msgCount', need: 10 },
    msg_100:        { icon: '📨', title: 'Душа переписки',     desc: 'Отправить 100 сообщений',             stat: 'msgCount', need: 100 },
    msg_500:        { icon: '📬', title: 'Неутомимый',         desc: 'Отправить 500 сообщений',             stat: 'msgCount', need: 500 },

    /* ── Социальные события (flag-based) ── */
    first_dm:       { icon: '📩', title: 'На связи',           desc: 'Отправить первое личное сообщение' },
    group_create:   { icon: '👥', title: 'Основатель',         desc: 'Создать группу' },
    channel_create: { icon: '📡', title: 'Вещатель',           desc: 'Создать свой канал' },
    channel_join:   { icon: '🔔', title: 'Подписчик',          desc: 'Вступить в канал' },
    pin_message:    { icon: '📌', title: 'Важное',             desc: 'Закрепить сообщение' },
    react_give:     { icon: '😄', title: 'Реакция',            desc: 'Поставить реакцию на сообщение' },

    /* ── Творчество / профиль ── */
    set_avatar:     { icon: '🖼️', title: 'Новое лицо',         desc: 'Установить аватарку' },
    set_bio:        { icon: '📝', title: 'О себе',             desc: 'Заполнить описание профиля' },
    paint_wall:     { icon: '🖌️', title: 'Художник',           desc: 'Нарисовать стену профиля' },
    use_format:     { icon: '🎨', title: 'Стилист',            desc: 'Использовать форматирование текста' },
    first_post:     { icon: '✍️', title: 'Автор',              desc: 'Опубликовать пост' },

    /* ── Секретные ── */
    block_user:     { icon: '🚫', title: 'Стоп-лист',          desc: 'Заблокировать пользователя', secret: true },
    night_owl:      { icon: '🦉', title: 'Ночная сова',        desc: 'Зайти на сайт ночью (00:00–05:00)', secret: true },
    msg_from_medele:{ icon: '💎', title: 'VIP',                desc: 'Получить сообщение от MEDELE', secret: true }
  };

  /* Список только count-достижений — для checkStats */
  var COUNT_LIST = Object.keys(catalog).filter(function (id) {
    return catalog[id].stat && catalog[id].need;
  });

  /* ═══════════════════════════════════════════
     ТОСТ-УВЕДОМЛЕНИЕ
  ═══════════════════════════════════════════ */
  var toastQueue = [];
  var toastShowing = false;

  function injectToastCss() {
    if (document.getElementById('achToastStyle')) return;
    var st = document.createElement('style');
    st.id = 'achToastStyle';
    st.textContent =
      /* Всплывание — как у уведомления о сообщении: сверху по центру, съезжает вниз */
      '.ach-toast{position:fixed;top:14px;left:50%;z-index:100000;' +
      'transform:translateX(-50%) translateY(-170%);' +
      'display:flex;align-items:center;gap:12px;padding:10px 20px 10px 12px;' +
      'min-width:264px;max-width:min(380px,calc(100vw - 20px));' +
      /* Вид — майнкрафтовский тост достижения */
      "font-family:'MinecraftRus',var(--font,monospace);image-rendering:pixelated;color:#fff;" +
      'background:#242424;border:2px solid #000;' +
      'box-shadow:inset 2px 2px 0 0 rgba(255,255,255,.14),inset -2px -2px 0 0 rgba(0,0,0,.55),' +
      '0 6px 0 0 rgba(0,0,0,.35),0 12px 28px rgba(0,0,0,.5);' +
      'transition:transform .35s cubic-bezier(.2,.9,.3,1.2);cursor:default;}' +
      '.ach-toast.show{transform:translateX(-50%) translateY(0);}' +
      /* Слот с иконкой (вдавленная рамка как в инвентаре) */
      '.ach-toast-icon{flex-shrink:0;width:42px;height:42px;display:flex;align-items:center;' +
      'justify-content:center;font-size:26px;line-height:1;image-rendering:pixelated;background:#1b1b1b;' +
      'box-shadow:inset 2px 2px 0 0 rgba(0,0,0,.6),inset -2px -2px 0 0 rgba(255,255,255,.1);}' +
      '.ach-toast-body{display:flex;flex-direction:column;gap:4px;min-width:0;}' +
      /* Верхняя строка — жёлтая, как «Achievement Get!» */
      '.ach-toast-label{font-size:13px;line-height:1;color:#ffff4a;text-shadow:2px 2px 0 rgba(0,0,0,.55);}' +
      /* Название достижения — белое */
      '.ach-toast-title{font-size:14px;line-height:1.15;color:#fff;text-shadow:2px 2px 0 rgba(0,0,0,.55);' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:270px;}';
    document.head.appendChild(st);
  }

  function pushToast(ach) {
    toastQueue.push(ach);
    if (!toastShowing) nextToast();
  }

  function nextToast() {
    if (!toastQueue.length) { toastShowing = false; return; }
    toastShowing = true;
    var ach = toastQueue.shift();
    injectToastCss();

    var el = document.createElement('div');
    el.className = 'ach-toast';
    el.innerHTML =
      '<div class="ach-toast-icon">' + (ach.icon || '🏆') + '</div>' +
      '<div class="ach-toast-body">' +
        '<div class="ach-toast-label">Достижение получено!</div>' +
        '<div class="ach-toast-title">' + escapeHtml(ach.title || '') + '</div>' +
      '</div>';
    document.body.appendChild(el);

    /* лёгкий звук, если сайт даёт функцию звука */
    try { if (window.playSound) window.playSound('notify'); } catch (e) {}

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('show'); });
    });

    setTimeout(function () { el.classList.remove('show'); }, 5000);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      nextToast();
    }, 5450);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ═══════════════════════════════════════════
     ВЫДАЧА
  ═══════════════════════════════════════════ */
  var seen = {};            /* id -> true : уже обработано в этой сессии (не дёргаем БД повторно) */

  function db() { return window.WikiDB && window.WikiDB.db; }
  function myUid() { return window.WikiDB && window.WikiDB.uid; }

  /* Выдать текущему юзеру. Тост показывается только если достижение НОВОЕ. */
  function grantSelf(id) {
    if (!catalog[id]) return;
    ready(function () {
      var uid = myUid();
      if (!uid) return;
      if (seen[id]) return;            /* уже трогали в этой сессии */
      seen[id] = true;
      var path = 'profiles/' + safeKey(uid) + '/achievements/' + id;
      db().ref(path).once('value', function (snap) {
        if (snap.exists()) return;     /* было получено раньше — без тоста */
        db().ref(path).set(Date.now());
        db().ref('profiles/' + safeKey(uid) + '/nick').once('value', function () {});
        pushToast(catalog[id]);
      });
    });
  }

  /* Выдать произвольному uid (без тоста — он не текущий юзер) */
  function grant(uid, id) {
    if (!catalog[id] || !uid) return;
    ready(function () {
      var path = 'profiles/' + safeKey(uid) + '/achievements/' + id;
      db().ref(path).once('value', function (snap) {
        if (!snap.exists()) db().ref(path).set(Date.now());
      });
    });
  }

  /* Проверить count-достижения по объекту статистики */
  function checkStats(stats) {
    stats = stats || {};
    COUNT_LIST.forEach(function (id) {
      var c = catalog[id];
      if ((stats[c.stat] || 0) >= c.need) grantSelf(id);
    });
  }

  /* Перечитать свой профиль и выдать все count-достижения по порогам */
  function checkSelf() {
    ready(function () {
      var uid = myUid();
      if (!uid) return;
      db().ref('profiles/' + safeKey(uid)).once('value', function (snap) {
        checkStats(snap.val() || {});
      });
    });
  }

  /* ═══════════════════════════════════════════
     ГОТОВНОСТЬ (ждём Firebase + Anonymous Auth)
  ═══════════════════════════════════════════ */
  function ready(cb) {
    if (window.WikiDB && window.WikiDB.db && window.WikiDB.uid) { cb(); return; }
    if (window.WikiDB && window.WikiDB.onAuthReady) {
      window.WikiDB.onAuthReady(function () { cb(); });
      return;
    }
    /* firebase-wiki.js ещё не инициализировался — подождём */
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (window.WikiDB && window.WikiDB.db) {
        clearInterval(t);
        if (window.WikiDB.uid) cb();
        else if (window.WikiDB.onAuthReady) window.WikiDB.onAuthReady(function () { cb(); });
      } else if (tries > 100) {          /* ~20 сек — сдаёмся тихо */
        clearInterval(t);
      }
    }, 200);
  }

  /* ═══════════════════════════════════════════
     ЭКСПОРТ + АВТОСТАРТ
  ═══════════════════════════════════════════ */
  window.WikiAchievements = {
    catalog: catalog,
    grantSelf: grantSelf,
    grant: grant,
    checkStats: checkStats,
    checkSelf: checkSelf
  };

  ready(function () {
    /* при заходе выдаём накопленные count-достижения (в т.ч. репутацию от других) */
    checkSelf();
    /* секретка «ночная сова» */
    var h = new Date().getHours();
    if (h >= 0 && h < 5) grantSelf('night_owl');
  });
})();
