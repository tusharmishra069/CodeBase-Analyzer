import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained build that can run without node_modules
  output: "standalone",

  // Security headers on every response
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  // Strip source maps in production to keep bundle lean
  productionBrowserSourceMaps: false,

  // Compress responses
  compress: true,
};

export default nextConfig;
