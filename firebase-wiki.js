
(function () {
  'use strict';

  /* ── Firebase config ── */
  var FIREBASE_CFG = {
    apiKey:            "AIzaSyAID9ivHW94RB6eMB9qG4kVK7QfK2iStgc",
    authDomain:        "ruwiki-f1ecb.firebaseapp.com",
    projectId:         "ruwiki-f1ecb",
    storageBucket:     "ruwiki-f1ecb.firebasestorage.app",
    messagingSenderId: "645896740533",
    appId:             "1:645896740533:web:169a140bb01857fec0a8fc",
    databaseURL:       "https://ruwiki-f1ecb-default-rtdb.europe-west1.firebasedatabase.app"
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
      boot();
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
    var db  = firebase.database();
    var pid = getPageId();

    fixLogoLink();

    /* Онлайн-присутствие */
    var onlineRef = db.ref('online').push();
    onlineRef.set(true);
    onlineRef.onDisconnect().remove();

    /* ── Глобальный WikiDB ── */
    window.WikiDB = {
      db:       db,
      deviceId: DEVICE_ID,
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
    };

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
     INJECT UI — лайки + комментарии
  ════════════════════════════════════════════════════ */
  function injectUI(db, ref, pid) {

    var COMMENT_CD = 5 * 60 * 1000; /* 5 минут */

    /* styles */
    var css = document.createElement('style');
    css.textContent = `
      .wfb-reactions{position:relative;z-index:2;display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:28px 0 0;}
      .wfb-like-btn{font-family:var(--font);font-size:13px;display:inline-flex;align-items:center;gap:8px;padding:9px 18px;background:transparent;border:1px solid var(--border2);border-radius:var(--radius);color:var(--text2);cursor:pointer;transition:all .15s;user-select:none;}
      .wfb-like-btn:hover{border-color:#ff4060;color:#ff4060;transform:scale(1.06);}
      .wfb-like-btn.liked{border-color:#ff4060;color:#ff4060;background:rgba(255,64,96,.1);}
      .wfb-like-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
      .wfb-like-btn .lheart{font-size:16px;transition:transform .2s;display:inline-block;}
      .wfb-like-btn:not(:disabled):hover .lheart,
      .wfb-like-btn.liked .lheart{transform:scale(1.35);}
      .wfb-views{font-family:var(--font);font-size:12px;color:var(--text2);display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--border);border-radius:var(--radius);}
      .wfb-comments{margin-top:32px;position:relative;z-index:2;}
      .wfb-comments-title{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--text2);margin-bottom:14px;}
      .wfb-form{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;}
      .wfb-form-row{display:flex;gap:8px;}
      .wfb-cd-notice{font-size:11px;color:var(--text2);padding:6px 0;display:none;}
      .wfb-cd-notice.show{display:block;}
      .wfb-input{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font);font-size:13px;padding:9px 14px;outline:none;resize:none;transition:border-color .15s,box-shadow .15s;min-height:42px;max-height:120px;}
      .wfb-input:focus{border-color:var(--border2);box-shadow:0 0 0 2px var(--glow);}
      .wfb-input:disabled{opacity:.5;cursor:not-allowed;}
      .wfb-send{font-family:var(--font);font-size:12px;padding:9px 16px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius);cursor:pointer;flex-shrink:0;transition:background .15s,transform .12s;}
      .wfb-send:hover{background:var(--accent2);transform:scale(1.05);}
      .wfb-send:disabled{opacity:.4;cursor:not-allowed;transform:none;}
      .wfb-list{display:flex;flex-direction:column;gap:10px;}
      .wfb-comment{background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;animation:fadeUp .3s ease forwards;}
      .wfb-comment-meta{font-size:10px;color:var(--text2);margin-bottom:5px;display:flex;gap:10px;}
      .wfb-comment-text{font-size:12px;color:var(--text);line-height:1.7;word-break:break-word;}
      .wfb-empty{font-size:12px;color:var(--text2);opacity:.6;}
    `;
    document.head.appendChild(css);

    var wrap = document.querySelector('.article-body') || document.querySelector('.article-wrap');
    if (!wrap) return;

    /* ── Reactions row ── */
    var reactDiv = document.createElement('div');
    reactDiv.className = 'wfb-reactions';

    var likeBtn = document.createElement('button');
    likeBtn.className = 'wfb-like-btn';
    likeBtn.disabled  = true; /* до загрузки из Firebase */
    likeBtn.innerHTML = '<span class="lheart">♥</span> <span class="lcount">…</span>';
    reactDiv.appendChild(likeBtn);

    var viewsBadge = document.createElement('div');
    viewsBadge.className = 'wfb-views';
    viewsBadge.innerHTML = '👁 <span class="vcount">…</span>';
    reactDiv.appendChild(viewsBadge);

    wrap.insertAdjacentElement('afterend', reactDiv);

    /* ── Comments block ── */
    var commDiv = document.createElement('div');
    commDiv.className = 'wfb-comments';
    commDiv.innerHTML =
      '<div class="wfb-comments-title">💬 комментарии</div>' +
      '<div class="wfb-form">' +
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

    /* ── Live counts ── */
    ref.child('likes').on('value', function (snap) {
      likeBtn.querySelector('.lcount').textContent = (snap.val() || 0) + ' лайков';
    });
    ref.child('views').on('value', function (snap) {
      viewsBadge.querySelector('.vcount').textContent = (snap.val() || 0) + ' просмотров';
    });

    /* ── Like — проверяем состояние из Firebase ── */
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

    /* ── Comment cooldown — проверяем из Firebase ── */
    var commentUnlocked = false;
    var cdInterval = null;

    function checkAndUnlockComment() {
      window.WikiDB.checkCooldown('comment_' + pid, COMMENT_CD, function (remaining) {
        if (remaining <= 0) {
          unlockComment();
        } else {
          lockComment(remaining);
        }
      });
    }

    function unlockComment() {
      commentUnlocked = true;
      inp.disabled    = false;
      sndBtn.disabled = false;
      cdNotice.classList.remove('show');
      if (cdInterval) { clearInterval(cdInterval); cdInterval = null; }
    }

    function lockComment(remainingMs) {
      commentUnlocked = false;
      inp.disabled    = true;
      sndBtn.disabled = true;
      cdNotice.classList.add('show');

      var endsAt = Date.now() + remainingMs;

      if (cdInterval) clearInterval(cdInterval);
      cdInterval = setInterval(function () {
        var left = Math.max(0, endsAt - Date.now());
        if (left <= 0) {
          clearInterval(cdInterval); cdInterval = null;
          /* Перепроверяем из Firebase (на случай если часы разошлись) */
          checkAndUnlockComment();
          return;
        }
        var m = Math.floor(left / 60000);
        var s = Math.floor((left % 60000) / 1000);
        cdLeft.textContent = (m > 0 ? m + ' мин ' : '') + s + ' сек';
      }, 500);

      /* первый показ */
      var left = Math.max(0, remainingMs);
      var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      cdLeft.textContent = (m > 0 ? m + ' мин ' : '') + s + ' сек';
    }

    checkAndUnlockComment();

    /* ── Send comment ── */
    function send() {
      if (!commentUnlocked) return;
      var t = (inp.value || '').trim();
      if (!t) return;

      /* Ещё раз проверяем КД в Firebase перед отправкой (защита от гонок) */
      window.WikiDB.checkCooldown('comment_' + pid, COMMENT_CD, function (remaining) {
        if (remaining > 0) {
          lockComment(remaining);
          return;
        }
        /* Ставим метку СНАЧАЛА, потом пишем комментарий */
        window.WikiDB.stampCooldown('comment_' + pid);
        ref.child('comments').push({ text: t, ts: Date.now() });
        ref.child('commentCount').transaction(function (v) { return (v || 0) + 1; });
        inp.value = '';
        lockComment(COMMENT_CD);
      });
    }
    sndBtn.addEventListener('click', send);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });

    /* ── Live comments list ── */
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
        var el = document.createElement('div');
        el.className = 'wfb-comment';
        el.innerHTML = '<div class="wfb-comment-meta"><span>аноним</span><span>' + dt + '</span></div>'
                     + '<div class="wfb-comment-text">' + esc(d.text) + '</div>';
        list.appendChild(el);
      });
    });
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
