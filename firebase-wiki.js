
(function () {
  'use strict';

  var FIREBASE_CFG = {
    apiKey:            "AIzaSyAID9ivHW94RB6eMB9qG4kVK7QfK2iStgc",
    authDomain:        "ruwiki-f1ecb.firebaseapp.com",
    projectId:         "ruwiki-f1ecb",
    storageBucket:     "ruwiki-f1ecb.firebasestorage.app",
    messagingSenderId: "645896740533",
    appId:             "1:645896740533:web:169a140bb01857fec0a8fc",
    databaseURL:       "https://ruwiki-f1ecb-default-rtdb.firebaseio.com"
};
  var WIKI_ENTRIES = {
    'studio-cubikarti':  { name:'Куби карты',   logo:'cubikarti.png',        type:'Студия',       url:'studio-cubikarti.html' },
    'studio-qwer':       { name:'Qwer Team',     logo:'banka.png',            type:'Студия',       url:'studio-qwer.html' },
    'studio-zerooone':   { name:'Zero One',      logo:'zo.jpg',               type:'Студия',       url:'studio-zerooone.html' },
    'studio-yourstory':  { name:'YourStory',     logo:'yst_ava.jpg',          type:'Команда',      url:'studio-yourstory.html' },
    'studio-nautilus':   { name:'Наутилус',      logo:'nautilus_ava.jpg',     type:'Студия',       url:'studio-nautilus.html' },
    'studio-spade':      { name:'Spade Studio',  logo:'spade_studio_ava.png', type:'Команда',      url:'studio-spade.html' },
    'studio-kts':        { name:'KTS',           logo:'kts_ava.jpg',          type:'Мини-команда', url:'studio-kts.html' },
    'author-nateshapiro':{ name:'NateShapiro',   logo:'nate_ava.png',         type:'Автор',        url:'author-nateshapiro.html' },
    'author-kekovich':   { name:'kekovich_lol',  logo:'kek_ava.png',          type:'Автор',        url:'author-kekovich.html' },
    'blogger-r1lame':    { name:'r1lame',        logo:'r1.jpg',               type:'Блогер',       url:'blogger-r1lame.html' },
  };

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

  function boot() {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CFG);
    var db  = firebase.database();
    var pid = getPageId();

    // ── FIX: логотип → главная БЕЗ звука на всех страницах ──
    fixLogoLink();

    // ── Онлайн-присутствие (для админки) ──
    var onlineRef = db.ref('online').push();
    onlineRef.set(true);
    onlineRef.onDisconnect().remove();

    // ── Глобальный WikiDB ──
    window.WikiDB = {
      db: db,
      entries: WIKI_ENTRIES,
      getTopByField: function (field, limit, cb) {
        db.ref('pages').once('value', function (snap) {
          var arr = [];
          if (snap.exists()) {
            snap.forEach(function (ch) {
              var val = ch.val() || {};
              // только известные страницы вики
              if (WIKI_ENTRIES[ch.key]) {
                arr.push({ id: ch.key, data: val, fieldVal: Number(val[field]) || 0 });
              }
            });
          }
          arr.sort(function (a, b) { return b.fieldVal - a.fieldVal; });
          // если нет данных вообще — вернём любые известные записи с 0
          if (arr.length === 0) {
            var keys = Object.keys(WIKI_ENTRIES);
            keys.slice(0, limit).forEach(function(k){
              arr.push({ id: k, data: {}, fieldVal: 0 });
            });
          }
          cb(arr.slice(0, limit));
        });
      }
    };

    // ── На главной странице: только WikiDB, без UI статей ──
    if (pid === 'main') return;

    // ── Счётчик просмотров только на страницах статей ──
    var ref = db.ref('pages/' + pid);

    // Инициализируем поля если их нет (чтобы Firebase мог сортировать)
    ref.once('value', function(snap) {
      var d = snap.val() || {};
      var upd = {};
      if (!d.views)        upd.views        = 0;
      if (!d.likes)        upd.likes        = 0;
      if (!d.commentCount) upd.commentCount = 0;
      if (Object.keys(upd).length) ref.update(upd);
    });

    ref.child('views').transaction(function (v) { return (v || 0) + 1; });

    injectUI(db, ref, pid);
  }

  // ════════════════════════════════════════
  //  FIX: МапДев Вики → main.html, NO sound
  // ════════════════════════════════════════
  function fixLogoLink() {
    // Ждём DOM если ещё не готов
    function doFix() {
      var logoText = document.getElementById('logoText');
      if (!logoText) return;

      // Убираем все старые слушатели — заменяем элемент клоном
      var clone = logoText.cloneNode(true);

      // Делаем ссылкой если ещё не ссылка
      var link;
      if (logoText.tagName === 'A') {
        link = clone;
        link.href = 'main.html';
      } else {
        // оборачиваем в <a>
        link = document.createElement('a');
        link.href = 'main.html';
        link.style.cssText = 'text-decoration:none;color:inherit;';
        link.appendChild(clone);
      }

      // hover текст
      function setDefault(){ (clone.tagName === 'A' ? clone : clone).textContent = clone.dataset.default || 'МапДев Вики'; }
      function setHover()  { (clone.tagName === 'A' ? clone : clone).textContent = clone.dataset.hover   || 'кто кто?'; }

      clone.addEventListener('mouseenter', setHover);
      clone.addEventListener('mouseleave', setDefault);
      // клик — просто переход по href, звука НЕТ

      if (logoText.tagName === 'A') {
        logoText.parentNode.replaceChild(clone, logoText);
      } else {
        logoText.parentNode.replaceChild(link, logoText);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', doFix);
    } else {
      doFix();
    }
  }

  /* ════════════════════════════════════════════
     UI лайков + комментариев на страницах статей
  ════════════════════════════════════════════ */
  function injectUI(db, ref, pid) {
    var css = document.createElement('style');
    css.textContent = `
      .wfb-reactions{position:relative;z-index:2;display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:28px 0 0;}
      .wfb-like-btn{font-family:var(--font);font-size:13px;display:inline-flex;align-items:center;gap:8px;padding:9px 18px;background:transparent;border:1px solid var(--border2);border-radius:var(--radius);color:var(--text2);cursor:pointer;transition:all .15s;user-select:none;}
      .wfb-like-btn:hover{border-color:#ff4060;color:#ff4060;transform:scale(1.06);}
      .wfb-like-btn.liked{border-color:#ff4060;color:#ff4060;background:rgba(255,64,96,.1);}
      .wfb-like-btn .lheart{font-size:16px;transition:transform .2s;display:inline-block;}
      .wfb-like-btn:hover .lheart,.wfb-like-btn.liked .lheart{transform:scale(1.35);}
      .wfb-views{font-family:var(--font);font-size:12px;color:var(--text2);display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--border);border-radius:var(--radius);}
      .wfb-comments{margin-top:32px;position:relative;z-index:2;}
      .wfb-comments-title{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--text2);margin-bottom:14px;}
      .wfb-form{display:flex;gap:8px;margin-bottom:16px;}
      .wfb-input{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font);font-size:13px;padding:9px 14px;outline:none;resize:none;transition:border-color .15s,box-shadow .15s;min-height:42px;max-height:120px;}
      .wfb-input:focus{border-color:var(--border2);box-shadow:0 0 0 2px var(--glow);}
      .wfb-send{font-family:var(--font);font-size:12px;padding:9px 16px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius);cursor:pointer;flex-shrink:0;transition:background .15s,transform .12s;}
      .wfb-send:hover{background:var(--accent2);transform:scale(1.05);}
      .wfb-list{display:flex;flex-direction:column;gap:10px;}
      .wfb-comment{background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;animation:fadeUp .3s ease forwards;}
      .wfb-comment-meta{font-size:10px;color:var(--text2);margin-bottom:5px;display:flex;gap:10px;}
      .wfb-comment-text{font-size:12px;color:var(--text);line-height:1.7;word-break:break-word;}
      .wfb-empty{font-size:12px;color:var(--text2);opacity:.6;}
    `;
    document.head.appendChild(css);

    var wrap = document.querySelector('.article-body') || document.querySelector('.article-wrap');
    if (!wrap) return;

    var likedKey = 'liked_' + pid;
    var liked    = localStorage.getItem(likedKey) === '1';

    var reactDiv = document.createElement('div');
    reactDiv.className = 'wfb-reactions';

    var likeBtn = document.createElement('button');
    likeBtn.className = 'wfb-like-btn' + (liked ? ' liked' : '');
    likeBtn.innerHTML = '<span class="lheart">♥</span> <span class="lcount">…</span>';
    reactDiv.appendChild(likeBtn);

    var viewsBadge = document.createElement('div');
    viewsBadge.className = 'wfb-views';
    viewsBadge.innerHTML = '👁 <span class="vcount">…</span>';
    reactDiv.appendChild(viewsBadge);

    wrap.insertAdjacentElement('afterend', reactDiv);

    var commDiv = document.createElement('div');
    commDiv.className = 'wfb-comments';
    commDiv.innerHTML =
      '<div class="wfb-comments-title">💬 комментарии</div>' +
      '<div class="wfb-form">' +
        '<textarea class="wfb-input" id="wfbInput" placeholder="Написать комментарий..." rows="1" maxlength="400"></textarea>' +
        '<button class="wfb-send" id="wfbSend">Отправить</button>' +
      '</div>' +
      '<div class="wfb-list" id="wfbList"><div class="wfb-empty">Комментариев пока нет — будь первым!</div></div>';
    reactDiv.insertAdjacentElement('afterend', commDiv);

    ref.child('likes').on('value', function (snap) {
      likeBtn.querySelector('.lcount').textContent = (snap.val() || 0) + ' лайков';
    });
    ref.child('views').on('value', function (snap) {
      viewsBadge.querySelector('.vcount').textContent = (snap.val() || 0) + ' просмотров';
    });

    likeBtn.addEventListener('click', function () {
      if (liked) {
        ref.child('likes').transaction(function (v) { return Math.max(0, (v || 0) - 1); });
        liked = false; localStorage.removeItem(likedKey);
        likeBtn.classList.remove('liked');
      } else {
        ref.child('likes').transaction(function (v) { return (v || 0) + 1; });
        liked = true; localStorage.setItem(likedKey, '1');
        likeBtn.classList.add('liked');
      }
    });

    var list = document.getElementById('wfbList');
    ref.child('comments').orderByChild('ts').limitToLast(30).on('value', function (snap) {
      if (!snap.exists()) {
        list.innerHTML = '<div class="wfb-empty">Комментариев пока нет — будь первым!</div>';
        return;
      }
      list.innerHTML = '';
      snap.forEach(function (ch) {
        var d = ch.val();
        var dt = new Date(d.ts).toLocaleDateString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
        var el = document.createElement('div');
        el.className = 'wfb-comment';
        el.innerHTML = '<div class="wfb-comment-meta"><span>аноним</span><span>' + dt + '</span></div>'
                     + '<div class="wfb-comment-text">' + esc(d.text) + '</div>';
        list.appendChild(el);
      });
    });

    var inp = document.getElementById('wfbInput');
    var snd = document.getElementById('wfbSend');
    function send() {
      var t = (inp.value || '').trim();
      if (!t) return;
      ref.child('comments').push({ text: t, ts: Date.now() });
      ref.child('commentCount').transaction(function (v) { return (v || 0) + 1; });
      inp.value = '';
    }
    snd.addEventListener('click', send);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
