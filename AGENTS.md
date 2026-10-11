# ZapFile — Project Context

## Overview

ZapFile (zapfile.xyz) is a free, browser-based file processing tool suite. All processing happens client-side — no server uploads. Deployed on Vercel via GitHub (main branch auto-deploys).

## Tech Stack

- **Framework**: Next.js 14 (App Router), TypeScript
- **Styling**: Tailwind CSS with CSS custom properties (light/dark theme), Lucide icons (`lucide-react`)
- **Key deps**: `pdf-lib`, `@cantoo/pdf-lib` (PDF encryption), `pdfjs-dist`, `onnxruntime-web` (background remover), `react-dropzone`, `react-hot-toast`, `tesseract.js` (OCR)
- **Analytics**: `@vercel/analytics`, `@vercel/speed-insights`

## Architecture

```
src/
├── app/
│   ├── layout.tsx          # Root layout (metadata, JSON-LD, ClientProviders wrapper)
│   ├── page.tsx            # Home page (client component, uses i18n)
│   ├── not-found.tsx       # Custom 404
│   ├── robots.ts           # SEO robots
│   ├── sitemap.xml/route.ts # Dynamic sitemap (all tools auto-included)
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   └── tools/
│       ├── page.tsx         # Browse all tools
│       └── [slug]/page.tsx  # 53 individual tool pages
├── components/
│   ├── Header.tsx           # Sticky header, language switcher, category dropdown
│   ├── Footer.tsx           # Multi-column footer
│   ├── ToolCard.tsx         # Tool row tile (icon, name, description, favorite star)
│   ├── ToolIcon.tsx         # Lucide icon per tool slug + category icons
│   ├── DropPad.tsx          # Home hero: universal drop + search
│   ├── ToolLayout.tsx       # Shared layout for tool pages (breadcrumb, privacy badge, FAQ)
│   ├── FileDropzone.tsx     # Drag-and-drop file input with type validation
│   ├── ClientProviders.tsx  # ErrorBoundary + ThemeContext + I18nProvider wrapper
│   ├── ErrorBoundary.tsx    # Catches render errors, shows refresh button
│   └── AdPlaceholder.tsx    # Placeholder for future ads
├── lib/
│   ├── tools.ts             # 53 tools registry (slug, name, description, category, acceptedFormats)
│   ├── tool-i18n.ts         # toolField() helper for localized tool names/descriptions
│   ├── file-handoff.ts      # Home drop pad → tool page file handoff (in-memory)
│   ├── search.ts            # searchTools(): diacritic-insensitive ranked tool search (header modal, home, /tools)
│   ├── i18n.tsx             # Full dictionaries (EN/TR/DE/FR) + context/hooks
│   ├── i18n-overrides.ts    # Partial translations for ES/PT/IT/JA
│   └── locales.ts           # Locale type, SUPPORTED_LOCALES, LOCALE_LABELS, isRtlLocale
└── app/globals.css          # Theme variables, utility classes (.glass, .gradient-text, etc.)
```

## i18n System

- Full dictionaries in `src/lib/i18n.tsx` for: EN, TR, DE, FR
- ES, PT, IT, JA: merged at load time with `mergeLocale(en, localeOverrides.*)` so every key exists; missing strings use English until translated in `i18n-overrides.ts`
- `useI18n()` hook returns `{ locale, setLocale, t }`
- Tool names/descriptions keyed as `tool.[slug].name` / `tool.[slug].desc`
- `toolField()` helper in `tool-i18n.ts` for fallback-aware tool metadata
- Locale priority: explicit user choice (localStorage) → URL ?lang= param → geo cookie → browser lang → English
- `document.documentElement.dir` is set to `ltr` for all locales (no RTL UI language enabled)

## Tools

Canonical list: `src/lib/tools.ts` — 53 tools across 4 categories (PDF, Image, Video/Audio, Utility). FFmpeg/AI/browser-fetch tools were removed in v1.4.0. v2.0 retired 13 off-brand or third-party-dependent tools and merged 5 duplicates; their URLs 301-redirect via `redirects()` in `next.config.mjs` — add a redirect whenever a tool slug is removed or renamed.

## Design System ("Voltage")

- Graphite ink + one electric-yellow signal (`volt` #FFD60A). Font: Geist (self-hosted via `next/font/local`, `--font-sans`).
- Tokens live in `globals.css` as RGB channels (`--accent-rgb: 22 24 29`) and are exposed in `tailwind.config.ts` as `rgb(var(--x-rgb) / <alpha-value>)`, so opacity modifiers like `bg-accent/10` work.
- `accent` is the action color: graphite in light theme, volt in dark. Text on an accent fill must use `text-on-accent` (never `text-white`).
- Use `volt`/`volt-ink` only for the brand signal (logo, drop pad, favorites, active markers). Don't add gradients, aurora blobs or emoji icons; tool icons come from `components/ToolIcon.tsx` (Lucide).
- Shared surfaces: `.glass` (tool workspace panel), `.card-premium`, `.dropzone`, `.segmented`. Theme-aware text: `text-t-primary/secondary/tertiary`.
- Tailwind `dark:` variants follow `[data-theme="dark"]` (`darkMode` selector), not the OS; an inline script in layout.tsx sets the theme before first paint.
- Avoid `bg-white/5`-style classes from the old dark-only UI; use `bg-bg-secondary`, `border-border`, etc.
- `metaTitle` / `metaDescription` in tools.ts must be English (canonical pages are English)

## Runtime assets (`public/vendor/`)

Workers/wasm that libraries load at runtime are copied from `node_modules` into `public/vendor/<lib>-<version>/` by `scripts/copy-vendor-assets.mjs` (runs on `predev`/`prebuild`, output git-ignored). Never load them from a third-party CDN. pdf.js goes through `src/lib/pdfjs.ts` (`openPdf`).

## Background remover (`src/lib/bg-removal/`)

- `worker.ts` (Web Worker): loads onnxruntime-web from `/vendor/ort-<NEXT_PUBLIC_ORT_VERSION>/` (WebGPU build, WASM fallback; NaN/failed GPU runs retry on WASM), downloads the model, runs inference and refinement. `client.ts` is the main-thread wrapper.
- `models.ts`: model manifest. The model (BiRefNet lite, MIT, re-exported at 768×768, fp16-stored weights, 94 MB) lives in `models/` of this repo, split into ≤19 MB parts, served from a **pinned commit** via jsDelivr (fallback raw.githubusercontent), SHA-256 verified, kept in Cache Storage. `models/` is excluded from Vercel (`.vercelignore`); provenance and export scripts in `models/README.md`. To change the model: add new parts in one commit, then point `MODEL_COMMIT`/hash/size at it.
- `refine.ts`: speck/hole cleanup, colour guided filter (full-res edges), levels, blur-fusion foreground estimation (colour decontamination). Pure functions, testable in Node.
- `document.ts` (brush erase/restore + tile undo/redo, outputs), `compose.ts` (backdrops + export), `components/bg-removal/CutoutEditor.tsx` (zoom/pan/pinch canvas).
- Don't use the published 1024 BiRefNet ONNX files: they peak at ~6.7 GB and exceed WebAssembly's 4 GB limit.

## File handoff

Dropping a file on the home page's `DropPad` lists matching tools (`toolsForFiles` in `lib/file-handoff.ts`, based on `acceptedFormats`). Choosing one stores the File in memory and `FileDropzone` picks it up on mount, so the tool opens with the file loaded. Nothing is uploaded.

## Canonical URL (`src/lib/site-url.ts`)

- `SITE_URL` defaults to `https://www.zapfile.xyz` (matches Vercel apex→www redirect).
- Override with `NEXT_PUBLIC_SITE_URL` in Vercel if the primary domain changes.
- Sitemap, robots, metadata, and feeds must use `SITE_URL` so Google Search Console can fetch `/sitemap.xml` without a cross-host redirect (submit `https://www.zapfile.xyz/sitemap.xml` in GSC).

## Important Notes

- File type validation is enforced in FileDropzone (double-checks extensions)
- SVG to PNG uses safe `<img>` blob approach (no dangerouslySetInnerHTML for user SVGs)
- Google Search Console verified (meta tag in layout.tsx)
- RTL: use logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`) instead of physical (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`)
