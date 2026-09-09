import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

// In-memory nonce store - fine for single-instance demo
// In production use Redis with a 5-minute TTL
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

// Clean up expired nonces every request
function cleanNonces() {
  const now = Date.now();
  for (const [addr, entry] of nonceStore.entries()) {
    if (entry.expiresAt < now) nonceStore.delete(addr);
  }
}

/** GET /api/auth/nonce?address=ALGO... - returns a one-time challenge */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address || address.length < 10) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  cleanNonces();

  const nonce = `SHIELD-AUTH:${randomBytes(16).toString("hex")}`;
  nonceStore.set(address, {
    nonce,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });

  return NextResponse.json({ nonce });
}

/** Verify a signature against the stored nonce for an address */
export function verifyNonce(address: string, signature: Uint8Array): boolean {
  const entry = nonceStore.get(address);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) { nonceStore.delete(address); return false; }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const algosdk = require("algosdk");
    const msgBytes = new TextEncoder().encode(entry.nonce);
    const valid = algosdk.verifyBytes(msgBytes, signature, address);
    if (valid) nonceStore.delete(address); // one-time use
    return valid;
  } catch {
    return false;
  }
}

/** Expose nonce store for auth.ts to call from the same process */
export function getNonce(address: string): string | null {
  const entry = nonceStore.get(address);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.nonce;
}
