/* ══ МапДев Вики — Service Worker ══ */
var CACHE = 'mapdev-v2';
var PRECACHE = [
  'main.html', 'style.css', 'wiki-cards.css',
  'script.js', 'firebase-wiki.js', 'wiki-search.js',
  'manifest.json', 'fav.png', 'medele.png',
  'authors.html', 'studios.html', 'bloggers.html',
  'events.html', 'posts.html', 'messages.html', 'settings.html'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(PRECACHE.map(function(u){ return new Request(u,{cache:'reload'}); })).catch(function(){}); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      var network = fetch(e.request).then(function(res){
        if(res&&res.status===200){
          var clone=res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request,clone); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
