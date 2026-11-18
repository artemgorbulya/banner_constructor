# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # start dev server (Next.js, port 3000)
npm run build         # production build → .next/
npm run start         # serve production build
npm run lint          # ESLint

npm run test          # Vitest in watch mode
npm run test:run      # Vitest single run (CI)
npm run test:coverage # coverage report via v8
```

To run a single test file:
```bash
npx vitest run src/test/lib/presets.test.js
```

## Architecture Overview

A single-page banner editor built on **Next.js 15 App Router**. The entire app is client-only (no SSR): `src/app/page.jsx` renders `ClientPage.jsx` which dynamically imports `App.jsx` with `{ ssr: false }`. This pattern exists because Konva and `localStorage` both require `window`.

Layout: `LayersPanel` (left) | `BannerCanvas` (center) | `AddPanel + TextControls` (right), topped by `Toolbar`. State lives entirely in Redux; components are pure renders of that state.

### Entry points

- `src/app/layout.jsx` — HTML shell, imports `globals.css`
- `src/app/ClientPage.jsx` — `'use client'` boundary, dynamic import of `App` with `ssr: false`
- `src/App.jsx` — Redux `<Provider>` + editor shell; has `'use client'` directive
- `src/app/globals.css` — all styles (single flat CSS file, no CSS modules)

### Redux store (`src/store/`)

`editorSlice.js` is the single source of truth:

- `canvasSize` — banner pixel dimensions
- `background` — `{ color }` solid fill
- `backgroundImage` — `{ src, x, y, width, height, rotation }` — a separate interactive layer, always rendered below `elements[]`
- `elements[]` — array of `{ id, type: 'image'|'text', x, y, width, height, rotation, opacity, visible, ... }`. Array order = z-order (last = top).
- `selectedId` — currently selected element id, or `'__bg_image__'` for the background image
- `keepRatio` — global boolean; when true all 8 Transformer handles maintain aspect ratio
- `snapEnabled` — snap-to-grid (10px grid)
- `safeAreaEnabled` — toggles safe area frame visibility
- `safeAreaMargins` — `{ top, right, bottom, left }` in px
- `logoFrameEnabled` — toggles 210×70 logo frame (top-left of safe area)
- `deviceFramesEnabled` — toggles two 160×160 device frames; position depends on preset layout
- `history.past[] / future[]` — undo/redo stacks; each entry is a JSON snapshot of `elements[]`

**State is loaded from `localStorage` synchronously in `store/index.js`** via `preloadedState` in `configureStore`. The guard `typeof window !== 'undefined'` prevents server-side access. Do NOT add a separate restore hook.

Key action distinction: `updateElement` (no history) is for live drag feedback; `updateElementWithHistory` is for final commit (drag end, transform end).

### Canvas (`src/components/Canvas/`)

**BannerCanvas.jsx** mounts two Konva `Stage`s:
1. **Export stage** — exact `canvasSize` dimensions, `display:none`. `stageRef` points here. Export reads from this stage so there are no scale/overflow artifacts.
2. **Preview stage** — dimensions are `(canvasSize + OVERFLOW*2) * scale` where `OVERFLOW = 150` canvas units. Content lives in a `Group` offset by `OVERFLOW` so element coordinates stay in banner-space (0,0 = banner top-left). An inner clip `Group` restricts visual rendering to the banner rect.

The `CanvasTransformer` is placed **outside** the clip group so its handles are visible in the overflow zone.

Safe area frames (main rect, logo frame, device frames) are rendered in the preview stage only — they are never on the export stage.

**CanvasTransformer.jsx** — wraps Konva `Transformer`. Uses `keepRatioRef` and `isTextRef` (refs, not state) inside `boundBoxFunc` to avoid stale closures. For text: only `middle-left` / `middle-right` anchors, no rotation, keepRatio off. For images: all 8 anchors; `boundBoxFunc` enforces ratio on side handles by comparing `wDelta` vs `hDelta`. Uses `useLayoutEffect` + a `requestAnimationFrame` retry because React 19 concurrent mode can defer Konva node attachment past the synchronous commit phase.

**ElementNode.jsx** — `ImageNode` uses `onMouseDown` (not `onClick`) for reliable first-click selection. `TextNode` uses `wrap="word"`, auto-height (no fixed height), and resets `scaleX/scaleY` to 1 in `onTransform` to prevent distortion — only `width` is persisted.

**Important Konva gotcha**: never use `CSS.escape()` on element IDs when calling `layerRef.current.findOne('#id')`. UUIDs starting with digits break CSS.escape; Konva's findOne does string comparison, not CSS selector parsing.

### Presets (`src/lib/presets.js`)

`PRESETS` array defines banner size presets shown in `SizeModal`. Each entry has:
- `label`, `width`, `height`, `margins` — used to populate the size dialog
- `deviceFramesLayout` — controls how the two 160×160 device frames are positioned:
  - `'wide'` — side by side, centered vertically in canvas (Billboard 1536px)
  - `'tall'` — one at top-right and one at bottom-right of safe area (Web Banner 880px)
  - `'stacked'` — both on right edge of safe area, first 20px from top, second 8px below first (Promo Banner 700px)

`computeDeviceFrames(canvasSize, safeAreaMargins)` — pure function that returns `{ frame1: {x,y}, frame2: {x,y}, size }`. Used by `BannerCanvas.jsx`. Custom canvas sizes not matching any preset fall back to `'wide'` (width > 1200) or `'tall'`.

To add a new banner size: add an entry to `PRESETS` with `deviceFramesLayout`. If none of the existing layouts fit, add a new layout string and handle it in `computeDeviceFrames` and its tests.

### Project persistence (`src/lib/projects.js`)

Projects are stored in **IndexedDB** (`banner_projects` database, `projects` store). Limit: 20 projects. Auto-save to `localStorage['banner_project_v2']` happens on every Redux state change via `syncAutoSave`. On first run, migrates any projects from the legacy `localStorage` key `banner_saved_projects`.

### Font loading (`src/lib/fonts.js`)

`loadFont(family)` returns a Promise that resolves only after both the Google Fonts CSS is parsed AND `document.fonts.load()` confirms the face is available. Font changes in `TextControls` `await loadFont()` before dispatching to Redux — otherwise Konva draws with the fallback font.

### Image library (`src/lib/library.js`)

`LIBRARY` array of categories. To add images: copy file to `public/library/`, add `{ name, src: '/library/filename' }` to the target category. Empty categories are hidden in the UI.

### Export

`src/lib/export.js` calls `stageRef.current.toDataURL()` on the **hidden export stage** (exact pixel dimensions, no scale). PNG is always lossless; JPG accepts a 0–1 quality param.

### Usage statistics (`/stats`)

Every banner download in `ExportModal` fires `trackExport(buildExportEvent(...))` (`src/lib/stats.js`) — a fire-and-forget `POST /api/stats` that must never block or break the export. The event holds preset/size, format, element counts, first texts and a small JPEG thumbnail (`generateThumbnail`).

`src/app/api/stats/route.js` validates via `sanitizeEvent` (server timestamp, JPEG-only thumbnail, clamped texts/counts, 100 KB cap) and stores **one Vercel Blob per export** (no shared file → no write races). Key fields are encoded in the pathname (`stats/<ts>__<preset-slug>__<W>x<H>__<format>.json`, parsed by `parseStatsPath`) so `src/app/stats/page.jsx` builds summaries from `list()` alone and reads only the latest 50 JSONs via `get()`.

Configured when `BLOB_READ_WRITE_TOKEN` (classic stores) or `BLOB_STORE_ID` (newer stores, OIDC auth via the runtime `VERCEL_OIDC_TOKEN`) is set — see `isStatsConfigured()`. Vercel adds one when a Blob store is connected; a redeploy is needed. Without either, the route returns 204 and the page shows a setup hint. Blob access is `private` by default; set `STATS_BLOB_ACCESS=public` only if the store was created as public. `/stats` is not linked from the UI and has no auth.

## Testing

**Stack**: Vitest + React Testing Library + jsdom. Config: `vitest.config.mjs` (`.mjs` forces ESM; takes precedence over `vitest.config.js`). Setup: `src/test/setup.js`.

**Test layout**:
```
src/test/
  setup.js                    ← global mocks: react-konva, file-saver, crypto.randomUUID
  store/editorSlice.test.js   ← pure reducer tests (no React)
  store/index.test.js         ← preloadedState from localStorage (re-imports module per test)
  lib/presets.test.js         ← PRESETS structure + computeDeviceFrames all layouts
  lib/projects.test.js        ← IndexedDB via fake-indexeddb
  lib/imageRegistry.test.js   ← IDB-backed image registry (fake-indexeddb + vi.resetModules)
  lib/fonts.test.js
  lib/export.test.js
  lib/snapGrid.test.js
  lib/stats.test.js           ← event building, pathname encoding, summaries, sanitizeEvent
  api/stats.route.test.js     ← POST /api/stats with mocked @vercel/blob
  app/statsPage.test.jsx      ← async Server Component rendered via `render(await StatsPage())`
  hooks/                      ← useKeyboard, useLocalStorage (fake timers for debounce)
  components/Toolbar.test.jsx
  components/AddPanel.test.jsx
  components/LayersPanel.test.jsx
  components/canvas/          ← ElementNode (local react-konva mock captures props; handlers called with fake nodes)
  components/panels/          ← TextControls, ColorBlockControls, ElementSizeControls; colorPickerMock.jsx stubs react-color
  components/modals/          ← ExportModal, ImageModal, InfoModal, ProjectsModal, ResizeConfirmModal, SizeModal
```

**Key testing patterns**:
- `react-konva` is fully mocked (Konva is incompatible with jsdom); `<Rect>` renders `null`, `<Stage>` renders a `<div>`
- IndexedDB tests use `fake-indexeddb`. Each test gets a fresh instance via `globalThis.indexedDB = new IDBFactory()` + `vi.resetModules()` in `beforeEach` — this resets the `_dbPromise` singleton in `projects.js`
- Redux is tested by calling `reducer(state, action)` directly — no React rendering needed
- ESLint config (`eslint.config.js`) has a separate rule block for `src/test/**` that declares Vitest globals (`vi`, `describe`, `it`, `expect`, `beforeEach`, etc.)
