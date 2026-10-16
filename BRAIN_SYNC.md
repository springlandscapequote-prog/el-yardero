# Brain sync: how lessons get from the Google Doc into the app

**Source of truth:** the Google Doc "El Yardero Brain — Knowledge & Operating Instructions".
**Only** the text between `BEGIN EL YARDERO PUBLIC KNOWLEDGE` and `END EL YARDERO PUBLIC KNOWLEDGE` is public. The internal inbox, source notes,
change log, "Synchronization and continuity" and all instructions are never read into the output.

## One sync (what the script does)
`python3 tools/sync_brain.py --file /path/to/brain_export.md`
(the export is a markdown/plain-text copy of the doc, or the JSON the Drive connector returns; keep it OUTSIDE this repo — `.gitignore` also blocks `*.export.md` and `brain_export*`)

1. Cuts out the public block (exactly one marker pair, or it fails).
2. Reads the "English bullet / `En español:` bullet" pairs. English-only bullets (no Spanish) are not imported (listed in the report).
3. Builds `data/lessons.json` (`id` = stable slug of the English title, `title_es/en`, `category`, `tags`, `body_es/en`, `date`), `data/lessons.js` (same data for the app, no network needed), `data/taxonomy.json`, and `data/sync.json` (`synced_at_pt`, `synced_at_iso`, `count`, `source_sha256`, `skipped`).
4. Spanish titles of the "Fernando's … rule" lessons and category overrides live in `tools/lesson_meta.json`; a new such lesson without a Spanish title makes the sync fail until one is added.
5. **Safety checks — any failure = exit 2, nothing written:** marker pair; every output text found verbatim in the public block; no internal-section words (`Learning inbox`, `internal only`, `FERNANDO_REVIEW`, `Canonical Drive`, …); no dollar amounts / e-mails / URLs / phone numbers (that lesson is left out and reported); no capitalised word that is not in `tools/name_allowlist.txt` (possible customer / crew / supplier name — a human reviews, then allow-lists it if harmless); output may not shrink by more than 20 % versus the previous sync.
6. Re-running with unchanged content does not touch the sync time (so no new site version is created).

`python3 tests/sync_safety_test.py <export>` proves the checks work (duplicate marker, missing END, a customer-like name, internal words, mass deletion all fail).

## Scheduled run (plan — the GitHub Action cannot read Drive without a secret, and no secrets go in this repo)
A routine on the box (owned by whoever maintains El Yardero) runs about **once an hour**, like the old site's change-check:
1. Read the Brain doc with the Drive connector and save the result to `<private folder outside the repo>/brain_export.md` (outside git).
2. `cd <repo checkout> && git pull --ff-only && python3 tools/sync_brain.py --file <private folder outside the repo>/brain_export.md`
3. If it exits 2: do not push; tell the El Yardero bot / Grok Bot the failure text (it names the lesson or word to review).
4. If `git status --porcelain data/` is not empty: `python3 tools/check_data.py && git add data && git commit -m "sync brain: N lessons" && git push`. The Action stamps the new version; open phones update by themselves.
5. Leave nothing running.
Lessons awaiting Fernando's approval are NOT in the public block, so they are never published. Keep them in the private folder until he approves and the El Yardero bot moves them into the public block of the Brain.

## Adding words to the allow-list
`tools/name_allowlist.txt` — only words that are clearly not names (product words, weekdays, "GPS"). If a real name shows up, remove it from the Brain doc's public block instead.
