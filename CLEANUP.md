# Repo & Infrastructure Cleanup — 2026-06-20

Summary of a cleanup pass over the `dnd-web-tracker` project (repo + Vercel + database).

## Context

The Upstash Redis database backing the app had been archived/deleted after 14 days of
inactivity. It was reactivated by creating a new Upstash database (`upstash-kv-red-xylophone`,
Free tier, AWS `eu-central-1`) and restoring data from the automatic **pre-deletion backup**
via Upstash's "Migrate Database" flow. The four app keys (`character:madea`, `character:ramil`,
`markers:madea`, `markers:ramil`) were confirmed restored. Production env vars and a redeploy
followed on the live project (`dnd-web-tracker-jowe`).

## Repository cleanup

Tracked files dropped from ~781 to ~301; working tree reduced by ~296 MB.

### Removed

- **`legacy/`** (~296 MB, ~275 files) — the old Python tracker (`main.py`, `map_viewer.py`),
  ~200 log files, campaign maps/PDFs, and duplicate UI images. Not referenced by the app
  (runtime images live in `public/images/`).
- **Duplicate `src/src/` tree** (111 files) — a full second copy of the source. The app builds
  from `src/` (`tsconfig` maps `@/*` → `./src/*`); `src/src/` was dead to the app.
- **Dead doubled route/page folders** — copy-paste artifacts that created nested duplicate
  routes the app never calls:
  `api/character/character`, `api/markers/markers`, `api/auth/auth`,
  `actions/actions`, `attack/attack`, `bag/bag`, `dashboard/dashboard`,
  `journal/journal`, `map/map`, `saves/saves`, `spells/spells`, and `scripts/scripts`.
- **Committed build/cache junk** — `src/.next/` (82 files) and `src/node_modules/`.
- **Obsolete migration scripts** — `src/scripts/migrate.ts`, `src/scripts/__tests__/migrate.test.ts`,
  `scripts/migrate.ts`, `scripts/migrate-madea-journal.js`. These were one-time scripts that
  seeded the database from `legacy/`; the migration is complete and the data is restored.

### Changed

- **`vitest.config.ts`** — the test `@` alias pointed at `src/src`; repointed to `src` so tests
  resolve against the canonical tree.
- **Test consolidation** — six tests that existed only under `src/src/` were preserved by moving
  them into `src/lib/__tests__/`:
  `empowered-spell`, `generic-actions-filter`, `innate-sorcery`, `innate-sorcery-dc`,
  `long-rest-innate-sorcery`, `sorcerous-restoration` (one relative import path fixed).
- **`.gitignore`** — added `**/node_modules/` and `**/.next/` so nested build/dependency
  artifacts can't be re-committed.
- **`.env.local.example`** — replaced real (now-dead) tokens with placeholders.
- **`tsconfig.json`** — added `src/scripts` to `exclude`. The production build type-checks every
  `.ts` file; the root `scripts/` was already excluded but `src/scripts/` was not, so a leftover
  dev script (`apply-level-ups.ts`) failed the build after `migrate.ts` was removed. Dev scripts
  aren't part of the app, so they shouldn't gate the build.

### Verification

- Test suite: **237 passing, 0 failing** (44 files). The previously-failing `migrate.test.ts`
  was removed along with the migration scripts.
- The app (`src/app`, `src/components`, `src/lib`, `src/hooks`, `src/data`) imports nothing from
  `src/scripts`, so excluding it is safe.

## Vercel cleanup

- Deleted the redundant **`dnd-web-tracker`** project — same GitHub repo as the live project,
  no database/env vars connected, last deploy failed, only the default `.vercel.app` domain.
- Live project **`dnd-web-tracker-jowe`** retained and redeployed against the restored database.

## Follow-ups / notes

- **`apply-level-ups.ts`** is now dead code (it imported helpers from the deleted `migrate.ts`).
  It no longer breaks the build (excluded), but can be deleted.
- The repo has a pre-existing **CRLF/LF line-ending** inconsistency that can make `git status`
  show unrelated files as modified — review diffs before large commits.
