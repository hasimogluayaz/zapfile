# ZapFile — Project Context

## Overview

ZapFile (zapfile.xyz) is a free, browser-based file processing tool suite. All processing happens client-side — no server uploads. Deployed on Vercel via GitHub (main branch auto-deploys).

## Tech Stack

- **Framework**: Next.js 14 (App Router), TypeScript
- **Styling**: Tailwind CSS with CSS custom properties (light theme, warm off-white `#f7f8fc`)
- **Key deps**: `@ffmpeg/ffmpeg` (WASM video), `@imgly/background-removal` (AI), `pdf-lib`, `react-dropzone`, `react-hot-toast`
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
│       └── [slug]/page.tsx  # 23 individual tool pages
├── components/
│   ├── Header.tsx           # Sticky header, TR/EN toggle, category dropdown
│   ├── Footer.tsx           # Multi-column footer
│   ├── ToolCard.tsx         # Tool card with colored icon backgrounds
│   ├── ToolLayout.tsx       # Shared layout for tool pages (breadcrumb, privacy badge)
│   ├── FileDropzone.tsx     # Drag-and-drop file input with type validation
│   ├── ClientProviders.tsx  # I18nProvider wrapper (client boundary)
│   └── AdPlaceholder.tsx    # Placeholder for future ads
├── lib/
│   ├── tools.ts             # 23 tools registry (slug, name, description, category, acceptedFormats)
│   └── i18n.tsx             # TR/EN translation system (React context, localStorage, browser detect)
└── app/globals.css          # Theme variables, utility classes (.glass, .gradient-text, etc.)
```

## i18n System

- Single file: `src/lib/i18n.tsx` with inline TR/EN dictionaries
- `useI18n()` hook returns `{ locale, setLocale, t }`
- Tool names/descriptions keyed as `tool.[slug].name` / `tool.[slug].desc`
- Auto-detects browser language, persists in localStorage

## Tools

Canonical list: `src/lib/tools.ts` (FFmpeg / AI background removal / browser-only HTTP fetch tools removed; lightweight audio waveform kept).

## Design Tokens (globals.css :root)

- `--bg: #f7f8fc` (warm off-white), `--surface: #ffffff`, `--accent: #6366f1` (indigo)
- Theme-aware classes: `text-t-primary`, `text-t-secondary`, `bg-bg-secondary`, `border-border`
- Legacy `text-brand-*` classes mapped in tailwind.config.ts

## Important Notes

- File type validation is enforced in FileDropzone (double-checks extensions)
- SVG to PNG uses safe `<img>` blob approach (no dangerouslySetInnerHTML for user SVGs)
- Google Search Console verified (meta tag in layout.tsx)
