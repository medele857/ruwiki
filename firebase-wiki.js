
(function () {
  'use strict';

  /* ── Firebase config ── */
  var FIREBASE_CFG = {
   apiKey: "AIzaSyAID9ivHW94RB6eMB9qG4kVK7QfK2iStgc",
   authDomain: "ruwiki-f1ecb.firebaseapp.com",
   projectId: "ruwiki-f1ecb",
   storageBucket: "ruwiki-f1ecb.firebasestorage.app",
   messagingSenderId: "645896740533",
   appId: "1:645896740533:web:169a140bb01857fec0a8fc",
   databaseURL: "https://ruwiki-f1ecb-default-rtdb.firebaseio.com"
 };

  /* ── Wiki entries map ── */
  var WIKI_ENTRIES = {
    'studio-cubikarti':  { name:'Куби карты',   logo:'cubikarti.png',        type:'Студия',       url:'studio-cubikarti.html' },
    'studio-qwer':       { name:'Qwer Team',     logo:'banka.png',            type:'Студия',       url:'studio-qwer.html' },
    'studio-zerooone':   { name:'Zero One',      logo:'zo.jpg',               type:'Студия',       url:'studio-zerooone.html' },
    'studio-yourstory':  { name:'YourStory',     logo:'yst_ava.jpg',          type:'Команда',      url:'studio-yourstory.html' },
    'studio-nautilus':   { name:'Наутилус',      logo:'nautilus_ava.jpg',     type:'Студия',       url:'studio-nautilus.html' },
    'studio-spade':      { name:'Spade Studio',  logo:'spade_studio_ava.png', type:'Команда',      url:'studio-spade.html' },
    'studio-kts':        { name:'KTS',           logo:'kts_ava.jpg',          type:'Мини-команда', url:'studio-kts.html' },
    'author-nateshapiro':{ name:'NateShapiro',   logo:'nate_ava.png',         type:'Автор',        url:'author-nateshapiro.html' },
    'author-vladislavvc':{ name:'Vladislavvc',   logo:'vladislavvc.jpg',      type:'Автор',        url:'author-vladislavvc.html' },
    'author-bigsty':     { name:'Bigsty',        logo:'bigsty_ava.jpg',       type:'Автор',        url:'author-bigsty.html' },
    'author-kekovich':   { name:'kekovich_lol',  logo:'kek_ava.png',          type:'Автор',        url:'author-kekovich.html' },
    'author-tenar52':    { name:'TENAR52',       logo:'tenar52.jpg',          type:'Автор',        url:'author-tenar52.html' },
    'author-rblbeha':    { name:'RblBEHA',       logo:'riba.jpg',             type:'Автор',        url:'author-rblbeha.html' },
    'author-feodaller':  { name:'feodaller',     logo:'feo.jpg',              type:'Автор',        url:'author-feodaller.html' },
    'author-protipro':   { name:'ProTiPro',      logo:'protipro.jpg',         type:'Автор',        url:'author-protipro.html' },
    'author-qwer':       { name:'Qwer team',     logo:'banka.png',            type:'Автор',        url:'author-qwer.html' },
    'author-yogurtt':    { name:'YoguRtt_',      logo:'7y.jpg',               type:'Автор',        url:'author-yogurtt.html' },
    'blogger-r1lame':    { name:'r1lame',        logo:'r1.jpg',               type:'Блогер',       url:'blogger-r1lame.html' },
  };

  /* ════════════════════════════════════════════════════
     DEVICE FINGERPRINT
     Генерируется один раз, хранится в localStorage.
     Переживает новые вкладки и перезагрузки.
     Не зависит от сессии.
  ════════════════════════════════════════════════════ */
  function getDeviceId() {
    var KEY = '_wdid';
    var id  = localStorage.getItem(KEY);
    if (id) return id;

    /* Собираем стабильные характеристики браузера */
    var parts = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.platform || ''
    ].join('|');

    /* Простой hash (djb2) */
    var h = 5381;
    for (var i = 0; i < parts.length; i++) {
      h = ((h << 5) + h) ^ parts.charCodeAt(i);
      h = h & 0xffffffff; /* 32-bit */
    }
    /* Добавляем случайный соль — чтобы два человека с одинаковым железом не слились */
    var salt = Math.random().toString(36).slice(2, 8);
    id = Math.abs(h).toString(36) + salt;
    localStorage.setItem(KEY, id);
    return id;
  }

  var DEVICE_ID = getDeviceId();

  /* Безопасный ключ для Firebase (без точек/слешей) */
  function safeKey(s) {
    return s.replace(/[.#$/\[\]]/g, '_');
  }

  /* ════════════════════════════════════════════════════
     SDK LOADING
  ════════════════════════════════════════════════════ */
  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src; s.onload = cb; document.head.appendChild(s);
  }

  var CDN = 'https://www.gstatic.com/firebasejs/9.22.2/';
  loadScript(CDN + 'firebase-app-compat.js', function () {
    loadScript(CDN + 'firebase-database-compat.js', function () {
      loadScript(CDN + 'firebase-auth-compat.js', function () {
        boot();
      });
    });
  });

  function getPageId() {
    var file = window.location.pathname.split('/').pop() || 'main';
    return file.replace('.html', '') || 'main';
  }

  /* ════════════════════════════════════════════════════
     BOOT
  ════════════════════════════════════════════════════ */
  function boot() {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CFG);
    var db   = firebase.database();
    var auth = firebase.auth();
    var pid  = getPageId();

    fixLogoLink();

    /* ════════════════════════════════════════════════════
       REAL AUTH (Firebase Anonymous Auth)
       Заменяет старый localStorage DEVICE_ID.
       uid выдаётся сервером Firebase — подделать его
       через консоль браузера/localStorage нельзя.
    ════════════════════════════════════════════════════ */
    window.WikiDB = window.WikiDB || {};
    window.WikiDB.uid = null;
    window.WikiDB.authReady = false;
    var authReadyCbs = [];
    window.WikiDB.onAuthReady = function (cb) {
      if (window.WikiDB.authReady) cb(window.WikiDB.uid);
      else authReadyCbs.push(cb);
    };

    auth.onAuthStateChanged(function (user) {
      if (user) {
        window.WikiDB.uid = user.uid;
        window.WikiDB.authReady = true;
        authReadyCbs.forEach(function (cb) { cb(user.uid); });
        authReadyCbs = [];
        afterAuth();
      }
    });
    auth.signInAnonymously().catch(function (err) {
      console.error('Anonymous auth failed:', err);
    });

    function afterAuth() {
      /* Онлайн-присутствие */
      var onlineRef = db.ref('online/' + window.WikiDB.uid);
      onlineRef.set(true);
      onlineRef.onDisconnect().remove();

      /* ════════════════════════════════════════════════════
         ГЛОБАЛЬНЫЙ БАННЕР НОВЫХ СООБЩЕНИЙ
         Работает на любой странице сайта, пока он открыт.
      ════════════════════════════════════════════════════ */
      db.ref('nicknames/' + window.WikiDB.uid).on('value', function (nickSnap) {
        var myNick = nickSnap.val();
        if (!myNick) return; /* ник ещё не выбран — нечего слушать */
        var dmIndexRef = db.ref('dm_index/' + safeKey(myNick));
        var knownUnread = {};
        var firstSnapshot = true;

        dmIndexRef.on('value', function (snap) {
          if (!snap.exists()) { firstSnapshot = false; return; }
          snap.forEach(function (ch) {
            var fromNick = ch.key;
            var d = ch.val() || {};
            var unread = d.unread || 0;
            var prev = knownUnread[fromNick] || 0;
            /* показываем баннер только если непрочитанных стало БОЛЬШЕ
               и это не первая загрузка страницы (иначе будет спамить старыми) */
            if (!firstSnapshot && unread > prev) {
              showIncomingMessageBanner(fromNick, d.lastMsg || '');
            }
            knownUnread[fromNick] = unread;
          });
          firstSnapshot = false;
        });
      });
    }

    function showIncomingMessageBanner(fromNick, text) {
      /* Не показываем, если уже открыта переписка именно с этим человеком на messages.html */
      if (window.location.pathname.indexOf('messages.html') !== -1 &&
          window.__wfbActiveDmNick === fromNick) return;

      if (!document.getElementById('wfbDmBannerStyle')) {
        var css = document.createElement('style');
        css.id = 'wfbDmBannerStyle';
        css.textContent =
          '.wfb-dm-banner{position:fixed;top:14px;left:50%;transform:translateX(-50%) translateY(-120%);' +
          'z-index:99999;background:var(--bg2,#16161c);border:1px solid var(--border2,#9b5ff0);' +
          'border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px;' +
          'box-shadow:0 8px 30px rgba(0,0,0,.5);cursor:pointer;max-width:340px;' +
          'transition:transform .35s cubic-bezier(.2,.9,.3,1.2);font-family:inherit;}' +
          '.wfb-dm-banner.show{transform:translateX(-50%) translateY(0);}' +
          '.wfb-dm-banner-ava{width:34px;height:34px;border-radius:50%;background:var(--accent,#9b5ff0);' +
          'display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;flex-shrink:0;}' +
          '.wfb-dm-banner-body{min-width:0;}' +
          '.wfb-dm-banner-nick{font-size:13px;font-weight:bold;color:var(--text,#fff);}' +
          '.wfb-dm-banner-text{font-size:12px;color:var(--text2,#aaa);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;}';
        document.head.appendChild(css);
      }

      var old = document.getElementById('wfbDmBanner');
      if (old) old.remove();

      var el = document.createElement('div');
      el.id = 'wfbDmBanner';
      el.className = 'wfb-dm-banner';
      el.innerHTML =
        '<div class="wfb-dm-banner-ava">' + (fromNick[0] || '?').toUpperCase() + '</div>' +
        '<div class="wfb-dm-banner-body">' +
          '<div class="wfb-dm-banner-nick">' + fromNick.replace(/</g, '&lt;') + '</div>' +
          '<div class="wfb-dm-banner-text">' + (text || '').replace(/</g, '&lt;').slice(0, 60) + '</div>' +
        '</div>';
      el.addEventListener('click', function () {
        window.location.href = 'messages.html?with=' + encodeURIComponent(fromNick);
      });
      document.body.appendChild(el);
      requestAnimationFrame(function () { el.classList.add('show'); });

      setTimeout(function () {
        el.classList.remove('show');
        setTimeout(function () { el.remove(); }, 400);
      }, 6000);
    }

    /* ── Глобальный WikiDB ── */
    Object.assign(window.WikiDB, {
      db:       db,
      auth:     auth,
      deviceId: DEVICE_ID, /* оставлено только для чтения старых записей */
      entries:  WIKI_ENTRIES,

      getTopByField: function (field, limit, cb) {
        db.ref('pages').once('value', function (snap) {
          var arr = [];
          if (snap.exists()) {
            snap.forEach(function (ch) {
              var val = ch.val() || {};
              if (WIKI_ENTRIES[ch.key]) {
                arr.push({ id: ch.key, data: val, fieldVal: Number(val[field]) || 0 });
              }
            });
          }
          arr.sort(function (a, b) { return b.fieldVal - a.fieldVal; });
          if (arr.length === 0) {
            Object.keys(WIKI_ENTRIES).slice(0, limit).forEach(function (k) {
              arr.push({ id: k, data: {}, fieldVal: 0 });
            });
          }
          cb(arr.slice(0, limit));
        });
      },

      /* ── Проверить КД в Firebase (возвращает ms до окончания, 0 = готово) ── */
      checkCooldown: function (scope, cdMs, cb) {
        var key = 'cd/' + safeKey(scope) + '/' + safeKey(DEVICE_ID);
        db.ref(key).once('value', function (snap) {
          var last = snap.val() || 0;
          var remaining = Math.max(0, last + cdMs - Date.now());
          cb(remaining);
        });
      },

      /* ── Записать метку КД ── */
      stampCooldown: function (scope) {
        var key = 'cd/' + safeKey(scope) + '/' + safeKey(DEVICE_ID);
        db.ref(key).set(Date.now());
      },

      /* ── Проверить лайк (возвращает bool) ── */
      checkLike: function (pid, cb) {
        var key = 'likes_by/' + safeKey(pid) + '/' + safeKey(DEVICE_ID);
        db.ref(key).once('value', function (snap) { cb(!!snap.val()); });
      },

      /* ── Поставить/снять лайк ── */
      toggleLike: function (pid, pageRef, liked, onDone) {
        var key = 'likes_by/' + safeKey(pid) + '/' + safeKey(DEVICE_ID);
        if (liked) {
          /* снимаем */
          db.ref(key).remove();
          pageRef.child('likes').transaction(function (v) { return Math.max(0, (v || 0) - 1); });
          onDone(false);
        } else {
          /* ставим — атомарно: сначала пишем флаг, потом счётчик */
          db.ref(key).set(true, function (err) {
            if (err) return; /* уже стоит (гонка) */
            pageRef.child('likes').transaction(function (v) { return (v || 0) + 1; });
            onDone(true);
          });
        }
      }
    });

    /* ════════════════════════════════════════════════════
       BAN CHECK — блокируем забаненных устройств
    ════════════════════════════════════════════════════ */
    db.ref('bans/' + safeKey(DEVICE_ID)).once('value', function (snap) {
      if (!snap.exists()) return;
      var ban = snap.val() || {};
      showBanScreen(ban.reason || 'Ты заблокирован администратором.');
    });

    function showBanScreen(reason) {
      var style = document.createElement('style');
      style.textContent = `
        .wfb-ban-screen {
          position: fixed; inset: 0; z-index: 99999;
          background: #0a0005;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 32px;
          font-family: var(--font, monospace);
          animation: wfbBanIn .4s ease;
        }
        @keyframes wfbBanIn { from{opacity:0} to{opacity:1} }
        .wfb-ban-icon { font-size: 64px; margin-bottom: 20px; filter: drop-shadow(0 0 20px #ff2040); }
        .wfb-ban-title { font-size: 28px; color: #ff2040; letter-spacing: .1em; margin-bottom: 12px; }
        .wfb-ban-reason { font-size: 14px; color: rgba(255,80,100,.7); max-width: 420px; line-height: 1.7; }
        .wfb-ban-id { font-size: 10px; color: rgba(255,255,255,.15); margin-top: 28px; letter-spacing: .05em; }
      `;
      document.head.appendChild(style);
      var el = document.createElement('div');
      el.className = 'wfb-ban-screen';
      el.innerHTML =
        '<div class="wfb-ban-icon">🚫</div>' +
        '<div class="wfb-ban-title">Доступ заблокирован</div>' +
        '<div class="wfb-ban-reason">' + esc(reason) + '</div>' +
        '<div class="wfb-ban-id">ID: ' + DEVICE_ID + '</div>';
      document.body.appendChild(el);
      /* Блокируем скролл */
      document.body.style.overflow = 'hidden';
    }

    /* ════════════════════════════════════════════════════
       ANNOUNCEMENT — полноэкранное оповещение
    ════════════════════════════════════════════════════ */
    (function () {
      var css = document.createElement('style');
      css.textContent = `
        .wfb-ann-overlay {
          position: fixed; inset: 0; z-index: 88888;
          background: rgba(0,0,0,.88);
          backdrop-filter: blur(8px);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 32px; text-align: center;
          animation: wfbAnnIn .4s ease;
        }
        @keyframes wfbAnnIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        .wfb-ann-box {
          background: var(--bg2, #111);
          border: 1px solid var(--border2, rgba(255,255,255,.15));
          border-radius: 16px;
          padding: 36px 40px;
          max-width: 580px; width: 100%;
          box-shadow: 0 30px 80px rgba(0,0,0,.7);
          display: flex; flex-direction: column; gap: 18px;
          position: relative;
        }
        .wfb-ann-label {
          font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
          color: var(--accent, #7ea6ff); opacity: .7;
        }
        .wfb-ann-text {
          font-family: var(--font, monospace);
          font-size: 16px; color: var(--text, #fff); line-height: 1.8;
          white-space: pre-line; word-break: break-word;
        }
        .wfb-ann-media {
          border-radius: 10px; overflow: hidden;
          max-height: 340px; display: flex; align-items: center; justify-content: center;
        }
        .wfb-ann-media img {
          max-width: 100%; max-height: 340px; object-fit: contain; border-radius: 8px;
        }
        .wfb-ann-media video {
          max-width: 100%; max-height: 340px; border-radius: 8px;
          outline: none;
        }
        .wfb-ann-close {
          font-family: var(--font, monospace);
          font-size: 13px; letter-spacing: .06em;
          padding: 11px 0; width: 100%;
          background: var(--accent, #5580ff);
          color: #fff; border: none; border-radius: 8px;
          cursor: pointer; transition: background .15s, transform .12s;
          margin-top: 4px;
        }
        .wfb-ann-close:hover { filter: brightness(1.15); transform: scale(1.02); }
      `;
      document.head.appendChild(css);

      var annShownKey = 'wfb_ann_shown';

      db.ref('announcement').on('value', function (snap) {
        /* Убираем старый оверлей если он есть */
        var old = document.getElementById('wfbAnnOverlay');
        if (old) old.remove();

        if (!snap.exists()) return;
        var ann = snap.val() || {};
        if (!ann.active) return;

        /* Не показываем повторно ту же версию если уже закрыл */
        var shownTs = localStorage.getItem(annShownKey);
        if (shownTs === String(ann.ts)) return;

        var overlay = document.createElement('div');
        overlay.className = 'wfb-ann-overlay';
        overlay.id = 'wfbAnnOverlay';

        var mediaHtml = '';
        if (ann.mediaUrl) {
          if (ann.mediaType === 'video') {
            mediaHtml = '<div class="wfb-ann-media"><video src="' + esc(ann.mediaUrl) + '" autoplay loop muted playsinline controls></video></div>';
          } else {
            mediaHtml = '<div class="wfb-ann-media"><img src="' + esc(ann.mediaUrl) + '" alt=""></div>';
          }
        }

        overlay.innerHTML =
          '<div class="wfb-ann-box">' +
            '<div class="wfb-ann-label">📢 Оповещение от администратора</div>' +
            (ann.text ? '<div class="wfb-ann-text">' + esc(ann.text) + '</div>' : '') +
            mediaHtml +
            '<button class="wfb-ann-close" id="wfbAnnClose">Понятно</button>' +
          '</div>';

        document.body.appendChild(overlay);

        document.getElementById('wfbAnnClose').addEventListener('click', function () {
          localStorage.setItem(annShownKey, String(ann.ts));
          overlay.style.animation = 'wfbAnnIn .3s ease reverse forwards';
          setTimeout(function () { overlay.remove(); }, 300);
        });
      });
    })();

    if (pid === 'main') return;

    /* Инициализируем поля страницы */
    var ref = db.ref('pages/' + pid);
    ref.once('value', function (snap) {
      var d = snap.val() || {}, upd = {};
      if (!d.views)        upd.views        = 0;
      if (!d.likes)        upd.likes        = 0;
      if (!d.commentCount) upd.commentCount = 0;
      if (Object.keys(upd).length) ref.update(upd);
    });

    ref.child('views').transaction(function (v) { return (v || 0) + 1; });

    injectUI(db, ref, pid);
  }

  /* ════════════════════════════════════════════════════
     LOGO FIX
  ════════════════════════════════════════════════════ */
  function fixLogoLink() {
    function doFix() {
      var el = document.getElementById('logoText');
      if (!el) return;
      var clone = el.cloneNode(true);
      if (el.tagName === 'A') {
        clone.href = 'main.html';
        clone.addEventListener('mouseenter', function () { clone.textContent = clone.dataset.hover || 'кто кто?'; });
        clone.addEventListener('mouseleave', function () { clone.textContent = clone.dataset.default || 'МапДев Вики'; });
        el.parentNode.replaceChild(clone, el);
      } else {
        var a = document.createElement('a');
        a.href = 'main.html';
        a.style.cssText = 'text-decoration:none;color:inherit;';
        a.appendChild(clone);
        clone.addEventListener('mouseenter', function () { clone.textContent = clone.dataset.hover || 'кто кто?'; });
        clone.addEventListener('mouseleave', function () { clone.textContent = clone.dataset.default || 'МапДев Вики'; });
        el.parentNode.replaceChild(a, el);
      }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', doFix);
    else doFix();
  }

  /* ════════════════════════════════════════════════════
     INJECT UI — лайки + комментарии + никнеймы
  ════════════════════════════════════════════════════ */
  function injectUI(db, ref, pid) {

    var COMMENT_CD = 5 * 60 * 1000;

    /* ── styles ── */
    var css = document.createElement('style');
    css.textContent = `
      .wfb-reactions{position:relative;z-index:2;display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:28px 0 0;}
      .wfb-like-btn{font-family:var(--font);font-size:13px;display:inline-flex;align-items:center;gap:8px;padding:9px 18px;background:transparent;border:1px solid var(--border2);border-radius:var(--radius);color:var(--text2);cursor:pointer;transition:all .15s;user-select:none;}
      .wfb-like-btn:hover{border-color:#ff4060;color:#ff4060;transform:scale(1.06);}
      .wfb-like-btn.liked{border-color:#ff4060;color:#ff4060;background:rgba(255,64,96,.1);}
      .wfb-like-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
      .wfb-like-btn .lheart{font-size:16px;transition:transform .2s;display:inline-block;}
      .wfb-like-btn:not(:disabled):hover .lheart,.wfb-like-btn.liked .lheart{transform:scale(1.35);}
      .wfb-views{font-family:var(--font);font-size:12px;color:var(--text2);display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--border);border-radius:var(--radius);}

      /* comments */
      .wfb-comments{margin-top:32px;position:relative;z-index:2;}
      .wfb-comments-title{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--text2);margin-bottom:14px;}
      .wfb-form{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;}
      .wfb-form-row{display:flex;gap:8px;}
      .wfb-cd-notice{font-size:11px;color:var(--text2);padding:4px 0;display:none;}
      .wfb-cd-notice.show{display:block;}
      .wfb-input{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font);font-size:13px;padding:9px 14px;outline:none;resize:none;transition:border-color .15s,box-shadow .15s;min-height:42px;max-height:120px;}
      .wfb-input:focus{border-color:var(--border2);box-shadow:0 0 0 2px var(--glow);}
      .wfb-input:disabled{opacity:.5;cursor:not-allowed;}
      .wfb-send{font-family:var(--font);font-size:12px;padding:9px 16px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius);cursor:pointer;flex-shrink:0;transition:background .15s,transform .12s;}
      .wfb-send:hover{background:var(--accent2);transform:scale(1.05);}
      .wfb-send:disabled{opacity:.4;cursor:not-allowed;transform:none;}

      /* who-am-i bar above form */
      .wfb-whoami{display:flex;align-items:center;gap:8px;margin-bottom:4px;}
      .wfb-nick-chip{font-family:var(--font);font-size:12px;color:var(--accent);
        border:1px solid var(--border2);border-radius:var(--radius);
        padding:4px 10px;letter-spacing:.04em;}
      .wfb-nick-hint{font-size:11px;color:var(--text2);}

      /* nickname popup overlay */
      .wfb-nick-overlay{
        position:fixed;inset:0;z-index:9000;
        background:rgba(0,0,0,.6);
        display:flex;align-items:center;justify-content:center;
        backdrop-filter:blur(4px);
        animation:wfbFadeIn .2s ease;
      }
      @keyframes wfbFadeIn{from{opacity:0}to{opacity:1}}
      .wfb-nick-modal{
        background:var(--bg2);
        border:1px solid var(--border2);
        border-radius:12px;
        padding:28px 28px 24px;
        max-width:360px;width:calc(100vw - 40px);
        box-shadow:0 20px 60px rgba(0,0,0,.6);
        display:flex;flex-direction:column;gap:16px;
        animation:wfbSlideUp .25s ease;
      }
      @keyframes wfbSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      .wfb-nick-modal-title{
        font-family:var(--font);font-size:16px;color:var(--text);letter-spacing:.05em;
      }
      .wfb-nick-modal-sub{
        font-size:12px;color:var(--text2);line-height:1.75;margin-top:-8px;
      }
      .wfb-nick-modal-warn{
        font-size:11px;
        background:rgba(255,160,0,.1);
        border:1px solid rgba(255,160,0,.35);
        border-radius:var(--radius);
        padding:8px 12px;
        color:rgba(255,180,40,.9);
        line-height:1.65;
      }
      .wfb-nick-field{
        background:var(--bg3);border:1px solid var(--border2);
        border-radius:var(--radius);color:var(--text);font-family:var(--font);
        font-size:15px;padding:11px 14px;outline:none;width:100%;box-sizing:border-box;
        transition:border-color .15s,box-shadow .15s;letter-spacing:.04em;
      }
      .wfb-nick-field:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--glow);}
      .wfb-nick-field-err{font-size:11px;color:#ff4060;min-height:16px;}
      .wfb-nick-confirm{
        font-family:var(--font);font-size:13px;padding:11px 0;
        background:var(--accent);color:#fff;border:none;border-radius:var(--radius);
        cursor:pointer;width:100%;transition:background .15s,transform .12s;letter-spacing:.05em;
      }
      .wfb-nick-confirm:hover{background:var(--accent2);transform:scale(1.02);}
      .wfb-nick-confirm:disabled{opacity:.4;cursor:not-allowed;transform:none;}

      /* comment list */
      .wfb-list{display:flex;flex-direction:column;gap:10px;}
      .wfb-comment{background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;animation:fadeUp .3s ease forwards;}
      .wfb-comment-meta{font-size:10px;color:var(--text2);margin-bottom:5px;display:flex;gap:10px;align-items:center;}
      .wfb-comment-nick{color:var(--accent);font-size:11px;letter-spacing:.04em;}
      .wfb-comment-text{font-size:12px;color:var(--text);line-height:1.7;word-break:break-word;}
      .wfb-empty{font-size:12px;color:var(--text2);opacity:.6;}
    `;
    document.head.appendChild(css);

    var wrap = document.querySelector('.article-body') || document.querySelector('.article-wrap');
    if (!wrap) return;

    /* ════════════════════════
       NICKNAME SYSTEM
    ════════════════════════ */
    var currentNick = null; /* null = ещё не загружен */
    var MY_UID = window.WikiDB.uid || DEVICE_ID; /* uid выдаётся сервером, подделать нельзя */
    var nickRef = db.ref('nicknames/' + safeKey(MY_UID));

    /* Загружаем ник из Firebase */
    function loadNick(cb) {
      nickRef.once('value', function (snap) {
        currentNick = snap.val() || null;
        cb(currentNick);
      });
    }

    /* Попап выбора никнейма */
    function showNickPopup(onConfirm) {
      var overlay = document.createElement('div');
      overlay.className = 'wfb-nick-overlay';
      overlay.innerHTML =
        '<div class="wfb-nick-modal">' +
          '<div class="wfb-nick-modal-title">✏️ Придумай себе ник</div>' +
          '<div class="wfb-nick-modal-sub">Он будет отображаться под всеми твоими комментариями на сайте.</div>' +
          '<div class="wfb-nick-modal-warn">' +
            '⚠️ <b>Ник нельзя будет изменить после подтверждения.</b> Выбирай внимательно!' +
          '</div>' +
          '<input class="wfb-nick-field" id="wfbNickField" type="text" maxlength="24" ' +
            'placeholder="от 2 до 24 символов..." autocomplete="off" spellcheck="false">' +
          '<div class="wfb-nick-field-err" id="wfbNickErr"></div>' +
          '<button class="wfb-nick-confirm" id="wfbNickConfirm">Подтвердить ник</button>' +
        '</div>';
      document.body.appendChild(overlay);

      var field   = document.getElementById('wfbNickField');
      var errEl   = document.getElementById('wfbNickErr');
      var confBtn = document.getElementById('wfbNickConfirm');

      /* Закрытие по клику на оверлей (не на модалку) */
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.remove();
      });

      field.focus();

      field.addEventListener('input', function () {
        errEl.textContent = '';
        confBtn.disabled = field.value.trim().length < 2;
      });
      confBtn.disabled = true;

      field.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') tryConfirm();
      });

      confBtn.addEventListener('click', tryConfirm);

      function tryConfirm() {
        var nick = field.value.trim();
        if (nick.length < 2) { errEl.textContent = 'Минимум 2 символа.'; return; }
        if (nick.length > 24) { errEl.textContent = 'Максимум 24 символа.'; return; }
        if (!/^[a-zA-Zа-яА-ЯёЁ0-9_\-. ]+$/.test(nick)) {
          errEl.textContent = 'Только буквы, цифры, _  –  .  пробел.'; return;
        }

        confBtn.disabled = true;
        confBtn.textContent = 'Сохраняем…';

        /* Проверяем что ник ещё не занят */
        db.ref('nick_index/' + safeKey(nick.toLowerCase())).once('value', function (snap) {
          if (snap.exists()) {
            errEl.textContent = 'Этот ник уже занят. Попробуй другой.';
            confBtn.disabled = false;
            confBtn.textContent = 'Подтвердить ник';
            return;
          }
          /* Резервируем ник — записываем индекс и профиль */
          var updates = {};
          updates['nick_index/' + safeKey(nick.toLowerCase())] = MY_UID;
          updates['nicknames/' + safeKey(MY_UID)] = nick;
          db.ref().update(updates, function (err) {
            if (err) {
              errEl.textContent = 'Ошибка сохранения. Попробуй ещё раз.';
              confBtn.disabled = false;
              confBtn.textContent = 'Подтвердить ник';
            } else {
              currentNick = nick;
              overlay.remove();
              onConfirm(nick);
            }
          });
        });
      }
    }

    /* ════════════════════════
       BUILD UI
    ════════════════════════ */

    /* Reactions row */
    var reactDiv = document.createElement('div');
    reactDiv.className = 'wfb-reactions';

    var likeBtn = document.createElement('button');
    likeBtn.className = 'wfb-like-btn';
    likeBtn.disabled  = true;
    likeBtn.innerHTML = '<span class="lheart">♥</span> <span class="lcount">…</span>';
    reactDiv.appendChild(likeBtn);

    var viewsBadge = document.createElement('div');
    viewsBadge.className = 'wfb-views';
    viewsBadge.innerHTML = '👁 <span class="vcount">…</span>';
    reactDiv.appendChild(viewsBadge);

    wrap.insertAdjacentElement('afterend', reactDiv);

    /* Comments block */
    var commDiv = document.createElement('div');
    commDiv.className = 'wfb-comments';
    commDiv.innerHTML =
      '<div class="wfb-comments-title">💬 комментарии</div>' +
      '<div class="wfb-form">' +
        '<div class="wfb-whoami" id="wfbWhoami" style="display:none;">' +
          '<span class="wfb-nick-hint">ты пишешь как</span>' +
          '<span class="wfb-nick-chip" id="wfbNickChip"></span>' +
        '</div>' +
        '<div class="wfb-form-row">' +
          '<textarea class="wfb-input" id="wfbInput" placeholder="Написать комментарий..." rows="1" maxlength="400" disabled></textarea>' +
          '<button class="wfb-send" id="wfbSend" disabled>Отправить</button>' +
        '</div>' +
        '<div class="wfb-cd-notice" id="wfbCdNotice">⏳ следующий комментарий можно через <b id="wfbCdLeft"></b></div>' +
      '</div>' +
      '<div class="wfb-list" id="wfbList"><div class="wfb-empty">Комментариев пока нет — будь первым!</div></div>';
    reactDiv.insertAdjacentElement('afterend', commDiv);

    var inp      = document.getElementById('wfbInput');
    var sndBtn   = document.getElementById('wfbSend');
    var cdNotice = document.getElementById('wfbCdNotice');
    var cdLeft   = document.getElementById('wfbCdLeft');
    var whoami   = document.getElementById('wfbWhoami');
    var nickChip = document.getElementById('wfbNickChip');

    /* Live counts */
    ref.child('likes').on('value', function (snap) {
      likeBtn.querySelector('.lcount').textContent = (snap.val() || 0) + ' лайков';
    });
    ref.child('views').on('value', function (snap) {
      viewsBadge.querySelector('.vcount').textContent = (snap.val() || 0) + ' просмотров';
    });

    /* Like */
    var liked = false;
    window.WikiDB.checkLike(pid, function (isLiked) {
      liked = isLiked;
      likeBtn.disabled = false;
      if (liked) likeBtn.classList.add('liked');
    });
    likeBtn.addEventListener('click', function () {
      if (likeBtn.disabled) return;
      likeBtn.disabled = true;
      window.WikiDB.toggleLike(pid, ref, liked, function (newLiked) {
        liked = newLiked;
        if (liked) likeBtn.classList.add('liked');
        else       likeBtn.classList.remove('liked');
        likeBtn.disabled = false;
      });
    });

    /* Cooldown logic */
    var commentUnlocked = false, cdInterval = null;

    function checkAndUnlockComment() {
      window.WikiDB.checkCooldown('comment_' + pid, COMMENT_CD, function (rem) {
        if (rem <= 0) unlockComment(); else lockComment(rem);
      });
    }
    function unlockComment() {
      commentUnlocked = true;
      inp.disabled = false; sndBtn.disabled = false;
      cdNotice.classList.remove('show');
      if (cdInterval) { clearInterval(cdInterval); cdInterval = null; }
    }
    function lockComment(ms) {
      commentUnlocked = false;
      inp.disabled = true; sndBtn.disabled = true;
      cdNotice.classList.add('show');
      var endsAt = Date.now() + ms;
      if (cdInterval) clearInterval(cdInterval);
      cdInterval = setInterval(function () {
        var left = Math.max(0, endsAt - Date.now());
        if (left <= 0) { clearInterval(cdInterval); cdInterval = null; checkAndUnlockComment(); return; }
        var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
        cdLeft.textContent = (m > 0 ? m + ' мин ' : '') + s + ' сек';
      }, 500);
      var l0 = Math.max(0, ms), m0 = Math.floor(l0/60000), s0 = Math.floor((l0%60000)/1000);
      cdLeft.textContent = (m0 > 0 ? m0 + ' мин ' : '') + s0 + ' сек';
    }

    /* Load nick, then unlock form */
    function setupFormWithNick(nick) {
      nickChip.textContent = nick;
      whoami.style.display = 'flex';
      inp.placeholder = 'Написать комментарий...';
      checkAndUnlockComment();
    }

    loadNick(function (nick) {
      if (nick) {
        setupFormWithNick(nick);
      } else {
        /* Нет ника — разблокируем поле но показываем подсказку */
        inp.disabled = false;
        inp.placeholder = 'Нажми «Отправить» — сначала выбери ник...';
        sndBtn.disabled = false;
      }
    });

    /* Send */
    function send() {
      var t = (inp.value || '').trim();
      if (!t) return;

      /* Если ника ещё нет — показываем попап */
      if (!currentNick) {
        showNickPopup(function (nick) {
          setupFormWithNick(nick);
          /* После выбора ника сразу отправляем */
          doSend(t);
          inp.value = '';
        });
        return;
      }

      if (!commentUnlocked) return;
      doSend(t);
      inp.value = '';
    }

    function doSend(text) {
      window.WikiDB.checkCooldown('comment_' + pid, COMMENT_CD, function (rem) {
        if (rem > 0) { lockComment(rem); return; }
        window.WikiDB.stampCooldown('comment_' + pid);
        ref.child('comments').push({ text: text, nick: currentNick, ts: Date.now(), deviceId: DEVICE_ID, uid: MY_UID });
        ref.child('commentCount').transaction(function (v) { return (v || 0) + 1; });
        lockComment(COMMENT_CD);
      });
    }

    sndBtn.addEventListener('click', send);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });

    /* Live comment list */
    var list = document.getElementById('wfbList');
    ref.child('comments').orderByChild('ts').limitToLast(30).on('value', function (snap) {
      if (!snap.exists()) {
        list.innerHTML = '<div class="wfb-empty">Комментариев пока нет — будь первым!</div>';
        return;
      }
      list.innerHTML = '';
      snap.forEach(function (ch) {
        var d  = ch.val();
        var dt = new Date(d.ts).toLocaleDateString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
        var nickHtml = d.nick
          ? '<span class="wfb-comment-nick">' + esc(d.nick) + '</span>'
          : '<span>аноним</span>';
        var el = document.createElement('div');
        el.className = 'wfb-comment';
        el.innerHTML =
          '<div class="wfb-comment-meta">' + nickHtml + '<span>' + dt + '</span></div>' +
          '<div class="wfb-comment-text">' + esc(d.text) + '</div>';
        list.appendChild(el);
      });
    });
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
