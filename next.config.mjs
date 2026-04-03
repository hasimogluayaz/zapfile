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

      // Completely exclude @imgly/background-removal and onnxruntime from bundling
      // They will be loaded via CDN at runtime instead
      config.externals = [
        ...(Array.isArray(config.externals)
          ? config.externals
          : config.externals
            ? [config.externals]
            : []),
        {
          "@imgly/background-removal": "commonjs @imgly/background-removal",
          "onnxruntime-web": "commonjs onnxruntime-web",
          "onnxruntime-node": "commonjs onnxruntime-node",
        },
      ];
    }

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      }),
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

export default nextConfig;
