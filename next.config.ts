import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
