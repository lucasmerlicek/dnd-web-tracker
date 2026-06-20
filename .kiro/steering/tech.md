# Tech Stack

## Framework & Language
- **Next.js 14** (App Router) with **React 18** and **TypeScript 5**
- **Tailwind CSS 3** for styling (`postcss`, `tailwindcss`)

## Core Libraries
- **next-auth** — credentials-based authentication; session carries the user's `characterId`
- **@vercel/kv** — Redis (Upstash) persistence for character and map marker data
- **framer-motion** — page transitions and ambient visual effects
- **@react-three/fiber**, **@react-three/cannon**, **three** — 3D dice rolling
- **react-zoom-pan-pinch** — interactive map zoom/pan
- **uuid** — id generation for inventory items, spell-created weapons, familiars

## Testing
- **vitest** as the test runner (config in `vitest.config.ts`; `@` alias → `src`)
- **fast-check** for property-based tests (`*.property.test.ts`)
- Tests live in `__tests__/` folders colocated with the code they cover
- Run the full suite with `npx vitest run` (currently 237 passing across 44 files)

## Persistence
- All app state lives in Vercel KV (Redis), no SQL database
- Keys: `character:madea`, `character:ramil`, `markers:madea`, `markers:ramil`
- `src/lib/kv.ts` wraps reads/writes and provides a `deepMerge` for partial updates
- The KV store was archived after inactivity and restored from backup on 2026-06-20
  (a new Upstash database `upstash-kv-red-xylophone`, AWS `eu-central-1`); see `CLEANUP.md`

## Scripts
- npm scripts: `dev`, `build`, `start`, `lint` (standard Next.js)
- One-off maintenance scripts live in `src/scripts/` and are run with `npx tsx`
  (e.g. `npx tsx src/scripts/patch-ramil-spells-actions.ts`). They load `.env.local`
  for KV credentials. `src/scripts/` is excluded from the production build via `tsconfig.json`,
  so dev scripts don't gate `next build`.
- `apply-level-ups.ts` is dead code (it imported the now-deleted `migrate.ts`); safe to remove.

## Environment
- `.env.local` (gitignored) holds `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and the Vercel KV tokens
  (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL`).
  See `.env.local.example` for the template (placeholders only).

## Build / Run
```
npm install
npm run dev      # local dev server at http://localhost:3000
npm run build    # production build (type-checks all .ts except src/scripts)
npm run lint     # eslint (eslint-config-next)
npx vitest run   # tests
```

## Caveats
- The repo has a pre-existing CRLF/LF line-ending inconsistency that can make `git status`
  show unrelated files as modified — review diffs before large commits.
- `**/node_modules/` and `**/.next/` are gitignored to prevent re-committing build artifacts.
