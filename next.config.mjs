import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["lamejs"],
  // Exclude onnxruntime-node from server-side bundling (native Node addon)
  serverExternalPackages: ["onnxruntime-node", "onnxruntime-web"],

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
