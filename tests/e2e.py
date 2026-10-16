#!/usr/bin/env python3
"""End-to-end tests for El Yardero (headless Playwright only).
usage: python3 tests/e2e.py <base_url> <tag> [full|quick]   e.g. python3 tests/e2e.py http://127.0.0.1:8793/ local
Runs WebKit iPhone 13 (390x664, 375x553), Chromium Pixel 7 (390x664, 375x553) with touch, plus a Chromium 4x CPU slowdown pass."""
import sys, json, os, time, re
from playwright.sync_api import sync_playwright

BASE = sys.argv[1]; TAG = sys.argv[2]; MODE = sys.argv[3] if len(sys.argv) > 3 else 'full'
HERE = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(HERE, '..', 'shots'); os.makedirs(SH, exist_ok=True)
LESSONS = json.load(open(os.path.join(HERE, '..', 'data', 'lessons.json'), encoding='utf-8'))
CHIPS = json.loads(re.search(r'=(\[.*\]);', open(os.path.join(HERE, '..', 'data', 'chips.js'), encoding='utf-8').read(), re.S).group(1))
CFG = [('webkit', 'iPhone 13', 390, 664, 1), ('webkit', 'iPhone 13', 375, 553, 1), ('chromium', 'Pixel 7', 390, 664, 1), ('chromium', 'Pixel 7', 375, 553, 1), ('chromium', 'Pixel 7', 390, 664, 4)]
if MODE == 'quick': CFG = [CFG[0]]
RES = []

def rec(cfg, name, ok, detail=''):
    RES.append({'cfg': cfg, 'test': name, 'ok': bool(ok), 'detail': str(detail)[:200]})
    if not ok: print('  FAIL', cfg, name, detail)

def run(p, bt, dev, vw, vh, slow):
    nm = '%s-%dx%d%s' % (bt, vw, vh, '-cpu%dx' % slow if slow > 1 else '')
    print('==', nm)
    b = getattr(p, bt).launch()
    o = dict(p.devices[dev]); o['viewport'] = {'width': vw, 'height': vh}
    ctx = b.new_context(**o)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
    if slow > 1:
        cdp = ctx.new_cdp_session(pg); cdp.send('Emulation.setCPUThrottlingRate', {'rate': slow})
    WAIT = 8000 if slow > 1 else 4000
    def shot(n): pg.screenshot(path=os.path.join(SH, '%s-%s-%s.png' % (TAG, nm, n)))
    def noscroll(label):
        w = pg.evaluate('[document.documentElement.scrollWidth, window.innerWidth, document.body.scrollWidth]')
        rec(nm, 'no horizontal scroll: ' + label, w[0] <= w[1] and w[2] <= w[1], w)
    def answer_after(trigger, label, expect_found=True):
        n0 = pg.locator('.pair').count()
        t0 = time.time(); trigger()
        try:
            pg.wait_for_selector('.pair:first-child .a[data-state="answer"], .pair:first-child .a[data-state="none"]', timeout=WAIT)
        except Exception as e:
            rec(nm, label, False, 'no answer: %s' % e); return None
        dt = time.time() - t0
        a = pg.locator('.pair:first-child .a')
        st = a.get_attribute('data-state')
        ok = pg.locator('.pair').count() == n0 + 1 and ((st == 'answer') if expect_found else (st == 'none'))
        txt = a.inner_text()
        links = pg.locator('.pair:first-child .a a.src')
        ok = ok and links.count() >= (1 if expect_found else 3) and '$120' in txt and links.first.get_attribute('href').startswith('#/lesson/')
        rec(nm, label, ok, '%s links=%d %.2fs' % (st, links.count(), dt))
        return a

    pg.goto(BASE, wait_until='networkidle')
    pg.evaluate('try{localStorage.clear()}catch(e){}'); pg.reload(wait_until='networkidle')
    # ---- home (Spanish default) ----
    rec(nm, 'home: Spanish default, html lang=es', pg.evaluate('document.documentElement.lang') == 'es' and 'Lecciones' in pg.inner_text('#view'))
    ncards = pg.locator('.card').count()
    rec(nm, 'home: all lesson cards rendered (%d expected)' % len(LESSONS), ncards == len(LESSONS), ncards)
    noscroll('home'); shot('01-home-es')
    rec(nm, 'footer: last synced + store + handle', all(s in pg.inner_text('#foot') for s in ['Última sincronización', '@fermillonetas', 'fermilionaire.gumroad.com']) and pg.locator('#foot a[href="https://fermilionaire.gumroad.com"]').count() == 1, pg.inner_text('#syncline'))
    # ---- language toggle ----
    pg.tap('#lang-en'); pg.wait_for_timeout(200)
    rec(nm, 'toggle EN switches UI', 'Practical lessons' in pg.inner_text('#view') and pg.evaluate('document.documentElement.lang') == 'en')
    rec(nm, 'toggle EN stored in localStorage', pg.evaluate("localStorage.getItem('ey_lang')") == 'en')
    shot('02-home-en')
    pg.reload(wait_until='networkidle')
    rec(nm, 'EN persists after reload', 'Practical lessons' in pg.inner_text('#view'))
    pg.tap('#lang-es'); pg.wait_for_timeout(150); pg.reload(wait_until='networkidle')
    rec(nm, 'ES persists after reload', 'Lecciones prácticas' in pg.inner_text('#view'))
    # ---- search ----
    pg.fill('#q', 'reseña'); pg.wait_for_timeout(200); c1 = pg.locator('.card').count()
    pg.fill('#q', 'resena'); pg.wait_for_timeout(200); c2 = pg.locator('.card').count()
    rec(nm, 'search: accent-insensitive (reseña == resena, fewer than all)', 0 < c1 == c2 < len(LESSONS), (c1, c2))
    shot('03-search')
    pg.fill('#q', 'payroll'); pg.wait_for_timeout(200); c3 = pg.locator('.card').count()
    rec(nm, 'search: finds English text while UI is Spanish', c3 > 0, c3)
    pg.fill('#q', 'zzzxxqq'); pg.wait_for_timeout(200)
    rec(nm, 'search: no result message', pg.locator('#noresults').count() == 1 and pg.locator('.card').count() == 0)
    pg.fill('#q', 'GPS'); pg.wait_for_timeout(200)
    rec(nm, 'search: body text matches (GPS)', pg.locator('.card').count() >= 5)
    pg.fill('#q', '')
    pg.locator('.cat').nth(1).tap(); pg.wait_for_timeout(150)
    cc = pg.locator('.card').count()
    rec(nm, 'category filter narrows list', 0 < cc < len(LESSONS), cc)
    pg.locator('.cat').first.tap(); pg.wait_for_timeout(150)
    # ---- reading page + back button ----
    pg.locator('.card').nth(3).scroll_into_view_if_needed(); pg.locator('.card').nth(3).tap(); pg.wait_for_selector('#lesson')
    rec(nm, 'card tap opens lesson page', '#/lesson/' in pg.url and pg.locator('#ltitle').inner_text() != '')
    noscroll('lesson'); shot('04-lesson-es')
    pg.go_back(); pg.wait_for_selector('#cards')
    rec(nm, 'back button returns to home list', pg.locator('.card').count() == len(LESSONS) and pg.url.endswith('/') or pg.url.endswith('#/'))
    # next / previous
    pg.goto(BASE + '#/lesson/' + LESSONS[10]['id']); pg.wait_for_selector('#lesson')
    t0 = pg.locator('#ltitle').inner_text(); pg.locator('#nextl').tap(); pg.wait_for_timeout(200)
    t1 = pg.locator('#ltitle').inner_text(); pg.locator('#prevl').tap(); pg.wait_for_timeout(200)
    t2 = pg.locator('#ltitle').inner_text()
    rec(nm, 'next/previous navigate', t0 != t1 and t0 == t2, (t0, t1))
    pg.go_back(); pg.wait_for_timeout(200)
    rec(nm, 'back after next/prev goes to previous page', pg.locator('#ltitle').inner_text() == t1)
    # share
    try: ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
    except Exception: pass
    pg.tap('#sharebtn'); pg.wait_for_timeout(300)
    tt = pg.inner_text('#toast') if pg.is_visible('#toast') else ''
    rec(nm, 'share link button gives a link to this lesson', '#/lesson/' in tt, tt[:90])
    # readable text
    fs = pg.evaluate("[parseFloat(getComputedStyle(document.querySelector('#lbody p')).fontSize), parseFloat(getComputedStyle(document.querySelector('#ltitle')).fontSize)]")
    rec(nm, 'lesson text readable (>=18px body, >=24px title)', fs[0] >= 18 and fs[1] >= 24, fs)
    # deep link
    pg.goto(BASE + '#/lesson/speed-sells'); pg.reload(wait_until='networkidle')
    rec(nm, 'deep link opens lesson after reload', pg.locator('#ltitle').inner_text() == 'La rapidez también vende')
    # ---- every lesson, both languages ----
    for lg, btn in (('es', '#lang-es'), ('en', '#lang-en')):
        pg.goto(BASE + '#/'); pg.wait_for_selector('#cards'); pg.tap(btn); pg.wait_for_timeout(150)
        bad = []
        for l in LESSONS:
            pg.evaluate("location.hash='#/lesson/%s'" % l['id'])
            try:
                pg.wait_for_function("""(a)=>{var t=document.getElementById('ltitle'),b=document.getElementById('lbody');return !!t&&!!b&&t.textContent===a&&b.textContent.length>40}""", arg=l['title_' + lg], timeout=3000)
                ok = pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
            except Exception:
                ok = False
            if not ok: bad.append(l['id'])
        rec(nm, 'every lesson page opens in %s (%d lessons, text matches data, no h-scroll)' % (lg.upper(), len(LESSONS)), not bad, bad[:3])
    # ---- Ask screen: chips ----
    for lg, btn in (('es', '#lang-es'), ('en', '#lang-en')):
        pg.goto(BASE + '#/ask'); pg.wait_for_selector('#chips'); pg.tap(btn); pg.wait_for_timeout(150)
        nchip = pg.locator('.chip').count()
        rec(nm, 'ask %s: chips shown (%d)' % (lg.upper(), len(CHIPS)), nchip == len(CHIPS), nchip)
        noscroll('ask ' + lg)
        for i in range(nchip):
            txt = pg.locator('.chip').nth(i).inner_text()
            a = answer_after(lambda: pg.locator('.chip').nth(i).tap(), 'chip tap auto-submits & answers [%s] %s' % (lg, txt))
            rec(nm, 'chip leaves input empty (submitted, not just filled) [%s #%d]' % (lg, i), pg.input_value('#askin') == '')
        shot('05-ask-%s-answers' % lg)
    # chip answer link opens the lesson, back returns to Ask with conversation kept
    pg.goto(BASE + '#/ask'); pg.wait_for_selector('#chips'); pg.tap('#lang-es')
    pg.locator('.chip').nth(2).tap(); pg.wait_for_selector('.pair .a[data-state="answer"]', timeout=WAIT)
    href = pg.locator('.pair:first-child a.src').first.get_attribute('href'); pg.locator('.pair:first-child a.src').first.tap(); pg.wait_for_selector('#lesson')
    rec(nm, 'answer source link opens that lesson', pg.url.endswith(href))
    pg.go_back(); pg.wait_for_selector('#chips')
    rec(nm, 'back from lesson returns to Ask', pg.locator('#askin').count() == 1)
    # typed question: Enter, Send button, English typed in Spanish UI, unknown question
    pg.goto(BASE + '#/ask'); pg.wait_for_selector('#chips')
    pg.fill('#askin', '¿Cuándo debo pedir una reseña?'); answer_after(lambda: pg.press('#askin', 'Enter'), 'typed question + Enter answers')
    rec(nm, 'input cleared after submit', pg.input_value('#askin') == '')
    pg.fill('#askin', 'cómo cobrar los impuestos'); answer_after(lambda: pg.tap('#askgo'), 'typed question + Send button answers')
    a = answer_after(lambda: (pg.fill('#askin', 'How should I follow up on an estimate?'), pg.tap('#askgo')), 'English question typed in Spanish UI answers')
    rec(nm, 'English typed question answered in English', a is not None and 'Seguimiento' not in a.inner_text()[:5] and 'lessons' in a.inner_text().lower(), (a.inner_text()[:60] if a else ''))
    a = answer_after(lambda: (pg.fill('#askin', 'receta de pastel de chocolate'), pg.tap('#askgo')), "unknown question -> friendly 'no lo encontré' + 3 lessons", expect_found=False)
    rec(nm, "'no lo encontré' text shown", a is not None and 'No lo encontré' in a.inner_text())
    shot('06-ask-notfound')
    n_before = pg.locator('.pair').count()
    pg.fill('#askin', '   '); pg.press('#askin', 'Enter'); pg.wait_for_timeout(200)
    rec(nm, 'empty question ignored', pg.locator('.pair').count() == n_before, pg.locator('.pair').count())
    pg.tap('#clearchat'); pg.wait_for_timeout(100)
    rec(nm, 'clear conversation', pg.locator('.pair').count() == 0)
    # lang toggle on Ask keeps conversation, translates chips
    pg.locator('.chip').first.tap(); pg.wait_for_selector('.pair .a[data-state="answer"]', timeout=WAIT)
    pg.tap('#lang-en'); pg.wait_for_timeout(200)
    rec(nm, 'toggle on Ask page: chips in English, conversation kept', 'How do I get more clients?' in pg.inner_text('#chips') and pg.locator('.pair').count() == 1)
    pg.tap('#lang-es')
    # offline
    ctx.set_offline(True)
    answer_after(lambda: pg.locator('.chip').nth(4).tap(), 'answers with the network OFFLINE')
    ctx.set_offline(False)
    rec(nm, 'no console/page errors so far', not errs, errs[:3])
    # ---- API fallback (Chromium only; uses route interception) ----
    if bt == 'chromium' and slow == 1 and vw == 390:
        pg.evaluate("window.ASK_API_URL='/fake-api/ask'")
        pg.route('**/fake-api/ask', lambda r: r.fulfill(status=500, body='no'))
        pg.tap('#clearchat') if pg.locator('.pair').count() else None
        answer_after(lambda: pg.locator('.chip').nth(1).tap(), 'API configured but failing -> local answer (fallback)')
        pg.unroute('**/fake-api/ask')
        pg.route('**/fake-api/ask', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'answer': 'Respuesta de prueba del proxy.', 'sources': ['speed-sells']})))
        a = answer_after(lambda: pg.locator('.chip').nth(2).tap(), 'API configured and working -> API answer shown')
        rec(nm, 'API answer text used', a is not None and 'Respuesta de prueba' in a.inner_text())
        pg.unroute('**/fake-api/ask'); pg.evaluate("window.ASK_API_URL=''")
        errs[:] = [e for e in errs if 'fake-api' not in e and '500' not in e]
    # ---- auto-update (Chromium 390 only) ----
    if bt == 'chromium' and slow == 1 and vw == 390:
        loads = []
        pg2 = ctx.new_page(); e2 = []
        pg2.on('pageerror', lambda e: e2.append(str(e)))
        pg2.route('**/version.json*', lambda r: r.fulfill(status=200, content_type='application/json', body='{"v":"zzz-new"}'))
        pg2.on('load', lambda: loads.append(1))
        pg2.goto(BASE + '#/', wait_until='load'); pg2.wait_for_timeout(2500)
        rec(nm, 'auto-update: idle home page reloads once for new version (no loop)', len(loads) == 2, len(loads))
        pg2.close(); loads = []
        pg3 = ctx.new_page(); pg3.route('**/version.json*', lambda r: r.fulfill(status=200, content_type='application/json', body='{"v":"zzz-new"}'))
        pg3.goto(BASE + '#/ask', wait_until='load'); pg3.fill('#askin', 'typing something'); pg3.evaluate('window.checkForUpdate && window.checkForUpdate()'); pg3.wait_for_timeout(1200)
        rec(nm, 'auto-update: user typing -> banner, no reload', pg3.locator('#upd').count() == 1 and pg3.input_value('#askin') == 'typing something')
        shot('07-update-banner') if False else None
        pg3.close()
        pg4 = ctx.new_page()
        pg4.goto(BASE, wait_until='load'); cur = pg4.evaluate('APP_VERSION')
        pg4.route('**/version.json*', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'v': cur})))
        pg4.evaluate('window.checkForUpdate()'); pg4.wait_for_timeout(800)
        rec(nm, 'auto-update: up to date -> no banner, no reload', pg4.locator('#upd').count() == 0)
        pg4.close()
    rec(nm, 'no console/page errors at end', not errs, errs[:3])
    b.close()

with sync_playwright() as p:
    for c in CFG: run(p, *c)
ok = sum(1 for r in RES if r['ok']); bad = len(RES) - ok
os.makedirs(SH, exist_ok=True)
json.dump(RES, open(os.path.join(SH, 'results-%s.json' % TAG), 'w'), indent=1)
print('\nTOTAL pass %d fail %d' % (ok, bad))
for c in sorted(set(r['cfg'] for r in RES)):
    rr = [r for r in RES if r['cfg'] == c]; print('  %-34s pass %d fail %d' % (c, sum(r['ok'] for r in rr), sum(not r['ok'] for r in rr)))
sys.exit(1 if bad else 0)
