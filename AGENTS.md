# ZapFile — Project Context

## Overview

ZapFile (zapfile.xyz) is a free, browser-based file processing tool suite. All processing happens client-side — no server uploads. Deployed on Vercel via GitHub (main branch auto-deploys).

## Tech Stack

- **Framework**: Next.js 14 (App Router), TypeScript
- **Styling**: Tailwind CSS with CSS custom properties (light/dark theme)
- **Key deps**: `pdf-lib`, `react-dropzone`, `react-hot-toast`, `tesseract.js` (OCR)
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
│       └── [slug]/page.tsx  # 50 individual tool pages
├── components/
│   ├── Header.tsx           # Sticky header, language switcher, category dropdown
│   ├── Footer.tsx           # Multi-column footer
│   ├── ToolCard.tsx         # Vertical tool card with colored icon backgrounds
│   ├── ToolLayout.tsx       # Shared layout for tool pages (breadcrumb, privacy badge, FAQ)
│   ├── FileDropzone.tsx     # Drag-and-drop file input with type validation
│   ├── ClientProviders.tsx  # ErrorBoundary + ThemeContext + I18nProvider wrapper
│   ├── ErrorBoundary.tsx    # Catches render errors, shows refresh button
│   └── AdPlaceholder.tsx    # Placeholder for future ads
├── lib/
│   ├── tools.ts             # 50 tools registry (slug, name, description, category, acceptedFormats)
│   ├── tool-i18n.ts         # toolField() helper for localized tool names/descriptions
│   ├── i18n.tsx             # Full dictionaries (EN/TR/DE/FR) + context/hooks
│   ├── i18n-overrides.ts    # Partial translations for ES/PT/IT/JA/AR
│   └── locales.ts           # Locale type, SUPPORTED_LOCALES, LOCALE_LABELS, isRtlLocale
└── app/globals.css          # Theme variables, utility classes (.glass, .gradient-text, etc.)
```

## i18n System

- Full dictionaries in `src/lib/i18n.tsx` for: EN, TR, DE, FR
- Partial overrides in `src/lib/i18n-overrides.ts` for: ES, PT, IT, JA, AR (falls back to English)
- `useI18n()` hook returns `{ locale, setLocale, t }`
- Tool names/descriptions keyed as `tool.[slug].name` / `tool.[slug].desc`
- `toolField()` helper in `tool-i18n.ts` for fallback-aware tool metadata
- Locale priority: explicit user choice (localStorage) → URL ?lang= param → geo cookie → browser lang → English
- RTL support for Arabic (`dir="rtl"` on `<html>`)

## Tools

Canonical list: `src/lib/tools.ts` — 50 tools across 4 categories (PDF, Image, Video/Audio, Utility). FFmpeg/AI/browser-fetch tools were removed in v1.4.0; lightweight audio waveform kept.

## Design Tokens (globals.css :root)

- `--bg: #f7f8fc` (warm off-white), `--surface: #ffffff`, `--accent: #6366f1` (indigo)
- Dark theme via `[data-theme="dark"]` selector
- Theme-aware classes: `text-t-primary`, `text-t-secondary`, `bg-bg-secondary`, `border-border`

## Important Notes

- File type validation is enforced in FileDropzone (double-checks extensions)
- SVG to PNG uses safe `<img>` blob approach (no dangerouslySetInnerHTML for user SVGs)
- Google Search Console verified (meta tag in layout.tsx)
- RTL: use logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`) instead of physical (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`)
