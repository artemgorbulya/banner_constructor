# Banner Constructor

A browser-based banner editor built with Next.js and Konva. Create, edit, and export banners with images, text, and AI-generated backgrounds — no backend required.

![Banner Constructor](public/favicon.svg)

## Features

- **Canvas editor** — drag, resize, rotate, and layer images and text on a Konva canvas
- **AI background generation** — describe a background in text, generate it via Google Gemini, apply with one click
- **Image library** — built-in clipart organized by category (banners, bubbles, devices)
- **Text controls** — font family (Google Fonts), size, color, bold, italic, align, line height
- **Size presets** — Billboard (1536×256), Web Banner (880×408), or custom dimensions
- **Snap-to-grid** — optional 10 px grid snapping for precise alignment
- **Aspect ratio lock** — global toggle that constrains all resize handles
- **Undo / Redo** — full history stack (Ctrl+Z / Ctrl+Shift+Z)
- **Export** — PNG (lossless) or JPG with adjustable quality; file size preview before download
- **Auto-save** — project state persists in `localStorage` across sessions

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 |
| Canvas | Konva 10 + react-konva |
| State | Redux Toolkit |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
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

## AI Background Generation

The AI feature uses Google Gemini and requires a free API key from [Google AI Studio](https://aistudio.google.com/apikey).

1. Click **AI Фон** in the toolbar
2. Paste your API key (stored only in your browser's `localStorage`)
3. Describe the background (e.g. "abstract blue gradient with waves, minimalist")
4. Generate → preview → apply

> The free tier may hit quota limits. Enable billing at [ai.google.dev](https://ai.google.dev) if you hit the limit.

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
│   └── api/generate/       # API route for AI generation
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
│   └── modals/                 # SizeModal, ExportModal, AiGenerateModal, InfoModal
├── store/
│   ├── index.js            # configureStore with localStorage preload
│   └── editorSlice.js      # All state: canvas, elements, history
├── lib/
│   ├── aiGenerate.js       # Gemini API call
│   ├── export.js           # toDataURL → file download
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
