"use client";

// Lazy singleton - only created in the browser
// @perawallet/connect uses browser APIs so we must never import it at module
// level in a Server Component.

import type { PeraWalletConnect } from "@perawallet/connect";

let _instance: PeraWalletConnect | null = null;

export async function getPeraWallet(): Promise<PeraWalletConnect> {
  if (_instance) return _instance;

  const { PeraWalletConnect } = await import("@perawallet/connect");
  _instance = new PeraWalletConnect({
    shouldShowSignTxnToast: true,
  });
  return _instance;
}

export function resetPeraWallet() {
  _instance = null;
}
