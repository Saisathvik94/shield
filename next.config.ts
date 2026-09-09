import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pera Wallet and Algorand SDK need these packages transpiled
  transpilePackages: ["@perawallet/connect"],

  // Empty turbopack config silences the webpack/turbopack warning
  turbopack: {},

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
