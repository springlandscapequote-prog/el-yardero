# El Yardero — Yardero to CEO

Bilingual (Spanish first, English toggle) business-lessons app for landscaping owners and crew leads, built for phones.
Live: https://springlandscapequote-prog.github.io/el-yardero/

- **Lecciones / Lessons** — 96 short practical lessons (from the public block of the El Yardero Brain), categories, search over titles and bodies (accent-insensitive, both languages), a reading page per lesson with previous / next and a share link.
- **Pregúntale al Yardero / Ask El Yardero** — starter question chips that **auto-submit on tap and always show an answer**; typing a question + Enter / Send works too. Answers are built **on the device** from the lessons (BM25-style retrieval, light Spanish/English stemming, accent-insensitive, curated topic hints), with links to the source lessons. No match -> a friendly "no lo encontré" with 3 suggested lessons. Every answer ends with the invitation to the one paid offer (one-hour consultation, $120 USD, Wed/Thu 11 a.m.–2 p.m. Pacific). **There is no booking link yet**: set `BOOKING_URL` in `config.js` and the "Reservar / Book" button appears.
- No ads, no logins, no tracking, no cookies. The language choice is the only thing stored (localStorage). Questions are never stored or sent anywhere (unless you later set `ASK_API_URL`, see below).
- It is an AI guide, **not** Fernando answering live; the page says so.

## Stack
Vanilla HTML / CSS / JS, no build step, no dependencies. Old-Safari friendly (no `?.`, `??`, CSS `inset`; `100vh` with `100dvh` override; safe-area insets). Hash routing (`#/`, `#/lesson/<slug>`, `#/ask`) so it works on GitHub Pages and with refresh / deep links.

```
index.html  style.css  config.js  auto-update.js  version.js  version.json
js/app.js   UI, routing, language, search, lesson pages, Ask screen
js/ask.js   the answering module (pure; no DOM). Browser: window.EYAsk, node: require('./js/ask.js')
data/lessons.json (+ lessons.js for the app)   data/sync.json   data/chips.js   data/topics.js   data/taxonomy.json   data/lesson_dates.json
tools/sync_brain.py   Brain doc -> data/ (with safety checks)      tools/check_data.py   re-check of published data
tools/stamp.sh        version stamp                                 tests/                 node + Playwright tests
```

## Settings (`config.js`)
| name | default | meaning |
|---|---|---|
| `ASK_API_URL` | `''` | Address of a small proxy to a real AI service. Empty = local answers (no network). If set, `js/ask.js` POSTs `{question, lang, context:[top lessons]}` and expects `{answer, sources:[lessonIds]}`; on error or after 9 s it falls back to the local answer. **Never put an API key in this repo**; the proxy holds the key. |
| `BOOKING_URL` | `''` | Booking page for the consultation. Button appears only when set. |
| `STORE_URL`, `SOCIAL_HANDLE` | gumroad store, `@fermillonetas` | footer |

## Keeping lessons in sync with the Brain
See `BRAIN_SYNC.md`. In short: a box routine exports the Brain Google Doc to a text file **outside** this repo, runs `python3 tools/sync_brain.py --file <export>`, and pushes if `data/` changed. Only the text between `BEGIN/END EL YARDERO PUBLIC KNOWLEDGE` is read, and the script refuses to write anything that fails its safety checks. The footer shows "Última sincronización / Last synced" from `data/sync.json`.

## Auto-update
Same as Happy Colors (`UPDATE.md`): every push to `main` is stamped by the GitHub Action (`.github/workflows/stamp-version.yml`); open pages fetch `version.json` with no-store and reload once when idle (or show a banner if you are typing). No service worker.

## Tests
```
node tests/chips_test.js                                  # every chip, ES+EN, returns an answer + source
python3 tests/sync_safety_test.py <brain_export.md>       # the sync refuses names, internal text, bad markers, mass deletion
python3 tests/e2e.py http://127.0.0.1:8793/ local         # Playwright: WebKit iPhone 13 + Chromium Pixel 7, touch, 4x CPU pass
python3 tools/check_data.py                               # published data re-check (also runs in CI)
```
Old-site bugs and how this app avoids them: see `BUGS_AVOIDED.md`. Licenses: `LICENSES.md`.
