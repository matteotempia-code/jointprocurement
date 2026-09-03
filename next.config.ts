import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep document parsers and the native PDF.js canvas runtime as traced Node
  // dependencies. XLSX and PDF implementations are loaded only for their path.
  serverExternalPackages: ["@napi-rs/canvas", "exceljs", "pdf-parse"],
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
