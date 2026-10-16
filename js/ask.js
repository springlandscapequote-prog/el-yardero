/* El Yardero - "Pregúntale al Yardero" answering module.
   Pure functions, no DOM, no network needed. Works in the browser (window.EYAsk) and in node (module.exports) for tests.
   Answers are built ONLY from the lessons (data/lessons.json): BM25-style retrieval with accent-insensitive matching,
   light Spanish/English stemming and a small synonym list. To use a real LLM later, set ASK_API_URL in config.js:
   EYAsk.answer() then POSTs {question, lang, context:[top lessons]} to that URL and falls back to local retrieval on any failure. */
(function (root) {
  'use strict';
  var ES_STOP = ('hola buenas buenos gracias favor a al algo ante aqui asi aun cada con como cual cuales cuando cuanto cuantos de del demas desde donde el ella ellas ellos en entre es esa ese eso esta este esto estoy ha hace hacer hago hay la las le les lo los me mi mis mucho muy no nos o para pero poco por porque pues que quien quiero se ser si sin sobre son su sus tambien te tengo tiene tienen tu tus un una uno unos unas va voy y ya yo puedo debo debe necesito saber segun puede pueden mas menos mejor nada todo todos toda todas').split(' ');
  var EN_STOP = ('hello hi hey please thanks thank a about an and any are as at be been but by can could did do does for from get got had has have how i if in into is it its just me more my no not of on or our out should so some than that the their them then there these they this to up us was we were what when where which who why will with would you your').split(' ');
  var ES_SET = {}, EN_SET = {}, i;
  for (i = 0; i < ES_STOP.length; i++) ES_SET[ES_STOP[i]] = 1;
  for (i = 0; i < EN_STOP.length; i++) EN_SET[EN_STOP[i]] = 1;

  var SYN_GROUPS = [
    'ganar ganando ganancia ganas utilidad margen rentable rentabilidad profit profitable margin earn earning earnings making',
    'precio precios cotizar cotizacion cotizo estimado estimados presupuesto price prices pricing quote quoting estimate estimates bid',
    'resena resenas review reviews opinion opiniones estrellas',
    'impuesto impuestos tax taxes iva',
    'aumento aumentos raise raises sueldo sueldos salario wage wages bonus',
    'nomina payroll payday',
    'gps troca trocas camioneta camionetas truck trucks',
    'cuadrilla cuadrillas equipo crew crews team empleado empleados trabajadores',
    'factura facturas cobrar cobro cobros invoice invoices billing bill',
    'clientes cliente customers customer clients prospecto prospectos leads lead',
    'ruta rutas route routes mapa mapas maps',
    'seguimiento follow followup recordatorio reminder'
  ];
  var SYN = {};
  (function () {
    var g, w, k, j;
    for (g = 0; g < SYN_GROUPS.length; g++) {
      w = SYN_GROUPS[g].split(' ');
      for (k = 0; k < w.length; k++) {
        if (!SYN[w[k]]) SYN[w[k]] = [];
        for (j = 0; j < w.length; j++) if (j !== k) SYN[w[k]].push(w[j]);
      }
    }
  })();

  function fold(s) {
    s = String(s || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {
      s = s.replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n');
    }
    return s;
  }
  var ES_SUF = ['amientos', 'imientos', 'aciones', 'uciones', 'amiento', 'imiento', 'adoras', 'adores', 'acion', 'ucion', 'adora', 'antes', 'mente', 'iendo', 'ables', 'ibles', 'idad', 'ando', 'ador', 'able', 'ible', 'ados', 'adas', 'idos', 'idas', 'ado', 'ada', 'ido', 'ida', 'ar', 'er', 'ir', 'es', 'os', 'as', 's', 'a', 'o'];
  var EN_SUF = ['ations', 'ation', 'ingly', 'edly', 'ings', 'ing', 'ied', 'ies', 'ed', 'es', 'ly', 's'];
  function stem(w, lang) {
    var suf = lang === 'es' ? ES_SUF : EN_SUF, k, s;
    for (k = 0; k < suf.length; k++) {
      s = suf[k];
      if (w.length - s.length >= (lang === 'es' ? 4 : 3) && w.slice(-s.length) === s) {
        return (lang === 'en' && (s === 'ies' || s === 'ied')) ? w.slice(0, -s.length) + 'y' : w.slice(0, -s.length);
      }
    }
    return w;
  }
  function words(s) { return fold(s).replace(/[^a-z0-9]+/g, ' ').split(' ').filter(function (x) { return x; }); }
  function tokens(s, lang) {
    var stop = lang === 'es' ? ES_SET : EN_SET;
    return words(s).filter(function (w) { return !stop[w] && w.length > 1; }).map(function (w) { return stem(w, lang); });
  }
  function detectLang(q, ui) {
    var ws = words(q), es = 0, en = 0, k;
    if (/[¿¡ñáéíóú]/i.test(q)) es += 2;
    for (k = 0; k < ws.length; k++) {
      if (ES_SET[ws[k]] && !EN_SET[ws[k]]) es++;
      if (EN_SET[ws[k]] && !ES_SET[ws[k]]) en++;
    }
    if (es > en) return 'es';
    if (en > es) return 'en';
    return ui === 'en' ? 'en' : 'es';
  }

  var K1 = 1.2, B = 0.75;
  var idx = null, LESSONS = [], BYID = {};
  function buildIndex(lessons, topics) {
    LESSONS = lessons || []; BYID = {}; TOPICS = [];
    var tk, rx;
    for (tk = 0; tk < (topics || []).length; tk++) {
      try { rx = new RegExp(topics[tk].re); } catch (e) { rx = null; }
      TOPICS.push({ rx: rx, lessons: topics[tk].lessons || [] });
    }
    for (tk = 0; tk < LESSONS.length; tk++) BYID[LESSONS[tk].id] = LESSONS[tk];
    idx = { es: mk('es'), en: mk('en') };
    function mk(lang) {
      var docs = [], df = {}, tot = 0, n, d, t, k, tf, seen, bodyTok, titleTok;
      for (n = 0; n < LESSONS.length; n++) {
        d = LESSONS[n]; BYID[d.id] = d;
        titleTok = tokens(d['title_' + lang], lang);
        bodyTok = tokens(d['body_' + lang], lang);
        t = titleTok.concat(titleTok, titleTok).concat(bodyTok);
        tf = {}; seen = {};
        for (k = 0; k < t.length; k++) { tf[t[k]] = (tf[t[k]] || 0) + 1; if (!seen[t[k]]) { seen[t[k]] = 1; df[t[k]] = (df[t[k]] || 0) + 1; } }
        docs.push({ id: d.id, tf: tf, len: t.length }); tot += t.length;
      }
      return { docs: docs, df: df, avg: tot / Math.max(1, docs.length), N: docs.length };
    }
  }
  function idf(ix, w) { var n = ix.df[w] || 0; return Math.log(1 + (ix.N - n + 0.5) / (n + 0.5)); }

  function queryTerms(q, lang) {
    var ws = words(q), stop = lang === 'es' ? ES_SET : EN_SET, out = {}, k, j, w, sy, st;
    for (k = 0; k < ws.length; k++) {
      w = ws[k];
      if (stop[w] || w.length < 2) continue;
      st = stem(w, lang); out[st] = Math.max(out[st] || 0, 1);
      sy = SYN[w] || [];
      for (j = 0; j < sy.length; j++) { st = stem(sy[j], lang); if (!out[st]) out[st] = 0.45; }
    }
    return out;
  }
  function score(q, lang) {
    var ix = idx[lang], terms = queryTerms(q, lang), res = [], n, d, w, f, s, hit, direct;
    for (n = 0; n < ix.docs.length; n++) {
      d = ix.docs[n]; s = 0; hit = 0; direct = 0;
      for (w in terms) {
        f = d.tf[w]; if (!f) continue;
        s += terms[w] * idf(ix, w) * (f * (K1 + 1)) / (f + K1 * (1 - B + B * d.len / ix.avg));
        hit++; if (terms[w] === 1) direct++;
      }
      if (s > 0) res.push({ id: d.id, score: s, hit: hit, direct: direct });
    }
    res = applyTopics(q, res);
    res.sort(function (a, b) { return b.score - a.score; });
    return { list: res, terms: terms };
  }
  /* Curated topics (data/topics.js): lessons listed for a matching question are boosted, in the listed order. */
  var TOPICS = [];
  function applyTopics(q, res) {
    var f = fold(q), mx = 1, t, k, j, id, hit, found, r, bonus, map = {}, matched = 0;
    for (k = 0; k < res.length; k++) { map[res[k].id] = res[k]; if (res[k].score > mx) mx = res[k].score; }
    for (t = 0; t < TOPICS.length; t++) {
      if (!TOPICS[t].rx || !TOPICS[t].rx.test(f)) continue;
      matched++;
      for (j = 0; j < TOPICS[t].lessons.length; j++) {
        id = findId(TOPICS[t].lessons[j]); if (!id) continue;
        bonus = mx * (1.1 - 0.12 * j) + 1;
        if (map[id]) { map[id].score += bonus; map[id].direct = Math.max(map[id].direct, 1); }
        else { r = { id: id, score: bonus, hit: 1, direct: 1 }; map[id] = r; res.push(r); }
      }
    }
    return res;
  }
  function findId(prefix) {
    var k;
    if (BYID[prefix]) return prefix;
    for (k = 0; k < LESSONS.length; k++) if (LESSONS[k].id.indexOf(prefix) === 0) return LESSONS[k].id;
    return null;
  }
  function sentences(s) {
    var m = String(s).match(/[^.!?]+[.!?]+["\u201d)]*|[^.!?]+$/g) || [];
    return m.map(function (x) { return x.replace(/^\s+|\s+$/g, ''); }).filter(function (x) { return x; });
  }
  function wc(s) { return String(s).split(/\s+/).length; }
  function pickSentences(lesson, lang, terms, ix, maxWords) {
    var ss = sentences(lesson['body_' + lang]), sc = [], k, j, ws, w, s, chosen = [], total = 0, order;
    for (k = 0; k < ss.length; k++) {
      ws = tokens(ss[k], lang); s = k === 0 ? 0.6 : 0;
      for (j = 0; j < ws.length; j++) if (terms[ws[j]]) s += terms[ws[j]] * idf(ix, ws[j]);
      sc.push({ k: k, s: s });
    }
    order = sc.slice().sort(function (a, b) { return b.s - a.s || a.k - b.k; });
    for (j = 0; j < order.length && chosen.length < 3; j++) {
      w = wc(ss[order[j].k]);
      if (total + w > maxWords && chosen.length) continue;
      chosen.push(order[j].k); total += w;
    }
    chosen.sort(function (a, b) { return a - b; });
    return chosen.map(function (k) { return ss[k]; });
  }

  var DEFAULTS = ['your-easiest-sale-is-a-past-customer', 'speed-sells', 're-price-whenever-you-add-a-person-or-a-truck', 'audit-one-crew-day-every-week', 'check-three-things-before-asking-for-a-review', 'follow-up-three-to-five-days-after-the-estimate'];
  function suggestions(list, q) {
    var out = [], k, seen = {}, h = 0, id, n;
    for (k = 0; k < list.length && out.length < 3; k++) { out.push(list[k].id); seen[list[k].id] = 1; }
    for (k = 0; k < q.length; k++) h = (h * 31 + q.charCodeAt(k)) % 997;
    for (n = 0; out.length < 3 && n < DEFAULTS.length * 2; n++) {
      id = DEFAULTS[(h + n) % DEFAULTS.length];
      if (BYID[id] && !seen[id]) { out.push(id); seen[id] = 1; }
    }
    for (k = 0; out.length < 3 && k < LESSONS.length; k++) if (!seen[LESSONS[k].id]) { out.push(LESSONS[k].id); seen[LESSONS[k].id] = 1; }
    return out;
  }
  function src(id, lang) { var d = BYID[id]; return { id: id, title: d['title_' + lang] }; }

  /* Local answer (synchronous, always returns). */
  function answerLocal(question, ui) {
    var q = String(question || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').slice(0, 300);
    var lang = detectLang(q, ui), r = score(q, lang), top = r.list[0], ix = idx[lang];
    var enough = top && (top.direct >= 1) && top.score >= 1.5;
    if (!enough) {
      return { found: false, lang: lang, question: q, paragraphs: [], sources: [], suggestions: suggestions(r.list.slice(0, 3), q).map(function (id) { return src(id, lang); }), mode: 'local' };
    }
    var best = BYID[top.id], parts = pickSentences(best, lang, r.terms, ix, 85), sources = [src(top.id, lang)], k, second, extra, paras;
    paras = [parts.join(' ')];
    second = r.list[1];
    if (second && second.direct >= 1 && second.score >= 0.7 * top.score) {
      extra = pickSentences(BYID[second.id], lang, r.terms, ix, 30);
      if (extra.length && wc(paras[0]) < 85) {
        paras.push(extra[0]); sources.push(src(second.id, lang));
      }
    }
    for (k = 2; k < r.list.length && sources.length < 3; k++) {
      if (r.list[k].direct >= 1 && r.list[k].score >= 0.5 * top.score) sources.push(src(r.list[k].id, lang));
    }
    if (sources.length === 1 && r.list[1] && r.list[1].direct >= 1 && r.list[1].score >= 0.35 * top.score) sources.push(src(r.list[1].id, lang));
    return { found: true, lang: lang, question: q, paragraphs: paras, sources: sources, suggestions: [], mode: 'local' };
  }

  /* answer(question, ui, cb): cb(result). Uses ASK_API_URL (if set in config.js) with a safe fallback to the local answer. */
  function answer(question, ui, cb) {
    var url = (root.ASK_API_URL || '');
    var local = answerLocal(question, ui), done = false;
    function fin(r) { if (done) return; done = true; cb(r); }
    if (!url || typeof fetch !== 'function') { fin(local); return; }
    var t = setTimeout(function () { local.fallback = true; fin(local); }, 9000);
    try {
      var ctx = (local.sources || []).concat(local.suggestions || []).map(function (s) { var d = BYID[s.id]; return { id: d.id, title: d['title_' + local.lang], body: d['body_' + local.lang] }; });
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: local.question, lang: local.lang, context: ctx }) })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          clearTimeout(t);
          if (j && typeof j.answer === 'string' && j.answer) {
            var srcs = (j.sources || []).filter(function (id) { return BYID[id]; }).map(function (id) { return src(id, local.lang); });
            fin({ found: true, lang: local.lang, question: local.question, paragraphs: j.answer.split(/\n+/).slice(0, 6), sources: srcs.length ? srcs : local.sources, suggestions: [], mode: 'api' });
          } else { local.fallback = true; fin(local); }
        })['catch'](function () { clearTimeout(t); local.fallback = true; fin(local); });
    } catch (e) { clearTimeout(t); local.fallback = true; fin(local); }
  }

  var api = { init: buildIndex, answer: answer, answerLocal: answerLocal, detectLang: detectLang, tokens: tokens, fold: fold, stem: stem, search: function (q, lang) { return score(q, lang).list; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.EYAsk = api;
})(typeof window !== 'undefined' ? window : globalThis);
