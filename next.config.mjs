import bundleAnalyzer from "@next/bundle-analyzer";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const coepHeaders = [
      { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];
    return [
      { source: "/tools/compress-video", headers: coepHeaders },
      { source: "/tools/extract-audio", headers: coepHeaders },
      { source: "/tools/video-to-gif", headers: coepHeaders },
      { source: "/tools/remove-background", headers: coepHeaders },
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

      config.resolve.alias = {
        ...config.resolve.alias,
        "onnxruntime-node$": false,
      };

      // onnxruntime-web's ESM bundles (ort.bundle.min.mjs, ort.webgpu.bundle.min.mjs)
      // use import.meta which Terser rejects in script mode.
      // Use NormalModuleReplacementPlugin to redirect imports to the CJS bundles,
      // which have no import.meta.
      const ortRoot = path.join(__dirname, "node_modules/onnxruntime-web/dist");
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^onnxruntime-web$/, (resource) => {
          resource.request = path.join(ortRoot, "ort.min.js");
        }),
        new webpack.NormalModuleReplacementPlugin(
          /^onnxruntime-web\/webgpu$/,
          (resource) => {
            resource.request = path.join(ortRoot, "ort.webgpu.min.js");
          }
        )
      );
    }

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );

    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push("onnxruntime-node", "@imgly/background-removal");
      }
    }

    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
