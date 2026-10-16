#!/usr/bin/env python3
"""Re-checks the PUBLISHED data (data/lessons.json, data/sync.json, data/lessons.js) without needing the Brain doc.
Fails (exit 2) on: internal-section words, dollar amounts / e-mails / URLs / phone numbers, capitalised words that are not
allow-listed, missing languages, duplicate ids, or data/lessons.js out of sync with data/lessons.json. Runs in CI (.github/workflows/check.yml)."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sync_brain as sb
ROOT = sb.ROOT
L = json.load(open(os.path.join(ROOT, 'data', 'lessons.json'), encoding='utf-8'))
S = json.load(open(os.path.join(ROOT, 'data', 'sync.json')))
allow = set(w.lower() for w in open(os.path.join(ROOT, 'tools', 'name_allowlist.txt'), encoding='utf-8').read().split() if not w.startswith('#'))
errs = []
ids = [l['id'] for l in L]
if len(set(ids)) != len(ids): errs.append('duplicate ids')
if S['count'] != len(L): errs.append('sync.json count %s != %d lessons' % (S['count'], len(L)))
for l in L:
    for f in ('title_es', 'title_en', 'body_es', 'body_en', 'category', 'date'):
        if not l.get(f): errs.append('%s missing %s' % (l['id'], f))
        r = sb.risky(str(l.get(f, '')))
        if r: errs.append('%s %s in %s' % (l['id'], r, f))
blob = json.dumps(L, ensure_ascii=False).lower()
for w in sb.INTERNAL_WORDS:
    if w in blob: errs.append('internal marker word: ' + w)
bad = sb.cap_check([(l['id'], l['body_en']) for l in L] + [(l['id'], l['body_es']) for l in L], allow)
for w, i in bad.items(): errs.append('capitalised word not allow-listed: %s (%s)' % (w, i[0]))
js = open(os.path.join(ROOT, 'data', 'lessons.js'), encoding='utf-8').read()
m = re.match(r'var EY_LESSONS=(.*?);\nvar EY_SYNC=', js, re.S)
if not m or json.loads(m.group(1)) != L: errs.append('data/lessons.js does not match data/lessons.json')
if errs:
    print('DATA CHECK FAILED:'); [print(' -', e) for e in errs]; sys.exit(2)
print('data check ok: %d lessons, synced %s' % (len(L), S['synced_at_pt']))
