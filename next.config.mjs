/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export
  output: 'export',

  // Configure headers for SharedArrayBuffer (required for ONNX WASM threading)
  // Note: These headers must be configured on your web server for static export
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },

  // Webpack config
  webpack: (config) => {
    // Ensure .onnx files are handled as assets
    config.module.rules.push({
      test: /\.onnx$/,
      type: 'asset/resource',
    });

    return config;
  },
};

export default nextConfig;
