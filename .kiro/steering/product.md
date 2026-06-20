# Product Overview

D&D Character Tracker — a web application for managing Dungeons & Dragons 5th Edition
characters during tabletop sessions. It is deployed on Vercel (live project
`dnd-web-tracker-jowe`) and backed by an Upstash/Vercel KV (Redis) store.

The app is a single Next.js application shared by two authenticated users, each of whom
sees only their own character. Credentials are hardcoded; on login the user's
`characterId` (`madea` or `ramil`) selects which character data is loaded.

## Characters
- **Madea Blackthorn** — Shadow Sorcerer (Sorcerer features: sorcery points, metamagic,
  Innate Sorcery / Sorcery Incarnate, Raven Form, Strength of the Grave, familiars).
- **Ramil al-Sayif** — Fighter 1 / Wizard (Bladesinger) multiclass (Bladesong, Second Wind,
  spell preparation, Druid Initiate free cast).

## Features
- Dashboard with character stats, skills, ability scores, HP, AC, inspiration/luck
- Attack rolls and damage calculations with advantage support, plus spell-created weapons
- Spell management: rich spell registry, slot tracking, preparation (Wizard), metamagic and
  sorcery point conversion (Sorcerer), upcasting, ritual casting, and feat-granted free casts
- Saving throws and death saves
- Inventory (structured gear/utility/treasure), gear stat modifiers, and coin management
- Session journal with character/place tracking
- Interactive world map viewer (zoom/pan via `react-zoom-pan-pinch`) with categorized markers
- Short rest / long rest mechanics that recharge resources and reset flags
- 3D dice rolling (`@react-three/fiber` + `@react-three/cannon`)
- Familiars tab (conditional) for summoned creatures

The UI uses a dark fantasy / Final Fantasy XII–inspired aesthetic with per-screen background
images and UI box textures (assets under `public/images/`). Class-specific features render
conditionally based on the loaded character.

## Notes
- A previous Python/pygame desktop version existed under `legacy/` but was removed during the
  2026-06-20 cleanup (see `CLEANUP.md`). The web app is now the only implementation; runtime
  assets live in `public/images/`.
- The workspace still contains reference PDFs (D&D 5E rulebooks, character sheets), backstory
  text files, inspiration images, and world maps.
