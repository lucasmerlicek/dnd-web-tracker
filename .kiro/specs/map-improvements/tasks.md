# Implementation Plan: Map Improvements

## Overview

Four targeted improvements to `src/src/app/map/page.tsx`: switch marker placement to double-click, apply inverse-scale to markers for zoom consistency, replace single Aetherion image with per-floor images (GF + floors 1–6), and normalize the map container so both maps share the same border frame. Static assets are copied from `legacy/Maps/Aetherion Maps/` to `public/images/maps/aetherion/`.

## Tasks

- [x] 1. Copy Aetherion floor images to public directory
  - [x] 1.1 Create `public/images/maps/aetherion/` directory and copy all 7 floor images
    - Copy `legacy/Maps/Aetherion Maps/GF.png` → `public/images/maps/aetherion/GF.png`
    - Copy `legacy/Maps/Aetherion Maps/1.png` → `public/images/maps/aetherion/1.png`
    - Copy `legacy/Maps/Aetherion Maps/2.png` → `public/images/maps/aetherion/2.png`
    - Copy `legacy/Maps/Aetherion Maps/3.png` → `public/images/maps/aetherion/3.png`
    - Copy `legacy/Maps/Aetherion Maps/4.png` → `public/images/maps/aetherion/4.png`
    - Copy `legacy/Maps/Aetherion Maps/5.png` → `public/images/maps/aetherion/5.png`
    - Copy `legacy/Maps/Aetherion Maps/6.png` → `public/images/maps/aetherion/6.png`
    - _Requirements: 3.1_

- [x] 2. Update constants and add floor image mapping
  - [x] 2.1 Update `FLOOR_LABELS` and add `AETHERION_FLOOR_IMAGES` constant in `src/src/app/map/page.tsx`
    - Change `FLOOR_LABELS` from `["Ground", "1st", "2nd", "3rd", "4th"]` to `["GF", "1", "2", "3", "4", "5", "6"]`
    - Add `AETHERION_FLOOR_IMAGES: Record<number, string>` mapping floor indices 0–6 to `/images/maps/aetherion/{label}.png`
    - Update `mapSrc` to use `AETHERION_FLOOR_IMAGES[floor]` instead of the single Aetherion image path
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 2.2 Write property test: Floor index to image path mapping
    - Create `src/src/app/map/__tests__/map.property.test.ts`
    - **Property 3: Floor index to image path mapping**
    - Generate random floor indices in [0, 6] using fast-check
    - Assert `AETHERION_FLOOR_IMAGES[index]` matches `/images/maps/aetherion/{label}.png` where label is `"GF"` for 0 and the string index for 1–6
    - **Validates: Requirements 3.1, 3.3**

- [x] 3. Switch marker placement from single-click to double-click
  - [x] 3.1 Change map click handler from `onClick` to `onDoubleClick` in `src/src/app/map/page.tsx`
    - Replace `onClick={handleMapClick}` on the map container div with `onDoubleClick={handleMapClick}`
    - No changes to `handleMapClick` logic itself — it already records % position and shows the Creation Form
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Add Enter key support on the title input to create marker
    - Add `onKeyDown` handler to the title `<input>` in the Create Marker form
    - When `Enter` is pressed and title is non-empty, call `createMarker()`
    - _Requirements: 1.4_

  - [ ]* 3.3 Write property test: Click-to-percentage coordinate calculation
    - Same test file as 2.2 (`src/src/app/map/__tests__/map.property.test.ts`)
    - **Property 1: Click-to-percentage coordinate calculation**
    - Generate random bounding rects (positive width/height) and random click positions within them
    - Assert computed `x = ((clientX - rect.left) / rect.width) * 100` and `y = ((clientY - rect.top) / rect.height) * 100` are in [0, 100]
    - **Validates: Requirements 1.1**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement zoom-consistent marker sizing
  - [x] 5.1 Add `currentScale` state and wire `onTransformed` callback in `src/src/app/map/page.tsx`
    - Add `const [currentScale, setCurrentScale] = useState(1)` state
    - Add `onTransformed={(_ref, state) => setCurrentScale(state.scale)}` to `<TransformWrapper>`
    - _Requirements: 2.1, 2.2_

  - [x] 5.2 Apply inverse-scale transform to marker icons
    - Replace Tailwind `-translate-x-1/2 -translate-y-1/2` classes on marker buttons with inline `transform: translate(-50%, -50%) scale(${1 / currentScale})`
    - This keeps markers at ~32px visual size regardless of zoom level
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 5.3 Write property test: Inverse scale preserves visual marker size
    - Same test file as 2.2 (`src/src/app/map/__tests__/map.property.test.ts`)
    - **Property 2: Inverse scale preserves visual marker size**
    - Generate random zoom levels in [0.5, 4] using fast-check
    - Assert `baseSize * (1 / zoomLevel) * zoomLevel` equals `baseSize` within floating-point tolerance
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 6. Normalize map container sizing
  - [x] 6.1 Update map container and Image component in `src/src/app/map/page.tsx`
    - Add `aspect-[3/2]` class to the map container div (the one with `ref={mapRef}`)
    - Switch `<Image>` from explicit `width`/`height` props to `fill` layout with `className="object-contain"`
    - This ensures both Valerion and Aetherion floor images render within the same frame without clipping
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Wire floor switching state resets and sync files
  - [x] 7.1 Ensure floor switch clears selected marker and creation state
    - Verify the floor selector button `onClick` already calls `setSelectedMarker(null)` and `setCreating(null)` — this is already in place, but confirm it works with the new 7-floor setup
    - _Requirements: 3.4_

  - [x] 7.2 Sync modified file to `src/app/map/page.tsx`
    - Copy `src/src/app/map/page.tsx` → `src/app/map/page.tsx`
    - Ensure Next.js App Router picks up the updated route
    - _Requirements: 1.1–1.6, 2.1–2.3, 3.1–3.4, 4.1–4.3_

  - [ ]* 7.3 Write property test: Creation state is cleared after marker creation
    - Same test file as 2.2 (`src/src/app/map/__tests__/map.property.test.ts`)
    - **Property 4: Creation state is cleared after marker creation**
    - Generate random valid marker data (non-empty titles, positions in [0, 100]) using fast-check
    - Assert that after calling the creation logic, the creating state is null
    - **Validates: Requirements 1.5**

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- All code changes are in a single file: `src/src/app/map/page.tsx`
- After modifying `src/src/app/map/page.tsx`, the file must be synced to `src/app/map/page.tsx` (task 7.2)
- Property tests go in `src/src/app/map/__tests__/map.property.test.ts`
- Test runner: `npx vitest run` from root directory
