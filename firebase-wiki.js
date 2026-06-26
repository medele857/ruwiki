
const FIREBASE_CFG = {
  apiKey: "AIzaSyAID9ivHW94RB6eMB9qG4kVK7QfK2iStgc",
  authDomain: "ruwiki-f1ecb.firebaseapp.com",
  projectId: "ruwiki-f1ecb",
  storageBucket: "ruwiki-f1ecb.firebasestorage.app",
  messagingSenderId: "645896740533",
  appId: "1:645896740533:web:169a140bb01857fec0a8fc",
  databaseURL: "https://ruwiki-f1ecb-default-rtdb.firebaseio.com/"
};

// ── Load Firebase SDK dynamically ──
(function () {
  'use strict';

  /* inject firebase compat SDK */
  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src; s.onload = cb; document.head.appendChild(s);
  }

  var APP_URL  = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js';
  var DB_URL   = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js';

  loadScript(APP_URL, function () {
    loadScript(DB_URL, function () {
      initWiki();
    });
  });

  /* ────────────────────────────────────────────
     Determine page ID from URL
     e.g. studio-nautilus.html → "studio-nautilus"
          author-kekovich.html → "author-kekovich"
          main.html            → "main"
  ──────────────────────────────────────────── */
  function getPageId() {
    var path = window.location.pathname;
    var file = path.split('/').pop().replace('.html', '') || 'main';
    return file;
  }

  function initWiki() {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CFG);
    var db   = firebase.database();
    var pid  = getPageId();
    var ref  = db.ref('pages/' + pid);

    /* ── 1. Track views ── */
    ref.child('views').transaction(function (v) { return (v || 0) + 1; });

    /* ── 2. Public WikiDB for main.html ── */
    window.WikiDB = {
      db: db,
      getTopByField: function (field, limit, cb) {
        db.ref('pages').orderByChild(field).limitToLast(limit).once('value', function (snap) {
          var arr = [];
          snap.forEach(function (ch) {
            arr.push({ id: ch.key, data: ch.val() });
          });
          arr.reverse();
          cb(arr);
        });
      }
    };

    /* ── 3. Inject UI only on article pages (not main) ── */
    if (pid === 'main') return;

    injectArticleUI(db, ref, pid);
  }

  /* ════════════════════════════════════════════
     ARTICLE PAGE UI — likes + comments
  ════════════════════════════════════════════ */
  function injectArticleUI(db, ref, pid) {
    /* ── styles ── */
    var css = document.createElement('style');
    css.textContent = `
      .wiki-reactions {
        position: relative; z-index: 2;
        display: flex; align-items: center; gap: 14px;
        margin: 28px 0 0;
        flex-wrap: wrap;
      }
      .wiki-like-btn {
        font-family: var(--font);
        font-size: 13px;
        display: inline-flex; align-items: center; gap: 8px;
        padding: 9px 18px;
        background: transparent;
        border: 1px solid var(--border2);
        border-radius: var(--radius);
        color: var(--text2);
        cursor: pointer;
        transition: all .15s;
        user-select: none;
      }
      .wiki-like-btn:hover { border-color: var(--accent); color: var(--accent); transform: scale(1.06); }
      .wiki-like-btn.liked  { border-color: #ff4060; color: #ff4060; background: rgba(255,64,96,.08); }
      .wiki-like-btn .lheart { font-size: 16px; transition: transform .2s; }
      .wiki-like-btn:hover .lheart { transform: scale(1.3); }
      .wiki-like-btn.liked .lheart { transform: scale(1.2); }
      .wiki-views-badge {
        font-family: var(--font); font-size: 12px;
        color: var(--text2); display: flex; align-items: center; gap: 6px;
        padding: 8px 14px; border: 1px solid var(--border); border-radius: var(--radius);
      }

      /* Comments */
      .wiki-comments-section {
        margin-top: 36px; position: relative; z-index: 2;
      }
      .wiki-comments-title {
        font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
        color: var(--text2); margin-bottom: 14px;
      }
      .wiki-comment-form {
        display: flex; gap: 8px; margin-bottom: 18px;
      }
      .wiki-comment-input {
        flex: 1; background: var(--bg3); border: 1px solid var(--border);
        border-radius: var(--radius); color: var(--text); font-family: var(--font);
        font-size: 13px; padding: 9px 14px; outline: none; resize: none;
        transition: border-color .15s, box-shadow .15s;
        min-height: 42px; max-height: 120px;
      }
      .wiki-comment-input:focus { border-color: var(--border2); box-shadow: 0 0 0 2px var(--glow); }
      .wiki-comment-send {
        font-family: var(--font); font-size: 12px; padding: 9px 16px;
        background: var(--accent); color: #fff; border: none; border-radius: var(--radius);
        cursor: pointer; flex-shrink: 0; transition: background .15s, transform .12s;
      }
      .wiki-comment-send:hover { background: var(--accent2); transform: scale(1.05); }

      .wiki-comment-list { display: flex; flex-direction: column; gap: 10px; }
      .wiki-comment-item {
        background: var(--bg3); border: 1px solid var(--border);
        border-radius: var(--radius); padding: 10px 14px;
        animation: fadeUp .3s ease forwards;
      }
      .wiki-comment-meta {
        font-size: 10px; color: var(--text2); margin-bottom: 5px;
        display: flex; gap: 10px; align-items: center;
      }
      .wiki-comment-text { font-size: 12px; color: var(--text); line-height: 1.7; }
      .wiki-comments-empty { font-size: 12px; color: var(--text2); opacity: .6; }
    `;
    document.head.appendChild(css);

    /* ── Find article-links to insert before ── */
    var wrap = document.querySelector('.article-wrap') || document.querySelector('.article-body');
    if (!wrap) return;

    /* ── Reactions row ── */
    var reactEl = document.createElement('div');
    reactEl.className = 'wiki-reactions';

    var likeKey  = 'liked_' + pid;
    var liked    = localStorage.getItem(likeKey) === '1';

    var likeBtn  = document.createElement('button');
    likeBtn.className = 'wiki-like-btn' + (liked ? ' liked' : '');
    likeBtn.innerHTML = '<span class="lheart">♥</span> <span class="lcount">...</span>';
    reactEl.appendChild(likeBtn);

    var viewsBadge = document.createElement('div');
    viewsBadge.className = 'wiki-views-badge';
    viewsBadge.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg> <span class="vcount">...</span>';
    reactEl.appendChild(viewsBadge);

    /* Insert reactions after article-body */
    var body = document.querySelector('.article-body');
    if (body) body.insertAdjacentElement('afterend', reactEl);
    else wrap.appendChild(reactEl);

    /* ── Comments ── */
    var commSection = document.createElement('div');
    commSection.className = 'wiki-comments-section';
    commSection.innerHTML = `
      <div class="wiki-comments-title">💬 комментарии</div>
      <div class="wiki-comment-form">
        <textarea class="wiki-comment-input" placeholder="Написать комментарий..." rows="1" id="wikiCommentInput" maxlength="400"></textarea>
        <button class="wiki-comment-send" id="wikiCommentSend">Отправить</button>
      </div>
      <div class="wiki-comment-list" id="wikiCommentList">
        <div class="wiki-comments-empty">Комментариев пока нет — будь первым!</div>
      </div>
    `;
    reactEl.insertAdjacentElement('afterend', commSection);

    /* ── Live likes count ── */
    ref.child('likes').on('value', function (snap) {
      var n = snap.val() || 0;
      likeBtn.querySelector('.lcount').textContent = n + ' лайков';
    });

    /* ── Live views count ── */
    ref.child('views').on('value', function (snap) {
      viewsBadge.querySelector('.vcount').textContent = (snap.val() || 0) + ' просмотров';
    });

    /* ── Like button logic ── */
    likeBtn.addEventListener('click', function () {
      if (liked) {
        ref.child('likes').transaction(function (v) { return Math.max(0, (v || 0) - 1); });
        liked = false;
        localStorage.removeItem(likeKey);
        likeBtn.classList.remove('liked');
      } else {
        ref.child('likes').transaction(function (v) { return (v || 0) + 1; });
        liked = true;
        localStorage.setItem(likeKey, '1');
        likeBtn.classList.add('liked');
      }
    });

    /* ── Live comments ── */
    var commList = document.getElementById('wikiCommentList');
    ref.child('comments').orderByChild('ts').limitToLast(30).on('value', function (snap) {
      if (!snap.exists()) {
        commList.innerHTML = '<div class="wiki-comments-empty">Комментариев пока нет — будь первым!</div>';
        return;
      }
      commList.innerHTML = '';
      snap.forEach(function (ch) {
        var d = ch.val();
        var item = document.createElement('div');
        item.className = 'wiki-comment-item';
        var date = new Date(d.ts);
        var dateStr = date.toLocaleDateString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
        item.innerHTML = `
          <div class="wiki-comment-meta"><span>аноним</span><span>${dateStr}</span></div>
          <div class="wiki-comment-text">${escapeHtml(d.text)}</div>
        `;
        commList.appendChild(item);
      });
    });

    /* ── Send comment ── */
    var input = document.getElementById('wikiCommentInput');
    var sendBtn = document.getElementById('wikiCommentSend');

    function sendComment() {
      var text = (input.value || '').trim();
      if (!text) return;
      ref.child('comments').push({ text: text, ts: Date.now() });
      ref.child('commentCount').transaction(function (v) { return (v || 0) + 1; });
      input.value = '';
    }
    sendBtn.addEventListener('click', sendComment);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); }
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
