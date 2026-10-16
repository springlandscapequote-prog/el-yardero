/* El Yardero - app UI (plain ES5, hash routing, no build step). */
(function () {
  'use strict';
  var T = {
    es: {
      tag: 'Yardero to CEO', navHome: 'Lecciones', navAsk: 'Pregúntale',
      heroH: 'Lecciones prácticas para dueños y líderes de cuadrilla',
      heroP: 'Consejos cortos de negocio para jardinería, de dueño a dueño. Léelos aquí o pregúntale al Yardero.',
      heroBtn: 'Pregúntale al Yardero', search: 'Buscar en las lecciones…', searchLbl: 'Buscar lecciones', all: 'Todas',
      count1: 'lección', countN: 'lecciones', none: 'No encontré lecciones con esa búsqueda. Prueba con otra palabra, como “precio”, “reseña” o “GPS”.',
      back: '← Todas las lecciones', share: 'Compartir', copied: 'Enlace copiado', shareFail: 'Copia este enlace:', prev: 'Anterior', next: 'Siguiente',
      askAbout: 'Pregúntale al Yardero', lessonOf: 'Lección', date: 'Fecha',
      askTitle: 'Pregúntale al Yardero',
      aibox: 'Soy El Yardero, una guía de IA inspirada en Fernando Rubio. No soy Fernando y no respondo en vivo por él. Por ahora busco en las lecciones de este sitio y te armo una respuesta corta con ellas.',
      askPh: 'Escribe tu pregunta…', askLbl: 'Tu pregunta', send: 'Enviar', chipsH: 'Preguntas para empezar:', clear: 'Borrar conversación',
      sources: 'De estas lecciones:', notFound: 'No lo encontré en las lecciones todavía. Si quieres, empieza por una de estas:',
      aiBy: 'Respuesta armada con las lecciones por El Yardero (guía de IA, no es Fernando en vivo). No es consejo legal ni de impuestos.',
      consultH: 'Consulta personalizada con Fernando',
      consultP: '¿Quieres revisar tus números directamente con Fernando? Una consulta de una hora cuesta $120 USD. Horario: miércoles y jueves, de 11 a. m. a 2 p. m. (hora del Pacífico).',
      consultSoon: 'Todavía no se puede reservar aquí.', book: 'Reservar consulta',
      synced: 'Última sincronización', lessonsWord: 'lecciones', store: 'Tienda', social: 'Redes',
      aiNote: 'El Yardero es una guía de IA, no una respuesta personal de Fernando.',
      update: 'Versión', langName: 'Español', titleHome: 'El Yardero — Yardero to CEO', titleAsk: 'Pregúntale al Yardero — El Yardero',
      notFoundPage: 'No encontré esa lección.', toHome: 'Ir a las lecciones'
    },
    en: {
      tag: 'Yardero to CEO', navHome: 'Lessons', navAsk: 'Ask',
      heroH: 'Practical lessons for landscaping owners and crew leads',
      heroP: 'Short business tips for landscaping, owner to owner. Read them here or ask El Yardero.',
      heroBtn: 'Ask El Yardero', search: 'Search the lessons…', searchLbl: 'Search lessons', all: 'All',
      count1: 'lesson', countN: 'lessons', none: 'No lessons match that search. Try another word, like “price”, “review” or “GPS”.',
      back: '← All lessons', share: 'Share', copied: 'Link copied', shareFail: 'Copy this link:', prev: 'Previous', next: 'Next',
      askAbout: 'Ask El Yardero', lessonOf: 'Lesson', date: 'Date',
      askTitle: 'Ask El Yardero',
      aibox: "I'm El Yardero, an AI guide inspired by Fernando Rubio. I'm not Fernando and I'm not replying live for him. For now I search the lessons on this site and build a short answer from them.",
      askPh: 'Type your question…', askLbl: 'Your question', send: 'Send', chipsH: 'Questions to start:', clear: 'Clear conversation',
      sources: 'From these lessons:', notFound: "I didn't find that in the lessons yet. You could start with one of these:",
      aiBy: 'Answer built from the lessons by El Yardero (an AI guide, not Fernando live). Not legal or tax advice.',
      consultH: 'Personal consultation with Fernando',
      consultP: 'Want Fernando to review your numbers with you? A one-hour consultation is $120 USD. Hours: Wednesdays and Thursdays, 11 a.m. to 2 p.m. Pacific time.',
      consultSoon: "Booking isn't available here yet.", book: 'Book a consultation',
      synced: 'Last synced', lessonsWord: 'lessons', store: 'Store', social: 'Social',
      aiNote: 'El Yardero is an AI guide, not a personal reply from Fernando.',
      update: 'Version', langName: 'English', titleHome: 'El Yardero — Yardero to CEO', titleAsk: 'Ask El Yardero — El Yardero',
      notFoundPage: "I couldn't find that lesson.", toHome: 'Go to the lessons'
    }
  };
  var MONTHS = { es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };

  var LESSONS = (typeof EY_LESSONS !== 'undefined') ? EY_LESSONS : [];
  var TAX = (typeof EY_TAX !== 'undefined') ? EY_TAX : { categories: {}, tags: {} };
  var SYNC = (typeof EY_SYNC !== 'undefined') ? EY_SYNC : null;
  var CHIPS = (typeof EY_CHIPS !== 'undefined') ? EY_CHIPS : [];
  var TOPICS = (typeof EY_TOPICS !== 'undefined') ? EY_TOPICS : [];
  var BYID = {}, ORDER = [], k;
  // newest first, original order inside the same date
  ORDER = LESSONS.map(function (l, i) { return { l: l, i: i }; });
  ORDER.sort(function (a, b) { return (a.l.date < b.l.date ? 1 : a.l.date > b.l.date ? -1 : a.i - b.i); });
  ORDER = ORDER.map(function (x) { return x.l; });
  for (k = 0; k < LESSONS.length; k++) BYID[LESSONS[k].id] = LESSONS[k];
  if (window.EYAsk) EYAsk.init(LESSONS, TOPICS);

  function store(key, val) { try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; } return null; }
  var lang = store('ey_lang');
  if (lang !== 'es' && lang !== 'en') lang = 'es';
  var st = { cat: 'all', q: '', chat: [], seq: 0 };
  var view = document.getElementById('view');
  var scrollMem = {};

  function t(key) { return T[lang][key]; }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag), a, i;
    if (attrs) for (a in attrs) { if (a === 'text') e.textContent = attrs[a]; else if (a === 'cls') e.className = attrs[a]; else e.setAttribute(a, attrs[a]); }
    if (kids) for (i = 0; i < kids.length; i++) if (kids[i]) e.appendChild(kids[i]);
    return e;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function fold(s) { return window.EYAsk ? EYAsk.fold(s) : String(s).toLowerCase(); }
  function catName(id) { var c = TAX.categories[id]; return c ? c[lang] : ''; }
  function fmtDate(d) {
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(d || '');
    if (!m) return '';
    var mon = MONTHS[lang][parseInt(m[2], 10) - 1];
    return m[3] ? (lang === 'es' ? parseInt(m[3], 10) + ' ' + mon + ' ' + m[1] : mon + ' ' + parseInt(m[3], 10) + ', ' + m[1]) : mon + ' ' + m[1];
  }
  function fmtSync() {
    if (!SYNC) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})\s*(\S*)/.exec(SYNC.synced_at_pt || '');
    if (!m) return SYNC.synced_at_pt || '';
    var h = parseInt(m[4], 10), ap = h >= 12 ? (lang === 'es' ? 'p. m.' : 'PM') : (lang === 'es' ? 'a. m.' : 'AM'), h12 = h % 12 === 0 ? 12 : h % 12;
    var day = parseInt(m[3], 10), mon = MONTHS[lang][parseInt(m[2], 10) - 1];
    var date = lang === 'es' ? day + ' ' + mon + ' ' + m[1] : mon + ' ' + day + ', ' + m[1];
    return date + ', ' + h12 + ':' + m[5] + ' ' + ap + ' ' + (m[6] || 'PT');
  }
  function paras(text) {
    // split into short paragraphs (about 2-3 sentences) so it reads well on a phone
    var ss = String(text).match(/[^.!?]+[.!?]+["\u201d)]*\s*|[^.!?]+$/g) || [text], out = [], cur = '', i;
    for (i = 0; i < ss.length; i++) {
      if (cur && (cur.length + ss[i].length > 300)) { out.push(cur); cur = ''; }
      cur += ss[i];
    }
    if (cur) out.push(cur);
    return out.map(function (x) { return x.replace(/^\s+|\s+$/g, ''); });
  }
  function toast(msg) {
    var n = document.getElementById('toast');
    n.textContent = msg; n.style.display = 'block';
    clearTimeout(toast.t); toast.t = setTimeout(function () { n.style.display = 'none'; }, 2600);
  }

  /* ---------- chrome ---------- */
  function chrome(route) {
    document.documentElement.setAttribute('lang', lang);
    var es = document.getElementById('lang-es'), en = document.getElementById('lang-en');
    es.setAttribute('aria-pressed', lang === 'es' ? 'true' : 'false'); en.setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
    document.getElementById('tagline').textContent = t('tag');
    document.getElementById('nav-home-t').textContent = t('navHome'); document.getElementById('nav-ask-t').textContent = t('navAsk');
    document.getElementById('nav-home').className = route === 'ask' ? '' : 'on';
    document.getElementById('nav-ask').className = route === 'ask' ? 'on' : '';
    var f = document.getElementById('foot'); clear(f);
    var p1 = el('p', { text: t('aiNote') });
    var p2 = el('p');
    p2.appendChild(document.createTextNode(t('store') + ': '));
    var a = el('a', { href: (typeof STORE_URL !== 'undefined' ? STORE_URL : 'https://fermilionaire.gumroad.com'), target: '_blank', rel: 'noopener', text: 'fermilionaire.gumroad.com' });
    p2.appendChild(a);
    p2.appendChild(document.createTextNode('  ·  ' + t('social') + ': ' + (typeof SOCIAL_HANDLE !== 'undefined' ? SOCIAL_HANDLE : '@fermillonetas')));
    var p3 = el('p', { id: 'syncline', text: t('synced') + ': ' + fmtSync() + (SYNC ? ' · ' + SYNC.count + ' ' + t('lessonsWord') : '') });
    var p4 = el('p', { text: t('update') + ' ' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '') });
    f.appendChild(p1); f.appendChild(p2); f.appendChild(p3); f.appendChild(p4);
  }
  function consultCard() {
    var c = el('div', { cls: 'consult', id: 'consult' }, [el('h3', { text: t('consultH') }), el('p', { text: t('consultP') })]);
    var url = (typeof BOOKING_URL !== 'undefined') ? BOOKING_URL : '';
    if (url) c.appendChild(el('p', null, [el('a', { cls: 'btn alt', href: url, target: '_blank', rel: 'noopener', text: t('book') })]));
    else c.appendChild(el('p', { text: t('consultSoon') }));
    return c;
  }

  /* ---------- home ---------- */
  function lessonMatches(l, q) {
    if (!q) return true;
    var hay = fold(l.title_es + ' ' + l.title_en + ' ' + l.body_es + ' ' + l.body_en), ws = fold(q).split(/\s+/), i;
    for (i = 0; i < ws.length; i++) if (ws[i] && hay.indexOf(ws[i]) < 0) return false;
    return true;
  }
  function renderList(box, countEl) {
    clear(box);
    var shown = ORDER.filter(function (l) { return (st.cat === 'all' || l.category === st.cat) && lessonMatches(l, st.q); });
    countEl.textContent = shown.length + ' ' + (shown.length === 1 ? t('count1') : t('countN'));
    if (!shown.length) { box.appendChild(el('li', null, [el('div', { cls: 'empty', id: 'noresults', text: t('none') })])); return; }
    shown.forEach(function (l) {
      var a = el('a', { cls: 'card', href: '#/lesson/' + l.id }, [
        el('span', { cls: 'badge', text: catName(l.category) }),
        el('h3', { text: l['title_' + lang] }),
        el('p', { text: l['body_' + lang] })
      ]);
      box.appendChild(el('li', null, [a]));
    });
  }
  function renderHome() {
    document.title = t('titleHome');
    clear(view);
    var hero = el('section', { cls: 'hero' }, [el('h2', { text: t('heroH') }), el('p', { text: t('heroP') }),
      el('a', { cls: 'btn alt', href: '#/ask', id: 'hero-ask', text: '💬 ' + t('heroBtn') })]);
    var inp = el('input', { cls: 'search', type: 'search', id: 'q', placeholder: t('search'), 'aria-label': t('searchLbl'), autocomplete: 'off', autocapitalize: 'none', enterkeyhint: 'search' });
    inp.value = st.q;
    var cats = el('div', { cls: 'cats', role: 'group' });
    var counts = {};
    LESSONS.forEach(function (l) { counts[l.category] = (counts[l.category] || 0) + 1; });
    function pill(id, label) {
      var b = el('button', { cls: 'cat', type: 'button', 'data-cat': id, 'aria-pressed': st.cat === id ? 'true' : 'false', text: label });
      b.addEventListener('click', function () {
        st.cat = id;
        var all = cats.getElementsByTagName('button'), i;
        for (i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', all[i].getAttribute('data-cat') === id ? 'true' : 'false');
        renderList(list, count);
      });
      cats.appendChild(b);
    }
    pill('all', t('all') + ' (' + LESSONS.length + ')');
    for (var cid in TAX.categories) if (counts[cid]) pill(cid, catName(cid) + ' (' + counts[cid] + ')');
    var count = el('p', { cls: 'count', id: 'count', role: 'status' });
    var list = el('ul', { cls: 'cards', id: 'cards' });
    inp.addEventListener('input', function () { st.q = inp.value; renderList(list, count); });
    var sf = el('form', { role: 'search' }, [inp]);
    sf.addEventListener('submit', function (e) { e.preventDefault(); inp.blur(); });
    view.appendChild(hero); view.appendChild(sf); view.appendChild(cats); view.appendChild(count); view.appendChild(list); view.appendChild(consultCard());
    renderList(list, count);
  }

  /* ---------- lesson ---------- */
  function shareUrl(id) { return location.href.split('#')[0].replace(/([?&])u=[^&]*&?/, '$1').replace(/[?&]$/, '') + '#/lesson/' + id; }
  function copyText(s, done) {
    function fallback() {
      try {
        var ta = document.createElement('textarea'); ta.value = s; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-999px;top:0;opacity:0';
        document.body.appendChild(ta); ta.select(); try { ta.setSelectionRange(0, 99999); } catch (e) {}
        var ok = document.execCommand && document.execCommand('copy'); document.body.removeChild(ta); done(!!ok);
      } catch (e) { done(false); }
    }
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(s).then(function () { done(true); }, fallback); return; } } catch (e) {}
    fallback();
  }
  function renderLesson(id) {
    var l = BYID[id];
    clear(view);
    if (!l) {
      document.title = t('titleHome');
      view.appendChild(el('div', { cls: 'empty', id: 'nolesson' }, [el('p', { text: t('notFoundPage') }), el('a', { cls: 'btn', href: '#/', text: t('toHome') })]));
      return;
    }
    document.title = l['title_' + lang] + ' — El Yardero';
    var i = ORDER.indexOf(l), prev = ORDER[i - 1], next = ORDER[i + 1];
    var wrap = el('article', { cls: 'lesson', id: 'lesson' });
    wrap.appendChild(el('a', { cls: 'back', href: '#/', id: 'backlink', text: t('back') }));
    wrap.appendChild(el('span', { cls: 'badge', text: catName(l.category) }));
    wrap.appendChild(el('h1', { id: 'ltitle', text: l['title_' + lang] }));
    wrap.appendChild(el('p', { cls: 'meta', text: (fmtDate(l.date) ? fmtDate(l.date) + ' · ' : '') + (i + 1) + ' / ' + ORDER.length }));
    var body = el('div', { cls: 'body', id: 'lbody' });
    paras(l['body_' + lang]).forEach(function (p) { body.appendChild(el('p', { text: p })); });
    wrap.appendChild(body);
    var shareBtn = el('button', { cls: 'btn ghost', type: 'button', id: 'sharebtn', text: '🔗 ' + t('share') });
    shareBtn.addEventListener('click', function () {
      var url = shareUrl(l.id);
      if (navigator.share) { try { navigator.share({ title: l['title_' + lang], url: url }).then(null, function () {}); return; } catch (e) {} }
      copyText(url, function (ok) { toast(ok ? t('copied') + ': ' + url : t('shareFail') + ' ' + url); });
    });
    var askBtn = el('a', { cls: 'btn alt', href: '#/ask', text: '💬 ' + t('askAbout') });
    wrap.appendChild(el('div', { cls: 'act' }, [shareBtn, askBtn]));
    var pn = el('div', { cls: 'pn' });
    pn.appendChild(prev ? el('a', { href: '#/lesson/' + prev.id, id: 'prevl' }, [el('small', { text: '← ' + t('prev') }), el('span', { text: prev['title_' + lang] })]) : el('div', { cls: 'ph' }));
    pn.appendChild(next ? el('a', { cls: 'r', href: '#/lesson/' + next.id, id: 'nextl' }, [el('small', { text: t('next') + ' →' }), el('span', { text: next['title_' + lang] })]) : el('div', { cls: 'ph' }));
    wrap.appendChild(pn);
    wrap.appendChild(consultCard());
    view.appendChild(wrap);
  }

  /* ---------- ask ---------- */
  function renderChat(box) {
    clear(box);
    var cb = document.getElementById('clearchat'); if (cb) cb.style.display = st.chat.length ? 'block' : 'none';
    var i, c, pair, a, kids;
    for (i = st.chat.length - 1; i >= 0; i--) {   // newest first, right under the input
      c = st.chat[i];
      pair = el('div', { cls: 'pair', 'data-n': String(c.n) });
      pair.appendChild(el('div', { cls: 'q', text: c.q }));
      a = el('div', { cls: 'a' });
      if (!c.res) {
        a.appendChild(el('span', { cls: 'typing', 'aria-label': '…' }, [el('i'), el('i'), el('i')]));
        a.setAttribute('data-state', 'typing');
      } else {
        a.setAttribute('data-state', c.res.found ? 'answer' : 'none');
        var L = c.res.lang;
        if (c.res.found) {
          c.res.paragraphs.forEach(function (p) { a.appendChild(el('p', { text: p })); });
          a.appendChild(el('div', { cls: 'srch', text: T[L].sources }));
        } else {
          a.appendChild(el('p', { text: T[L].notFound }));
        }
        (c.res.found ? c.res.sources : c.res.suggestions).forEach(function (s) {
          a.appendChild(el('a', { cls: 'src', href: '#/lesson/' + s.id, text: '📖 ' + s.title }));
        });
        var inv = el('div', { cls: 'consult', style: 'margin:12px 0 4px' });
        inv.appendChild(el('p', { text: T[L].consultP }));
        var url = (typeof BOOKING_URL !== 'undefined') ? BOOKING_URL : '';
        if (url) inv.appendChild(el('p', null, [el('a', { cls: 'btn alt', href: url, target: '_blank', rel: 'noopener', text: T[L].book })]));
        else inv.appendChild(el('p', { text: T[L].consultSoon }));
        a.appendChild(inv);
        a.appendChild(el('p', { cls: 'aiby', text: T[L].aiBy }));
      }
      pair.appendChild(a);
      box.appendChild(pair);
    }
  }
  function scrollToPair(p) {
    // put the new question just under the sticky header so the question and the start of its answer are visible
    try { if (p) window.scrollTo(0, Math.max(0, p.getBoundingClientRect().top + (window.pageYOffset || 0) - 84)); } catch (e) { }
  }
  function ask(q, chatBox) {
    q = String(q || '').replace(/^\s+|\s+$/g, '');
    if (!q) return;
    var item = { n: ++st.seq, q: q.slice(0, 300), res: null };
    st.chat.push(item);
    renderChat(chatBox);
    scrollToPair(chatBox.firstChild);
    var finished = false;
    function finish(res) {
      if (finished) return; finished = true;
      item.res = res;
      if (document.getElementById('chat') === chatBox) renderChat(chatBox);
      scrollToPair(chatBox.querySelector('[data-n="' + item.n + '"]'));
    }
    // short typing indicator, then the answer. The answer is computed locally (no network needed).
    var res;
    EYAsk.answer(q, lang, function (r) { res = r; if (ready) go(); });
    var ready = false;
    function go() { if (res) finish(res); }
    setTimeout(function () { ready = true; if (res) go(); }, 550);
  }
  function renderAsk() {
    document.title = t('titleAsk');
    clear(view);
    view.appendChild(el('h2', { text: t('askTitle'), style: 'margin:4px 0 10px;color:#17432b' }));
    view.appendChild(el('div', { cls: 'aibox' }, [el('span', { cls: 'ai', text: 'IA' }), el('span', { text: t('aibox') })]));
    var inp = el('input', { cls: 'askin', type: 'text', id: 'askin', placeholder: t('askPh'), 'aria-label': t('askLbl'), maxlength: '300', autocomplete: 'off', enterkeyhint: 'send' });
    var go = el('button', { cls: 'askgo', type: 'submit', id: 'askgo', text: t('send') });
    var form = el('form', { cls: 'askform', id: 'askform' }, [inp, go]);
    var chatBox = el('div', { id: 'chat' });
    form.addEventListener('submit', function (e) { e.preventDefault(); var v = inp.value; inp.value = ''; ask(v, chatBox); });
    view.appendChild(form);
    view.appendChild(el('div', { cls: 'chipsh', text: t('chipsH') }));
    var chips = el('div', { cls: 'chips', id: 'chips' });
    CHIPS.forEach(function (c, i) {
      var b = el('button', { cls: 'chip', type: 'button', 'data-i': String(i), text: c[lang] });
      b.addEventListener('click', function () { ask(c[lang], chatBox); });   // tap = submit + answer, never just fill the input
      chips.appendChild(b);
    });
    view.appendChild(chips);
    view.appendChild(chatBox);
    var cl = el('button', { cls: 'clear', type: 'button', id: 'clearchat', text: t('clear'), style: 'display:none' });
    cl.addEventListener('click', function () { st.chat = []; renderAsk(); });
    view.appendChild(cl);
    if (st.chat.length) renderChat(chatBox);
  }

  /* ---------- router ---------- */
  var curKey = '';
  function route() {
    var h = location.hash || '#/', m;
    scrollMem[curKey] = window.pageYOffset || 0;
    var nav = 'home';
    if ((m = /^#\/lesson\/([^?\/]+)/.exec(h))) { curKey = h; chrome('home'); renderLesson(decodeURIComponent(m[1])); window.scrollTo(0, 0); }
    else if (/^#\/ask/.test(h)) { curKey = '#/ask'; chrome('ask'); renderAsk(); window.scrollTo(0, 0); }
    else {
      curKey = '#/'; chrome('home'); renderHome();
      var y = scrollMem['#/'] || 0; window.scrollTo(0, y);
    }
    window.EY_view = curKey;
  }
  function setLang(l) {
    if (l === lang) return;
    lang = l; store('ey_lang', l);
    var y = window.pageYOffset || 0;
    route(); window.scrollTo(0, y);
  }
  document.getElementById('lang-es').addEventListener('click', function () { setLang('es'); });
  document.getElementById('lang-en').addEventListener('click', function () { setLang('en'); });
  window.addEventListener('hashchange', route);
  // used by auto-update.js: safe to reload silently only when nothing is in progress
  window.EY_isIdle = function () {
    var a = document.getElementById('askin');
    if (a && a.value) return false;
    var q = document.getElementById('q');
    if (q && q.value) return false;
    var i; for (i = 0; i < st.chat.length; i++) if (!st.chat[i].res) return false;
    return true;
  };
  scrollMem[''] = 0;
  route();
})();
