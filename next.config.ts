import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Stray empty package-lock.json files sit in the parent directory, so Next.js
    // infers the workspace root as ../ and Turbopack then watches that whole tree.
    // Pin the root here to keep filesystem watching scoped to this app.
    root: __dirname,
  },
  images: {
    // Hosts that serve listing/banner imagery. next/image throws at runtime on any
    // remote host not listed here, so keep this in sync with the upload providers.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: [
          {
            // Allow Google OAuth popup to postMessage back to this window.
            // The default "same-origin" (set by Next.js security hardening) blocks it.
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
