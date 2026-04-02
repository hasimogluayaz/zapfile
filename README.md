# ZapFile ⚡

**The file tools you actually want to use.**

Fast, free, and private file tools that run entirely in your browser. No uploads, no limits, no subscriptions.

🌐 **Live:** [zapfile.xyz](https://zapfile.xyz)

---

## Features

- **22+ Tools** — PDF, Image, Video, Audio, and Utility tools
- **100% Client-Side** — All processing happens in your browser
- **No Uploads** — Your files never leave your device
- **No Account Required** — Start using tools instantly
- **Mobile Friendly** — Responsive design, works on any device

### Tool Categories

| Category | Tools |
|----------|-------|
| 📄 PDF | Compress, Merge, Split, PDF to Images, Rotate, Protect |
| 🖼️ Image | Compress, Resize, Convert, Crop |
| 🎬 Video/Audio | Compress Video, Extract Audio, Video to GIF |
| ⚙️ Utility | QR Generator, Remove Background, SVG to PNG, Base64 Encoder, Color Picker, JSON Formatter, Hash Generator, Word Counter |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **PDF:** pdf-lib
- **Images:** browser-image-compression
- **Video/Audio:** @ffmpeg/ffmpeg (WebAssembly)
- **Background Removal:** @imgly/background-removal
- **QR Codes:** qrcode
- **File Handling:** react-dropzone, jszip, file-saver

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd zapfile

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
npm run start
```

---

## Deploy to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/zapfile.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your `zapfile` repository
4. Vercel will auto-detect Next.js — just click **Deploy**
5. Wait for the build to complete

### Step 3: Connect zapfile.xyz Domain

1. In your Vercel project, go to **Settings → Domains**
2. Add `zapfile.xyz`
3. Vercel will give you DNS records to add. Go to your domain registrar and:

   **Option A — Nameservers (Recommended):**
   - Change nameservers to Vercel's:
     - `ns1.vercel-dns.com`
     - `ns2.vercel-dns.com`

   **Option B — DNS Records:**
   - Add an `A` record: `@` → `76.76.21.21`
   - Add a `CNAME` record: `www` → `cname.vercel-dns.com`

4. Wait for DNS propagation (usually 5-30 minutes)
5. Vercel will automatically provision an SSL certificate

### Step 4: Google AdSense (Optional)

1. Sign up at [adsense.google.com](https://adsense.google.com)
2. Add your site and get the AdSense script tag
3. Add the script to `src/app/layout.tsx` in the `<head>` section
4. Replace `data-ad-slot` placeholders in `AdPlaceholder.tsx` with your ad unit IDs

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Currently no environment variables are required — everything runs client-side.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with SEO, fonts, schema
│   ├── page.tsx            # Homepage
│   ├── globals.css         # Global styles, animations
│   ├── sitemap.ts          # Auto-generated sitemap
│   ├── robots.ts           # Robots.txt config
│   ├── privacy/            # Privacy policy
│   ├── terms/              # Terms of service
│   └── tools/
│       ├── page.tsx        # All tools listing
│       ├── layout.tsx      # Tools layout
│       └── [tool-name]/    # Individual tool pages
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── ToolCard.tsx
│   ├── ToolLayout.tsx
│   ├── FileDropzone.tsx
│   ├── ProcessButton.tsx
│   ├── DownloadButton.tsx
│   ├── ProgressBar.tsx
│   ├── FileSizeCompare.tsx
│   └── AdPlaceholder.tsx
└── lib/
    ├── tools.ts            # Tool definitions & metadata
    └── utils.ts            # Utility functions
```

---

## License

All rights reserved. © 2025 ZapFile.
