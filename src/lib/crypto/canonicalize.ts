import { createHash } from "crypto";

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS)
 * Deterministically canonicalizes a JSON data structure by:
 * 1. Sorting object keys lexicographically by UTF-16 code units.
 * 2. Removing all unnecessary whitespace.
 * 3. Recursively canonicalizing nested objects and arrays.
 * 4. Preserving primitive types (boolean, number, string, null).
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalizeJson(item));
    return `[${items.join(",")}]`;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const entries = sortedKeys
      .filter((key) => obj[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(obj[key])}`);
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

/**
 * Computes SHA-256 hash of canonicalized JSON.
 * Returns raw 64-character lowercase hex digest.
 */
export function computeCanonicalSha256(value: unknown): string {
  const canonicalString = canonicalizeJson(value);
  return createHash("sha256").update(canonicalString, "utf8").digest("hex");
}

/**
 * Computes SHA-256 hash of a binary buffer or string.
 */
export function computeSha256(data: Buffer | Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}
