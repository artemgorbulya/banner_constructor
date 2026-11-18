# Banner Constructor

A browser-based banner editor built with Next.js and Konva. Create, edit, and export banners with images and text.

![Banner Constructor](public/favicon.svg)

## Features

- **Canvas editor** — drag, resize, rotate, and layer images and text on a Konva canvas
- **Image library** — built-in clipart organized by category (banners, bubbles, devices)
- **Text controls** — font family (Google Fonts), size, color, bold, italic, align, line height
- **Size presets** — Billboard (1536×256), Web Banner (880×408), or custom dimensions
- **Snap-to-grid** — optional 10 px grid snapping for precise alignment
- **Aspect ratio lock** — global toggle that constrains all resize handles
- **Undo / Redo** — full history stack (Ctrl+Z / Ctrl+Shift+Z)
- **Export** — PNG (lossless) or JPG with adjustable quality; file size preview before download
- **Usage statistics** — every export is logged to Vercel Blob; `/stats` shows totals, sizes, formats, the last 14 days and recent banners with previews
- **Auto-save** — project state persists in `localStorage` across sessions

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 |
| Canvas | Konva 10 + react-konva |
| State | Redux Toolkit |
| Icons | lucide-react |
| Color picker | react-color |

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build      # production build
npm run start      # serve production build
npm run lint       # ESLint
```

Node 18+ required. No environment variables needed for the base editor.

## Usage Statistics

Each banner download is recorded (size/preset, format, element counts, texts, small preview) and shown at **`/stats`**.

Setup (once): Vercel → project → **Storage → Create → Blob** (choose *Private*) → connect it to the project. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically. For local testing run `vercel env pull .env.local`. Without the token, exports work as usual and `/stats` shows a setup hint.

> `/stats` has no password — anyone with the link can see it. Banner texts are included.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` or `Ctrl+Y` | Redo |
| `Delete` or `Backspace` | Delete selected element |

## Project Structure

```
src/
├── app/
│   ├── layout.jsx          # HTML shell + metadata
│   ├── page.jsx            # Entry: renders ClientPage
│   ├── ClientPage.jsx      # 'use client' boundary, dynamic import of App
│   ├── stats/page.jsx      # /stats — usage statistics page
│   └── api/
│       ├── proxy-image/    # image proxy for loading by URL
│       └── stats/          # POST: store one export event in Vercel Blob
├── App.jsx                 # Redux Provider + editor layout
├── components/
│   ├── Canvas/
│   │   ├── BannerCanvas.jsx    # Dual Konva stage (preview + hidden export)
│   │   ├── CanvasTransformer.jsx
│   │   └── ElementNode.jsx     # ImageNode / TextNode renderers
│   ├── Toolbar/Toolbar.jsx
│   ├── panels/
│   │   ├── LayersPanel.jsx     # Layer list with visibility / order controls
│   │   ├── AddPanel.jsx        # Image upload + library browser
│   │   └── TextControls.jsx    # Font, size, style controls
│   └── modals/                 # SizeModal, ExportModal, ImageModal, InfoModal
├── store/
│   ├── index.js            # configureStore with localStorage preload
│   └── editorSlice.js      # All state: canvas, elements, history
├── lib/
│   ├── export.js           # toDataURL → file download
│   ├── stats.js            # usage statistics: event building, validation, summaries
│   ├── fonts.js            # Google Fonts loader (awaits document.fonts.load)
│   └── library.js          # Built-in image library definitions
└── hooks/
    ├── useKeyboard.js      # Undo/redo/delete key bindings
    ├── useLocalStorage.js  # Auto-save on state change
    └── useSnapGrid.js      # Snap-to-grid logic
```

## Adding Images to the Library

1. Copy the file to `public/library/<category>/`
2. Add an entry to the target category in `src/lib/library.js`:
   ```js
   { name: 'My Image', src: '/library/category/filename.png' }
   ```
Empty categories are hidden automatically.

## License

MIT
