# Project Structure

## Top Level
```
src/                     # All application source (tsconfig maps @/* → ./src/*)
public/images/           # Runtime assets: backgrounds, UI textures, icons, maps
data/                    # Source icon assets (BG3 spell/weapon icons) used by fetch scripts
.kiro/                   # Specs and steering
.env.local(.example)     # NextAuth + Vercel KV credentials
CLEANUP.md               # Record of the 2026-06-20 repo/infra cleanup
next.config.mjs, postcss.config.mjs, tailwind/eslint configs, vitest.config.ts
```

The old Python `legacy/` tree, a duplicate `src/src/` tree, doubled route folders, and
committed build/cache junk were removed in the 2026-06-20 cleanup (see `CLEANUP.md`).

## `src/` Layout
```
src/
├── app/                 # Next.js App Router pages + API routes
│   ├── dashboard/       # Main character screen
│   ├── attack/          # Attack rolls (attack-calc.ts) + WeaponCard
│   ├── spells/          # Spells page, SpellCard, spell-calc.ts, sorcery-points.ts
│   ├── saves/           # Saving throws, death saves
│   ├── actions/         # Class actions + universal actions
│   ├── bag/             # Inventory & coins
│   ├── journal/         # Session journal, characters, places
│   ├── map/             # Map viewer (map-constants.ts)
│   ├── familiars/       # Familiars tab (conditional)
│   ├── login/           # Credentials login
│   ├── layout.tsx, page.tsx, globals.css
│   └── api/
│       ├── auth/[...nextauth]/   # NextAuth handler
│       ├── character/get|update/ # Character data read/write
│       └── markers/get|update/   # Map marker read/write
├── components/          # Reusable UI (ui/, attack/, bag/, dashboard/, dice/, familiars/, providers/)
├── data/                # Static registries: spell-registry.ts, familiar-registry.ts, universal-actions.ts
├── hooks/               # useCharacterData, useDiceRoll, useMapMarkers, useAutoSave, useUndoStack, useCursorNavigation
├── lib/                 # Pure logic & helpers (kv.ts, auth.ts, *-calc.ts, ac-calc, hit-dice, etc.)
├── scripts/             # One-off KV maintenance scripts (run with npx tsx; excluded from build)
├── types/               # Shared TypeScript types (character.ts, spell.ts, map.ts, dice.ts)
└── middleware.ts        # Route protection
```

## Code Architecture
- **Screen-based App Router**: each screen is a `page.tsx` client component under `src/app/<screen>/`.
- **Data flow**: `useCharacterData` loads/persists the active character via the
  `api/character` routes, which read/write Vercel KV through `src/lib/kv.ts`. Components call
  `mutate(partial)` to apply partial updates (deep-merged server-side).
- **Character identity**: the NextAuth session carries `characterId` (`madea` | `ramil`);
  pages read it to render class-specific features conditionally.
- **Single source of truth for state**: `CharacterData` (`src/types/character.ts`), including
  `classResources` for per-class features and feat free-cast flags.
- **Static game data** (spells, familiars, universal actions) lives in `src/data/`; live
  per-character state (known spells, prepared spells, actions, inventory) lives in KV.
- **Pure logic in `src/lib/`** is unit/property tested; UI components stay thin.

## Conventions
- Path alias `@/*` → `src/*` (used in both app code and tests).
- Tests are colocated in `__tests__/` folders; property tests use `*.property.test.ts` and are
  tagged `Feature: <spec>, Property <n>: <text>`.
- Runtime images load from `public/images/` (referenced by absolute `/images/...` paths).
- Class-specific code branches on `characterId` or on the presence of a `classResources` field
  (e.g. `sorceryPointsMax` ⇒ Sorcerer, `preparedSpells` ⇒ Wizard) rather than hardcoding where
  avoidable.
- KV mutations from scripts go through `createClient` + `.env.local` loading (see existing
  scripts in `src/scripts/`).
