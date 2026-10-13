import fs from "node:fs";
import bundleAnalyzer from "@next/bundle-analyzer";

// The background remover loads onnxruntime-web from /vendor/ort-<version>/
// (copied by scripts/copy-vendor-assets.mjs), never through webpack.
const ortVersion = JSON.parse(
  fs.readFileSync(new URL("./node_modules/onnxruntime-web/package.json", import.meta.url), "utf8"),
).version;

// The meme font (Anton, OFL) is served from /vendor/anton-<version>/.
const antonVersion = JSON.parse(
  fs.readFileSync(new URL("./node_modules/@fontsource/anton/package.json", import.meta.url), "utf8"),
).version;

// Word/Excel/PowerPoint → PDF runs LibreOffice (WebAssembly) from /vendor/libreoffice-<version>/.
const libreofficeVersion = JSON.parse(
  fs.readFileSync(new URL("./node_modules/@matbee/libreoffice-converter/package.json", import.meta.url), "utf8"),
).version;

// LibreOffice uses threads (SharedArrayBuffer), which needs a cross-origin isolated page and worker.
const ISOLATION_HEADERS = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];
const OFFICE_TOOL_PATHS = ["/tools/word-to-pdf", "/tools/excel-to-pdf", "/tools/powerpoint-to-pdf"];

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_ORT_VERSION: ortVersion,
    NEXT_PUBLIC_ANTON_VERSION: antonVersion,
    NEXT_PUBLIC_LIBREOFFICE_VERSION: libreofficeVersion,
  },
  transpilePackages: ["lamejs"],
  // Exclude onnxruntime-node from server-side bundling (native Node addon)
  serverExternalPackages: ["onnxruntime-node", "onnxruntime-web"],

  async headers() {
    return [
      ...OFFICE_TOOL_PATHS.map((source) => ({ source, headers: ISOLATION_HEADERS })),
      {
        source: "/vendor/libreoffice-:version/:file*",
        headers: [...ISOLATION_HEADERS, { key: "Cross-Origin-Resource-Policy", value: "same-origin" }],
      },
    ];
  },

  // Retired and merged tools (v2.0 cleanup): keep old URLs working for users and search engines.
  async redirects() {
    return [
      { source: "/tools/ip-address", destination: "/tools", permanent: true },
      { source: "/tools/internet-speed", destination: "/tools", permanent: true },
      { source: "/tools/fake-identity", destination: "/tools", permanent: true },
      { source: "/tools/html-to-pdf", destination: "/tools", permanent: true },
      { source: "/tools/typing-speed-test", destination: "/tools", permanent: true },
      { source: "/tools/pomodoro-timer", destination: "/tools", permanent: true },
      { source: "/tools/stopwatch", destination: "/tools", permanent: true },
      { source: "/tools/world-clock", destination: "/tools", permanent: true },
      { source: "/tools/screen-resolution", destination: "/tools", permanent: true },
      { source: "/tools/emoji-picker", destination: "/tools", permanent: true },
      { source: "/tools/ascii-art", destination: "/tools", permanent: true },
      { source: "/tools/audio-waveform", destination: "/tools", permanent: true },
      { source: "/tools/image-compare", destination: "/tools/compress-image", permanent: true },
      { source: "/tools/character-counter", destination: "/tools/word-counter", permanent: true },
      { source: "/tools/csv-viewer", destination: "/tools/csv-json", permanent: true },
      { source: "/tools/random-color", destination: "/tools/color-picker", permanent: true },
      { source: "/tools/password-strength", destination: "/tools/password-generator", permanent: true },
      { source: "/tools/image-pipeline", destination: "/tools/compress-image", permanent: true },
      { source: "/blog/html-to-pdf-from-url-or-snippet", destination: "/blog", permanent: true },
      { source: "/blog/typing-speed-test-wpm-explained", destination: "/blog", permanent: true },
      { source: "/blog/audio-waveform-for-podcasts", destination: "/blog", permanent: true },
      { source: "/blog/ascii-art-from-photos", destination: "/blog", permanent: true },
    ];
  },

  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        module: false,
        perf_hooks: false,
        os: false,
        net: false,
        tls: false,
        https: false,
        http: false,
      };
    }

    // Treat .node native addons as empty modules
    config.module.rules.push({
      test: /\.node$/,
      use: "null-loader",
    });

    // Null-load onnxruntime .mjs worker files so they are never copied as
    // static assets and therefore never passed through Terser.
    config.module.rules.push({
      test: /ort[\.\-].+\.mjs$/,
      use: "null-loader",
    });

    // Ignore onnxruntime-node on the client side entirely
    if (!isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: /^onnxruntime-node$/ })
      );
    }

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );

    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
