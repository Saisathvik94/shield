import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pera Wallet and Algorand SDK need these packages transpiled
  transpilePackages: ["@perawallet/connect"],

  // Empty turbopack config silences the webpack/turbopack warning
  turbopack: {},

  // Document uploads are validated at 50 MB in the IPFS server action.
  experimental: {
    serverActions: {
      bodySizeLimit: "55mb",
    },
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
