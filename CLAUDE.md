# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Next.js, port 3000)
npm run build     # production build → .next/
npm run start     # serve production build
npm run lint      # ESLint
```

No test suite exists. Verification is manual in the browser.

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
- `history.past[] / future[]` — undo/redo stacks; each entry is a JSON snapshot of `elements[]`

**State is loaded from `localStorage` synchronously in `store/index.js`** via `preloadedState` in `configureStore`. The guard `typeof window !== 'undefined'` prevents server-side access. Do NOT add a separate restore hook.

Key action distinction: `updateElement` (no history) is for live drag feedback; `updateElementWithHistory` is for final commit (drag end, transform end).

### Canvas (`src/components/Canvas/`)

**BannerCanvas.jsx** mounts two Konva `Stage`s:
1. **Export stage** — exact `canvasSize` dimensions, `display:none`. `stageRef` points here. Export reads from this stage so there are no scale/overflow artifacts.
2. **Preview stage** — dimensions are `(canvasSize + OVERFLOW*2) * scale` where `OVERFLOW = 150` canvas units. Content lives in a `Group` offset by `OVERFLOW` so element coordinates stay in banner-space (0,0 = banner top-left). An inner clip `Group` restricts visual rendering to the banner rect.

The `CanvasTransformer` is placed **outside** the clip group so its handles are visible in the overflow zone.

**CanvasTransformer.jsx** — wraps Konva `Transformer`. Uses `keepRatioRef` and `isTextRef` (refs, not state) inside `boundBoxFunc` to avoid stale closures. For text: only `middle-left` / `middle-right` anchors, no rotation, keepRatio off. For images: all 8 anchors; `boundBoxFunc` enforces ratio on side handles by comparing `wDelta` vs `hDelta`. Uses `useLayoutEffect` + a `requestAnimationFrame` retry because React 19 concurrent mode can defer Konva node attachment past the synchronous commit phase.

**ElementNode.jsx** — `ImageNode` uses `onMouseDown` (not `onClick`) for reliable first-click selection. `TextNode` uses `wrap="word"`, auto-height (no fixed height), and resets `scaleX/scaleY` to 1 in `onTransform` to prevent distortion — only `width` is persisted.

**Important Konva gotcha**: never use `CSS.escape()` on element IDs when calling `layerRef.current.findOne('#id')`. UUIDs starting with digits break CSS.escape; Konva's findOne does string comparison, not CSS selector parsing.

### Font loading (`src/lib/fonts.js`)

`loadFont(family)` returns a Promise that resolves only after both the Google Fonts CSS is parsed AND `document.fonts.load()` confirms the face is available. Font changes in `TextControls` `await loadFont()` before dispatching to Redux — otherwise Konva draws with the fallback font.

### AI generation (`src/lib/aiGenerate.js`)

Uses `GoogleGenAI` SDK (`@google/genai`) with `ai.interactions.create()` and model `models/gemini-2.5-flash-image`. The API key is entered by the user and stored in `localStorage` under `gemini_api_key`.

### Image library (`src/lib/library.js`)

`LIBRARY` array of categories. To add images: copy file to `public/library/`, add `{ name, src: '/library/filename' }` to the target category. Empty categories are hidden in the UI.

### localStorage persistence

`useLocalStorageSave` (hook in `App.jsx`) saves `canvasSize + background + backgroundImage + elements` under key `banner_project_v2` on every state change. Restore happens at store creation time. Key `banner_project_v1` is a fallback for old saves.

### Export

`src/lib/export.js` calls `stageRef.current.toDataURL()` on the **hidden export stage** (exact pixel dimensions, no scale). PNG is always lossless; JPG accepts a 0–1 quality param.
