#!/usr/bin/env python3
"""Negative tests for tools/sync_brain.py: each mutated export MUST make the sync fail (exit 2) or skip the bad lesson.
usage: python3 tests/sync_safety_test.py /path/to/brain_export.md   (the export stays outside the repo)"""
import subprocess, sys, os, tempfile, shutil, json
SRC = open(sys.argv[1], encoding='utf-8').read()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def run(text, out=None):
    d = tempfile.mkdtemp(); f = os.path.join(d, 'x.md'); open(f, 'w', encoding='utf-8').write(text)
    o = out or os.path.join(d, 'out'); os.makedirs(os.path.join(o, 'data'), exist_ok=True)
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'sync_brain.py'), '--file', f, '--out', o, '--dry-run'], capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr
END = 'END EL YARDERO PUBLIC KNOWLEDGE'
add = lambda bullets: SRC.replace(END, bullets + '\n' + END)
good_pair = lambda en, es: '\\- %s  \n\n\\- En español: %s  \n' % (en, es)
tests = [
 ('baseline passes', SRC, 0, None),
 ('duplicate BEGIN marker', SRC.replace('END EL YARDERO PUBLIC KNOWLEDGE', 'BEGIN EL YARDERO PUBLIC KNOWLEDGE\n' + END, 1), 2, 'marker'),
 ('missing END marker', SRC.replace(END, 'END X'), 2, 'marker'),
 ('customer-like name in a new lesson', add(good_pair('Call Maria Gonzalez Landscaping about the invoice. She owes money.', 'Llama a la señora María González por la factura.')), 2, 'capitalised'),
 ('internal marker word inside a lesson', add(good_pair('Check the Learning inbox before you quote. Always do it.', 'Revisa la bandeja antes de cotizar. Siempre.')), 2, 'internal'),
 ('dollar amount lesson is skipped (not imported)', add(good_pair('Charge $500 for a cleanup every time. It works.', 'Cobra $500 por cada limpieza. Funciona.')), 0, 'dollar'),
 ('e-mail lesson is skipped', add(good_pair('Write to bob@example.com for prices. Easy.', 'Escribe a bob@example.com para precios. Fácil.')), 0, 'e-mail'),
 ('mass deletion (<80% of lessons) refused', None, 2, 'dropped'),
]
fails = 0
for name, text, want, needle in tests:
    if text is None:   # keep only 20 of the lessons while the previous output has 96
        lines = SRC.split('\n'); keep = []; n = 0
        for ln in lines:
            if ln.startswith('\\- '): n += 1
            if ln.startswith('\\- ') and n > 60 and n < 190: continue
            keep.append(ln)
        text = '\n'.join(keep)
        code, out = run(text, out=os.path.join(ROOT))     # uses the real data/ folder only for the count (dry-run writes nothing)
    else:
        code, out = run(text)
    ok = (code == want) and (needle is None or needle in out.lower())
    print(('PASS ' if ok else 'FAIL ') + name + '  (exit %d)' % code)
    if not ok: fails += 1; print(out[-300:])
print('safety tests failed:', fails); sys.exit(1 if fails else 0)
