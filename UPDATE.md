# Auto-update (same recipe as Happy Colors / Color Clash Cubes)

Every time the page is opened (and when the tab becomes visible again, and when restored from the back/forward cache) it fetches
`version.json` with `cache:'no-store'` and compares it with the `APP_VERSION` baked into the loaded code (`version.js`).
If different: it reloads ONCE (only when idle: nothing typed in the Ask box or the search box, no answer being prepared;
a sessionStorage flag prevents loops), otherwise it shows a "Nueva versión lista — toca para actualizar / New version ready" banner.
Offline / fetch failure = silent. No service worker. The language choice (localStorage) survives the reload.

The GitHub Action `.github/workflows/stamp-version.yml` re-stamps on every push to `main` (SHA-256 of all app files incl. `data/*`,
written to `version.js`, `version.json` and the `?v=` on the script/style tags) and asks Pages to rebuild. So a Brain sync that changes `data/` automatically ships a new version.
`./release.sh "message"` = stamp + commit + push in one step. Repo setting needed: Actions > Workflow permissions = Read and write.
