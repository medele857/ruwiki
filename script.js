/* ════════════════════════════════════════
   RUMAPDEV WIKI — SCRIPT v4 (fixed)
   ════════════════════════════════════════ */

// ══════════════════════════════════
// 0.  APOLOGY GATE  (runs on every page)
// ══════════════════════════════════
(function apologyGate() {
  const path = window.location.pathname;
  // skip the gate on these pages
  if (/apology|intro|counter|index|settings/.test(path)) return;
  if (localStorage.getItem('headBanned') === '1') {
    window.location.replace('apology.html');
  }
})();

// ══════════════════════════════════
// 1.  THEME
// ══════════════════════════════════
const html      = document.documentElement;
const themeBtn  = document.getElementById('themeToggle');
const themeIcon = themeBtn && themeBtn.querySelector('.theme-icon');

applyTheme(localStorage.getItem('theme') || 'dark');

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
    playClick();
  });
}

function applyTheme(t) {
  html.dataset.theme = t;
  if (themeIcon) themeIcon.textContent = t === 'dark' ? '🌙' : '☀️';
}

// ══════════════════════════════════
// 2.  AUDIO BLEEPS
// ══════════════════════════════════
var _actx = null;
function getACtx() {
  if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
  return _actx;
}

function playBleep(f1, f2, dur, vol) {
  try {
    var ctx = getACtx();
    var osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(f1, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f2, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur + 0.04);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur + 0.06);
  } catch(e) {}
}

function playScreamerNoise() {
  try {
    var ctx = getACtx();
    var len = ctx.sampleRate * 1.5;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d   = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random()*2-1) * (1 - i/len);
    var src  = ctx.createBufferSource();
    src.buffer = buf;
    var gain = ctx.createGain(); gain.gain.value = 1.0;
    src.connect(gain); gain.connect(ctx.destination);
    src.start();
  } catch(e) {}
}

function playHover() { playBleep(880, 1100, 0.06, 0.055); }
function playClick() { playBleep(440, 700,  0.08, 0.07);  }

// hover sound removed per user request

// ══════════════════════════════════
// 3.  LOGO TEXT HOVER  +  GALOCHKA
// ══════════════════════════════════
var logoText      = document.getElementById('logoText');
var galochkaAudio = document.getElementById('galochkaAudio');

if (logoText) {
  logoText.addEventListener('mouseenter', function() {
    logoText.textContent = logoText.dataset.hover;
  });
  logoText.addEventListener('mouseleave', function() {
    logoText.textContent = logoText.dataset.default;
  });
  logoText.addEventListener('click', function() {
    if (galochkaAudio) { galochkaAudio.currentTime = 0; galochkaAudio.play().catch(function(){}); }
    playClick();
  });
}

// SECRET: click logo IMG → counter
var logoImg = document.getElementById('logoImg');
if (logoImg) {
  logoImg.style.cursor = 'pointer';
  logoImg.addEventListener('click', function() {
    window.location.href = 'counter.html';
  });
}

// ══════════════════════════════════
// 4.  MEME BUTTON
// ══════════════════════════════════
var MEMES = [
  'https://www.reddit.com/r/minecraftmemes/',
  'https://pikabu.ru/tag/%D0%BC%D0%B0%D0%B9%D0%BD%D0%BA%D1%80%D0%B0%D1%84%D1%82/hot',
  'https://9gag.com/tag/minecraft-meme',
  'https://memedroid.com/memes/tag/minecraft',
  'https://knowyourmeme.com/memes/subcultures/minecraft',
  'https://pikabu.ru/story/minekraft_memy_9565183',
  'https://risovach.ru/search/?q=%D0%BC%D0%B0%D0%B9%D0%BD%D0%BA%D1%80%D0%B0%D1%84%D1%82',
  'https://www.reddit.com/r/Minecraft/search/?q=meme&sort=top&t=all',
];
var memBtn = document.getElementById('memBtn');
if (memBtn) {
  memBtn.addEventListener('click', function() {
    playClick();
    window.open(MEMES[Math.floor(Math.random() * MEMES.length)], '_blank');
  });
}

// ══════════════════════════════════
// 5.  SITE TIME COUNTER (background tick)
// ══════════════════════════════════
setInterval(function() {
  var v = parseInt(localStorage.getItem('siteTimeSec') || '0', 10);
  localStorage.setItem('siteTimeSec', v + 1);
}, 1000);

// ══════════════════════════════════
// 6.  HEADER SCROLL SHADOW
// ══════════════════════════════════
var siteHeader = document.querySelector('.site-header');
if (siteHeader) {
  window.addEventListener('scroll', function() {
    siteHeader.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,.4)' : 'none';
  });
}

// ══════════════════════════════════
// 7.  FOXY SCREAMER  (3 min = 180s)
// ══════════════════════════════════
var FOXY_SECS = 180;
var sessionSec = 0;
var foxyFired  = false;

var foxyInterval = setInterval(function() {
  sessionSec++;
  if (sessionSec >= FOXY_SECS && !foxyFired) {
    foxyFired = true;
    clearInterval(foxyInterval);
    triggerFoxyScreamer();
  }
}, 1000);

function triggerFoxyScreamer() {
  var overlay = document.getElementById('foxyScreamer');
  if (!overlay) return;

  var vid = document.getElementById('foxyVideo');
  overlay.style.display = 'flex';

  if (vid) {
    vid.currentTime = 0;
    vid.play().catch(function(){});
    vid.onended = function() {
      overlay.style.display = 'none';
    };
  } else {
    setTimeout(function() { overlay.style.display = 'none'; }, 4000);
  }
}

var foxyOverlay = document.getElementById('foxyScreamer');
if (foxyOverlay) {
  foxyOverlay.addEventListener('click', function() {
    var vid = document.getElementById('foxyVideo');
    if (vid) { vid.pause(); }
    foxyOverlay.style.display = 'none';
  });
}

// ══════════════════════════════════
// 8.  DRAGGABLE HEAD  +  HEAD SCREAMER
// ══════════════════════════════════
var headWrap   = document.getElementById('headWrap');
var headBubble = document.getElementById('headBubble');

if (headWrap && headBubble) {

  // ── counters ──
  var BAN_KEY      = 'headBanCount';
  var throwOuts    = parseInt(localStorage.getItem(BAN_KEY) || '0', 10);
  var SCREAMER_AT  = 3;  // trigger screamer on 3rd throw-out

  // ── phrase pools ──
  var PH_NORMAL = [
    'йо, не трогай меня',
    'чел ты чё, я тут живу',
    'ладно ладно, потаскай меня',
    'а ты знал что ру мапдев существует?',
    'эй, отпусти!!',
    'мне не нравится когда меня бросают',
    'кинь меня в стену, интересно что будет',
    'я голова. просто голова.',
    'вернул меня? уважаю',
    'буду висеть тут пока не надоем',
    'моя мечта — стать маппером',
    'ты читаешь это? норм',
    'зачем ты это делаешь',
    'я смотрю на тебя',
    'хватит меня таскать',
    'кто придумал говорящие головы на сайтах',
    'передвинь меня к кнопке "авторы"',
    'мне понравилось что ты меня поднял',
    'я знаю всё про ру мапдев',
    'тащи меня куда хочешь',
  ];
  var PH_ANGRY = [
    'ТЫ ВЫБРОСИЛ МЕНЯ ЗА САЙТ',
    'там было так холодно...',
    'я летел в пустоту из-за тебя',
    'ИЗВИНИСЬ НЕМЕДЛЕННО',
    'я требую компенсацию',
    'знаешь как это — быть выброшенным?',
    'ещё раз и я не прощу',
    'ИЗВИНИСЬ. ПРЯМО СЕЙЧАС.',
    'ты думал я не вернусь?',
    'я вернулся. и я злой.',
    'сделай это ещё раз — пожалеешь',
    'мне пришлось ползти через границу экрана',
  ];
  var PH_THROW = ['АА!!','АААА!','лети!','не так сильно!!','ловите меня!','ПУСТИТЕ'];

  var isAngry        = false;
  var lastBubbleTime = 0;
  var BUBBLE_CD      = 5000;
  var bubbleTimer    = null;
  var idleTimer      = null;

  function canSpeak() { return Date.now() - lastBubbleTime >= BUBBLE_CD; }

  function speak(text, force) {
    if (!force && !canSpeak()) return;
    clearTimeout(bubbleTimer);
    lastBubbleTime = Date.now();
    headBubble.textContent = text;
    headBubble.classList.add('visible');
    headBubble.style.borderColor = isAngry ? '#e05555' : '';
    bubbleTimer = setTimeout(function() { headBubble.classList.remove('visible'); }, 4200);
  }

  function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function scheduleIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function() {
      speak(randFrom(isAngry ? PH_ANGRY : PH_NORMAL));
      scheduleIdle();
    }, 9000 + Math.random() * 7000);
  }

  // first greeting
  setTimeout(function() { speak(PH_NORMAL[0], true); scheduleIdle(); }, 2000);

  // ── drag state ──
  var dragging  = false;
  var startX, startY;
  var velX = 0, velY = 0;
  var lastX, lastY, lastT;
  var animId = null;
  var posInited = false;

  // Convert bottom/right CSS to absolute top/left once
  function initPos() {
    if (posInited) return;
    posInited = true;
    var r = headWrap.getBoundingClientRect();
    headWrap.style.position = 'fixed';
    headWrap.style.left   = r.left + 'px';
    headWrap.style.top    = r.top  + 'px';
    headWrap.style.right  = 'auto';
    headWrap.style.bottom = 'auto';
  }

  function cx(e) { return e.touches ? e.touches[0].clientX : e.clientX; }
  function cy(e) { return e.touches ? e.touches[0].clientY : e.clientY; }

  function onDown(e) {
    e.preventDefault();
    initPos();
    cancelAnimationFrame(animId);
    dragging = true;
    headWrap.classList.add('dragging');
    startX = cx(e) - parseFloat(headWrap.style.left);
    startY = cy(e) - parseFloat(headWrap.style.top);
    lastX = cx(e); lastY = cy(e); lastT = Date.now();
    if (canSpeak()) speak(randFrom(isAngry ? PH_ANGRY : PH_NORMAL), true);
  }

  function onMove(e) {
    if (!dragging) return;
    var now = Date.now(), dt = Math.max(now - lastT, 1);
    velX = (cx(e) - lastX) / dt * 16;
    velY = (cy(e) - lastY) / dt * 16;
    lastX = cx(e); lastY = cy(e); lastT = now;
    headWrap.style.left = (cx(e) - startX) + 'px';
    headWrap.style.top  = (cy(e) - startY) + 'px';
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    headWrap.classList.remove('dragging');

    var left = parseFloat(headWrap.style.left);
    var top  = parseFloat(headWrap.style.top);
    var W = window.innerWidth, H = window.innerHeight;
    var hw = headWrap.offsetWidth || 80, hh = headWrap.offsetHeight || 80;

    // "outside" = center of head is outside viewport
    var cx2 = left + hw / 2, cy2 = top + hh / 2;
    var outside = cx2 < 0 || cx2 > W || cy2 < 0 || cy2 > H;

    if (outside) {
      headWrap.style.display = 'none';
      throwOuts++;
      localStorage.setItem(BAN_KEY, throwOuts);

      if (throwOuts >= SCREAMER_AT) {
        setTimeout(triggerHeadScreamer, 400);
      } else {
        // return after 3s, angry
        setTimeout(function() {
          headWrap.style.display = '';
          headWrap.style.left = (W - hw - 40) + 'px';
          headWrap.style.top  = (H - hh - 40) + 'px';
          velX = 0; velY = 0;
          isAngry = true;
          headWrap.classList.add('angry');
          setTimeout(function() {
            speak(randFrom(PH_ANGRY), true);
            scheduleIdle();
          }, 300);
        }, 3000);
      }
    } else {
      // normal throw physics
      var speed = Math.sqrt(velX*velX + velY*velY);
      if (speed > 3) {
        speak(randFrom(PH_THROW), true);
        animateThrow(W, H);
      } else if (canSpeak()) {
        speak(randFrom(isAngry ? PH_ANGRY : PH_NORMAL));
      }
      scheduleIdle();
    }
  }

  function animateThrow(W, H) {
    var left = parseFloat(headWrap.style.left);
    var top  = parseFloat(headWrap.style.top);
    var hw   = headWrap.offsetWidth, hh = headWrap.offsetHeight;
    var friction = 0.87;

    function step() {
      velX *= friction; velY *= friction; velY += 0.45;
      left += velX; top += velY;
      var maxX = W - hw, maxY = H - hh;
      if (left < 0)    { left = 0;    velX = Math.abs(velX) * 0.5; }
      if (left > maxX) { left = maxX; velX = -Math.abs(velX) * 0.5; }
      if (top  < 0)    { top  = 0;    velY = Math.abs(velY) * 0.5; }
      if (top  > maxY) { top  = maxY; velY = -Math.abs(velY) * 0.6; }
      headWrap.style.left = left + 'px';
      headWrap.style.top  = top  + 'px';
      if (Math.abs(velX) > 0.15 || Math.abs(velY) > 0.15) {
        animId = requestAnimationFrame(step);
      }
    }
    animId = requestAnimationFrame(step);
  }

  headWrap.addEventListener('mousedown',  onDown);
  headWrap.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('mousemove',  onMove);
  window.addEventListener('touchmove',  onMove, { passive: false });
  window.addEventListener('mouseup',    onUp);
  window.addEventListener('touchend',   onUp);

  // click without drag → phrase
  var clickStart = { x:0, y:0 };
  headWrap.addEventListener('mousedown',  function(e) { clickStart = { x:e.clientX, y:e.clientY }; });
  headWrap.addEventListener('click', function(e) {
    var moved = Math.abs(e.clientX - clickStart.x) + Math.abs(e.clientY - clickStart.y);
    if (moved < 8 && canSpeak()) {
      speak(randFrom(isAngry ? PH_ANGRY : PH_NORMAL), true);
      playHover();
    }
  });

  // ── HEAD SCREAMER ──
  function triggerHeadScreamer() {
    var overlay = document.getElementById('headScreamer');
    if (!overlay) return;
    playScreamerNoise();
    overlay.style.display = 'flex';
    shakeBody(4200);

    var red = document.getElementById('screamerRed');
    if (red) fadeIn(red, 0.78, 900);

    var sHead = document.getElementById('screamerHead');
    if (sHead) {
      sHead.style.transform   = 'scale(0.05)';
      sHead.style.transition  = 'transform 1s ease-out';
      requestAnimationFrame(function() {
        requestAnimationFrame(function() { sHead.style.transform = 'scale(1)'; });
      });
    }

    // after 4s: ban + apology redirect
    setTimeout(function() {
      overlay.style.display = 'none';
      stopShake();
      localStorage.setItem('headBanned', '1');
      window.location.href = 'apology.html';
    }, 4200);
  }
}

// ══════════════════════════════════
// 9.  HELPERS: shake / fadeIn
// ══════════════════════════════════
var shakeStyleEl = null;
function shakeBody(duration) {
  if (!shakeStyleEl) {
    shakeStyleEl = document.createElement('style');
    shakeStyleEl.textContent = '@keyframes SHAKE{0%{transform:translate(0,0)}10%{transform:translate(-6px,-4px) rotate(-1.5deg)}20%{transform:translate(6px,4px) rotate(1.5deg)}30%{transform:translate(-8px,2px) rotate(-1deg)}40%{transform:translate(8px,-2px) rotate(1deg)}50%{transform:translate(-5px,5px)}60%{transform:translate(5px,-5px)}70%{transform:translate(-4px,3px)}80%{transform:translate(4px,-3px)}90%{transform:translate(-3px,2px)}100%{transform:translate(0,0)}}';
    document.head.appendChild(shakeStyleEl);
  }
  document.body.style.animation = 'SHAKE 0.1s ease-in-out infinite';
  if (duration) setTimeout(stopShake, duration);
}
function stopShake() { document.body.style.animation = ''; }

function fadeIn(el, targetOpacity, ms) {
  var start = null;
  function step(ts) {
    if (!start) start = ts;
    var p = Math.min((ts - start) / ms, 1);
    el.style.opacity = p * targetOpacity;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

