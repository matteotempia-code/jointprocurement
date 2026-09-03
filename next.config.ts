import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the native PDF.js canvas runtime as a traced Node dependency. The
  // parser itself is loaded lazily only for actual PDF ingestion.
  serverExternalPackages: ["@napi-rs/canvas", "pdf-parse"],
  // Video recordings can run beside an ordinary developer server. A separate
  // compiler directory avoids competing for Next's development lock.
  distDir: process.env.VIDEO_DEMO_MODE === "1" ? ".next-video-demo" : ".next",
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
