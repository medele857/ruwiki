/* presence.js — статус в сети по нику. Подключать после firebase-wiki.js */
(function(){
  window.WikiPresence = {
    safeKey: function(s){ return String(s).replace(/[.#$/\[\] ]/g,'_'); },

    /* Возвращает 'online' | 'recent' | 'offline' по данным presence */
    statusOf: function(data){
      if(!data) return 'offline';
      var now = Date.now();
      var last = data.lastSeen || 0;
      /* Онлайн: флаг online И был активен < 60 сек назад (защита от зависших) */
      if(data.online && (now - last) < 60000) return 'online';
      /* Недавно: был активен < 10 минут назад */
      if((now - last) < 10*60000) return 'recent';
      return 'offline';
    },

    labelOf: function(status){
      if(status==='online') return 'в сети';
      if(status==='recent') return 'был(а) недавно';
      return 'не в сети';
    },

    /* Подписка на статус ника. cb получает status ('online'|'recent'|'offline') */
    watch: function(nick, cb){
      if(!window.WikiDB || !window.WikiDB.db){ setTimeout(function(){ window.WikiPresence.watch(nick, cb); }, 200); return; }
      var ref = window.WikiDB.db.ref('presence/' + this.safeKey(nick));
      var self = this;
      ref.on('value', function(snap){
        cb(self.statusOf(snap.val()));
      });
      /* Пересчитываем каждые 30 сек (чтобы online→recent сам обновлялся) */
      setInterval(function(){
        ref.once('value', function(snap){ cb(self.statusOf(snap.val())); });
      }, 30000);
    },

    /* Разовая проверка */
    get: function(nick, cb){
      if(!window.WikiDB || !window.WikiDB.db){ setTimeout(function(){ window.WikiPresence.get(nick, cb); }, 200); return; }
      var self = this;
      window.WikiDB.db.ref('presence/' + this.safeKey(nick)).once('value', function(snap){
        cb(self.statusOf(snap.val()));
      });
    }
  };
})();
