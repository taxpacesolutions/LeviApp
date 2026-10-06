import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allows reward / goal pictures up to 4 MB through Server Actions.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
