/* textformat.js — разметка текста + панель форматирования
   Подключать на страницах где нужно форматирование (НЕ в комментариях) */
(function(){
  'use strict';

  var COLORS = {
    red:'#ff5060', orange:'#ff9020', yellow:'#ffd020', green:'#44cc80',
    blue:'#5090ff', purple:'#b060ff', pink:'#ff70c0', cyan:'#30d0e0'
  };

  /* ── Парсинг разметки в HTML ── */
  function render(text){
    if(!text) return '';
    /* Экранируем HTML сначала */
    var s = String(text)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    /* [цвет=name]...[/цвет] */
    s = s.replace(/\[цвет=([a-z]+)\]([\s\S]*?)\[\/цвет\]/g, function(m, color, inner){
      var c = COLORS[color] || null;
      if(!c) return inner;
      return '<span style="color:'+c+'">'+inner+'</span>';
    });
    /* [color=name]...[/color] — англ вариант */
    s = s.replace(/\[color=([a-z]+)\]([\s\S]*?)\[\/color\]/g, function(m, color, inner){
      var c = COLORS[color] || null;
      if(!c) return inner;
      return '<span style="color:'+c+'">'+inner+'</span>';
    });

    /* **жирный** */
    s = s.replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>');
    /* __подчёркнутый__ */
    s = s.replace(/__([\s\S]+?)__/g, '<u>$1</u>');
    /* ~зачёркнутый~ */
    s = s.replace(/~([\s\S]+?)~/g, '<s>$1</s>');
    /* *курсив* (после жирного чтобы не конфликтовал) */
    s = s.replace(/\*([^*\n]+?)\*/g, '<i>$1</i>');

    /* переносы строк */
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  /* ── Панель форматирования над textarea ── */
  function attachToolbar(textarea){
    if(!textarea || textarea._tfAttached) return;
    textarea._tfAttached = true;

    if(!document.getElementById('tfToolbarStyle')){
      var st = document.createElement('style');
      st.id = 'tfToolbarStyle';
      st.textContent =
        '.tf-toolbar{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;align-items:center;}'+
        '.tf-btn{font-family:var(--font);font-size:13px;width:30px;height:28px;border-radius:5px;'+
        'border:1px solid var(--border);background:var(--bg3);color:var(--text2);cursor:pointer;'+
        'display:flex;align-items:center;justify-content:center;transition:all .13s;padding:0;}'+
        '.tf-btn:hover{border-color:var(--border2);color:var(--text);transform:scale(1.08);}'+
        '.tf-color{width:20px;height:20px;border-radius:50%;border:1px solid rgba(255,255,255,.2);'+
        'cursor:pointer;transition:transform .12s;padding:0;}'+
        '.tf-color:hover{transform:scale(1.2);}'+
        '.tf-sep{width:1px;height:20px;background:var(--border);margin:0 3px;}'+
        '.tf-hint{font-size:10px;color:var(--text2);opacity:.5;margin-left:auto;}';
      document.head.appendChild(st);
    }

    var bar = document.createElement('div');
    bar.className = 'tf-toolbar';
    bar.innerHTML =
      '<button type="button" class="tf-btn" data-wrap="**" title="Жирный"><b>Ж</b></button>'+
      '<button type="button" class="tf-btn" data-wrap="*" title="Курсив"><i>К</i></button>'+
      '<button type="button" class="tf-btn" data-wrap="__" title="Подчёркнутый"><u>П</u></button>'+
      '<button type="button" class="tf-btn" data-wrap="~" title="Зачёркнутый"><s>З</s></button>'+
      '<span class="tf-sep"></span>';

    Object.keys(COLORS).forEach(function(name){
      bar.innerHTML += '<button type="button" class="tf-color" data-color="'+name+'" style="background:'+COLORS[name]+'" title="'+name+'"></button>';
    });

    textarea.parentNode.insertBefore(bar, textarea);

    function wrapSelection(before, after){
      var start = textarea.selectionStart, end = textarea.selectionEnd;
      var val = textarea.value;
      var sel = val.slice(start, end) || 'текст';
      textarea.value = val.slice(0,start) + before + sel + after + val.slice(end);
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + sel.length;
      textarea.dispatchEvent(new Event('input', {bubbles:true}));
    }

    bar.querySelectorAll('[data-wrap]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var w = btn.dataset.wrap;
        wrapSelection(w, w);
      });
    });
    bar.querySelectorAll('[data-color]').forEach(function(btn){
      btn.addEventListener('click', function(){
        wrapSelection('[цвет='+btn.dataset.color+']', '[/цвет]');
      });
    });
  }

  window.TextFormat = { render: render, attachToolbar: attachToolbar, colors: COLORS };
})();
