#!/usr/bin/env python3
"""
sync_brain.py - rebuild data/lessons.json (+ data/lessons.js, data/sync.json) from the El Yardero Brain Google Doc.

INPUT  (the script never talks to Google; a box routine / agent exports the doc first):
    python3 tools/sync_brain.py --file /path/to/brain_export.md     # plain text / markdown export of the Brain doc
    The file may also be the JSON wrapper the Drive connector returns ({"content": "..."}).
    Keep the export OUTSIDE this repo (it contains the internal inbox). .gitignore blocks *.export.md and brain_export*.

WHAT IT READS: ONLY the text between the two markers
    BEGIN EL YARDERO PUBLIC KNOWLEDGE  ...  END EL YARDERO PUBLIC KNOWLEDGE
    (exactly one pair must exist). Everything else (internal inbox, source notes, change log, instructions) is never parsed
    into the output. Lessons are the "- English ... / - En español: ..." bullet pairs inside that block.

SAFETY CHECKS (any failure => exit 2, nothing is written):
    1. exactly one BEGIN and one END marker, in order
    2. every lesson text (EN and ES) is found, verbatim after normalisation, inside the public block
    3. output contains none of the internal-section marker words (Learning inbox, internal only, FERNANDO_REVIEW, Canonical Drive...)
    4. no dollar amounts, e-mail addresses, phone numbers or URLs in lesson text (a lesson with them is LEFT OUT and reported;
       if only a separate anecdote bullet has them, that bullet is skipped and reported)
    5. no unexpected capitalised words (possible customer / crew / supplier names): every capitalised word that is not at the start
       of a sentence must be in tools/name_allowlist.txt, otherwise the sync fails and lists them for human review
    6. lesson count sanity: fails if the count drops by more than 20% versus the previous data/lessons.json

OUTPUT: data/lessons.json (array), data/lessons.js (same data for the app, no network needed), data/sync.json
        {synced_at_pt, synced_at_iso, count, source_sha256, skipped}
Dates per lesson live in data/lesson_dates.json (slug -> date). New slugs get today's date.
"""
import argparse, hashlib, json, os, re, sys, unicodedata, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEGIN = 'BEGIN EL YARDERO PUBLIC KNOWLEDGE'
END = 'END EL YARDERO PUBLIC KNOWLEDGE'
INTERNAL_WORDS = ['learning inbox', 'internal only', 'fernando_review', 'fernando\\_review', 'canonical drive', 'appgprj',
                  'synchronization and continuity', 'pending fernando', 'candidate lessons', 'source notes',
                  'begin el yardero', 'end el yardero', 'change log', 'internal instructions']

def fail(msg):
    sys.stderr.write('SYNC FAILED: ' + msg + '\n')
    sys.exit(2)

def unesc(s):
    s = re.sub(r'\\([\\`*_{}\[\]()#+\-.!$=|~<>])', r'\1', s)
    return re.sub(r'[ \t]+', ' ', s).strip()

def norm(s):
    s = unesc(s).lower()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

def slugify(s, n=60):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    if len(s) > n:
        s = s[:n].rsplit('-', 1)[0]
    return s

def load_export(path):
    raw = open(path, encoding='utf-8').read()
    if raw.lstrip().startswith('{'):
        try:
            j = json.loads(raw)
            if isinstance(j, dict) and 'content' in j:
                raw = j['content']
        except ValueError:
            pass
    return raw

def public_block(text):
    if text.count(BEGIN) != 1 or text.count(END) != 1:
        fail('expected exactly one BEGIN and one END marker, found %d / %d' % (text.count(BEGIN), text.count(END)))
    a = text.index(BEGIN) + len(BEGIN)
    b = text.index(END)
    if b < a:
        fail('END marker comes before BEGIN marker')
    return text[a:b]

def split_pairs(block):
    """Return list of dicts {en:[bullets], es:str, line_no}. A lesson = English bullet(s) followed by an 'En español:' bullet."""
    bullets = []
    for ln in block.split('\n'):
        if ln.startswith('\\- ') or ln.startswith('- '):
            bullets.append(ln.split(' ', 1)[1].strip())
    items = []
    pend = []
    for b in bullets:
        if b.startswith('En español:') or b.startswith('En espanol:'):
            items.append({'en': pend, 'es': b.split(':', 1)[1].strip()})
            pend = []
        else:
            if pend:
                items.append({'en': pend, 'es': None})  # English-only bullet(s) with no Spanish -> not a lesson
            pend = [b]
    if pend:
        items.append({'en': pend, 'es': None})
    return items

RISKY = [(re.compile(r'\$\s?\d|\\\$\s?\d|\bUSD\b|\b\d[\d,]*\s*dollars?\b', re.I), 'dollar amount'),
         (re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+'), 'e-mail address'),
         (re.compile(r'\bhttps?://|www\.', re.I), 'URL'),
         (re.compile(r'\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b'), 'phone number')]

def risky(s):
    for rx, name in RISKY:
        if rx.search(s):
            return name
    return None

def sentences(s):
    return [x.strip() for x in re.findall(r'[^.!?]+[.!?]+["\u201d)]*|[^.!?]+$', s) if x.strip()]

def title_and_body(text):
    """Title = text before the first ': ' (if short) or the first sentence."""
    t = unesc(text)
    m = re.match(r'^(.{8,110}?):\s+(.*)$', t, re.S)
    first = sentences(t)[0] if sentences(t) else t
    if m and (len(m.group(1)) <= len(first.rstrip('.!?')) + 1):
        title, body = m.group(1), m.group(2)
    else:
        title = first.rstrip('.!?')
        body = t[len(first):].strip() or t
    title = title.strip()
    if body:
        body = body[0].upper() + body[1:]
    return title, body

def cap_check(texts, allow):
    """Capitalised words that are not sentence-initial and not allow-listed (possible names)."""
    bad = {}
    for lid, t in texts:
        for m in re.finditer(r'(?<![.!?¿¡:\u201c"(\n])\s([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ\'’-]+)', ' ' + t):
            w = m.group(1)
            # skip if previous non-space char ends a sentence
            pre = (' ' + t)[:m.start(1)].rstrip()
            if not pre or pre[-1] in '.!?¿¡:“"(' or pre[-1] == '\n':
                continue
            if w.lower() not in allow:
                bad.setdefault(w, []).append(lid)
    return bad

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--file', required=True)
    ap.add_argument('--out', default=ROOT)
    ap.add_argument('--dry-run', action='store_true', help='check and report only, write nothing')
    ap.add_argument('--list-keys', action='store_true')
    ap.add_argument('--show-caps', action='store_true')
    a = ap.parse_args()

    text = load_export(a.file)
    block = public_block(text)
    block_norm = norm(block)

    meta = json.load(open(os.path.join(ROOT, 'tools', 'lesson_meta.json'), encoding='utf-8'))
    tax = json.load(open(os.path.join(ROOT, 'tools', 'taxonomy.json'), encoding='utf-8'))
    allow = set(w.strip().lower() for w in open(os.path.join(ROOT, 'tools', 'name_allowlist.txt'), encoding='utf-8').read().split() if w.strip())
    dates_path = os.path.join(a.out, 'data', 'lesson_dates.json')
    dates = json.load(open(dates_path)) if os.path.exists(dates_path) else {}

    items = split_pairs(block)
    lessons, skipped, notes = [], [], []
    used = set()
    # The brain has one case where two English bullets share one Spanish bullet (jobsite photos + a pay anecdote).
    prev_solo = None
    for it in items:
        if it['es'] is None:
            skipped.append({'why': 'English only (no Spanish version)', 'text': unesc(it['en'][0])[:80]})
            prev_solo = (it['en'], len(skipped) - 1)
            continue
        ens = it['en']
        k0 = slugify(unesc(ens[0]).split(':', 1)[0]) if ens else ''
        if prev_solo and meta.get(k0, {}).get('absorb_prev_solo'):
            ens = prev_solo[0] + ens          # two English bullets share one Spanish bullet
            skipped[prev_solo[1]] = None
        prev_solo = None
        kept = []
        for e in ens:
            r = risky(e)
            if r:
                skipped.append({'why': 'contains ' + r + ' (anecdote bullet left out)', 'text': unesc(e)[:80]})
            else:
                kept.append(e)
        if not kept:
            skipped.append({'why': 'whole lesson left out (all English bullets risky)', 'text': unesc(ens[0])[:80]})
            continue
        r = risky(it['es'])
        if r:
            skipped.append({'why': 'Spanish text contains ' + r + ' - lesson left out', 'text': unesc(it['es'])[:80]})
            continue
        en_text = kept[0]
        key_prefix = slugify(unesc(en_text).split(':', 1)[0]) if re.match(r"^Fernando.s ", unesc(en_text)) else None
        t_en, b_en = title_and_body(en_text)
        t_es, b_es = title_and_body(it['es'])
        slug = slugify(t_en)
        m = meta.get(key_prefix or slug, meta.get(slug, {}))
        if m.get('exclude'):
            skipped.append({'why': 'excluded by tools/lesson_meta.json: ' + m['exclude'], 'text': unesc(en_text)[:80]})
            continue
        if m.get('title_en'): t_en = m['title_en']
        if m.get('title_es'): t_es = m['title_es']
        if a.list_keys and key_prefix:
            print('KEY', key_prefix)
        if key_prefix and not m.get('title_es') and not a.list_keys:
            fail('no Spanish title in tools/lesson_meta.json for: ' + key_prefix)
        if m.get('slug'): slug = m['slug']
        elif key_prefix: slug = slugify(t_en)
        base, n = slug, 2
        while slug in used:
            slug = '%s-%d' % (base, n); n += 1
        used.add(slug)
        cat = m.get('category')
        tags = []
        low = norm(t_en + ' ' + b_en)
        sc = {}
        for cid, c in tax['categories'].items():
            s = 0
            for kw in c['kw']:
                s += 6 * (norm(t_en).count(kw)) + min(low.count(kw), 3)
            sc[cid] = s
        if not cat:
            order = list(tax['categories'].keys())
            cat = max(order, key=lambda k: (sc[k], -order.index(k)))
        tlow = norm(t_en + ' ' + (sentences(b_en)[0] if sentences(b_en) else ''))
        for tid, t in tax['tags'].items():
            if any((' ' + kw + ' ') in (' ' + tlow + ' ') for kw in t['kw']):
                tags.append(tid)
        lessons.append({'id': slug, 'title_es': t_es, 'title_en': t_en, 'category': cat, 'tags': tags[:4],
                        'body_es': b_es, 'body_en': b_en, 'date': dates.get(slug, ''),
                        '_src': [unesc(e) for e in kept] + [unesc(it['es'])]})

    skipped = [x for x in skipped if x]
    # ---- safety checks ----
    for l in lessons:
        for s in l['_src']:
            if norm(s) not in block_norm:
                fail('lesson text not found inside the public block: ' + l['id'])
    out_txt = json.dumps([{k: v for k, v in l.items() if k != '_src'} for l in lessons], ensure_ascii=False).lower()
    for w in INTERNAL_WORDS:
        if w in out_txt:
            fail('internal-section marker word found in output: ' + w)
    for l in lessons:
        for f in ('title_en', 'title_es', 'body_en', 'body_es'):
            r = risky(l[f])
            if r:
                fail('%s in %s of %s' % (r, f, l['id']))
    bad = cap_check([(l['id'], l['body_en']) for l in lessons] + [(l['id'], l['body_es']) for l in lessons], allow)
    if a.show_caps:
        print(json.dumps(bad, ensure_ascii=False, indent=1))
    if bad:
        fail('capitalised words not in tools/name_allowlist.txt (possible customer/crew/supplier names - review, then allow-list if harmless): '
             + ', '.join('%s (%s)' % (w, ids[0]) for w, ids in sorted(bad.items())))
    prev = os.path.join(a.out, 'data', 'lessons.json')
    if os.path.exists(prev):
        try:
            pc = len(json.load(open(prev, encoding='utf-8')))
            if pc and len(lessons) < 0.8 * pc:
                fail('lesson count dropped from %d to %d (more than 20%%) - refusing to overwrite' % (pc, len(lessons)))
        except ValueError:
            pass
    if len(lessons) < 20:
        fail('too few lessons found: %d' % len(lessons))

    # ---- dates ----
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    for l in lessons:
        if not l['date']:
            l['date'] = today
        dates[l['id']] = l['date']
        l.pop('_src', None)

    # ---- write ----
    try:
        from zoneinfo import ZoneInfo
        now = datetime.datetime.now(ZoneInfo('America/Los_Angeles'))
    except Exception:
        now = datetime.datetime.now()
    sync = {'synced_at_pt': now.strftime('%Y-%m-%d %H:%M %Z').strip(), 'synced_at_iso': now.isoformat(timespec='seconds'),
            'count': len(lessons), 'source_sha256': hashlib.sha256(block.encode('utf-8')).hexdigest()[:16],
            'skipped': len(skipped)}
    cats = {k: {'es': v['es'], 'en': v['en']} for k, v in tax['categories'].items()}
    tags = {k: {'es': v['es'], 'en': v['en']} for k, v in tax['tags'].items()}
    print('lessons: %d   skipped: %d' % (len(lessons), len(skipped)))
    for s in skipped:
        print('  skipped -', s['why'], '|', s['text'])
    if a.dry_run:
        return
    d = os.path.join(a.out, 'data')
    os.makedirs(d, exist_ok=True)
    # keep the sync time stable when nothing changed (so a no-op sync does not create a new site version)
    old_sync_p = os.path.join(d, 'sync.json')
    old_les_p = os.path.join(d, 'lessons.json')
    new_les = json.dumps(lessons, ensure_ascii=False, indent=1) + '\n'
    if os.path.exists(old_sync_p) and os.path.exists(old_les_p):
        o = json.load(open(old_sync_p))
        if open(old_les_p, encoding='utf-8').read() == new_les and o.get('source_sha256') == sync['source_sha256']:
            sync['synced_at_pt'] = o['synced_at_pt']; sync['synced_at_iso'] = o['synced_at_iso']
    if os.path.exists(old_sync_p) and a.__dict__.get('touch'):
        pass
    open(old_les_p, 'w', encoding='utf-8').write(new_les)
    open(old_sync_p, 'w').write(json.dumps(sync, indent=1) + '\n')
    open(dates_path, 'w').write(json.dumps(dates, indent=1, sort_keys=True) + '\n')
    json.dump({'categories': cats, 'tags': tags}, open(os.path.join(d, 'taxonomy.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    js = 'var EY_LESSONS=%s;\nvar EY_SYNC=%s;\nvar EY_TAX=%s;\n' % (
        json.dumps(lessons, ensure_ascii=False, separators=(',', ':')), json.dumps(sync),
        json.dumps({'categories': cats, 'tags': tags}, ensure_ascii=False, separators=(',', ':')))
    open(os.path.join(d, 'lessons.js'), 'w', encoding='utf-8').write(js)
    print('wrote data/lessons.json, lessons.js, sync.json (%s, %d lessons)' % (sync['synced_at_pt'], len(lessons)))

if __name__ == '__main__':
    main()
