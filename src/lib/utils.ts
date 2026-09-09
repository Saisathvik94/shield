import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a wallet address to short form: ALGO...XXXX */
export function shortAddress(address: string, chars = 6): string {
  if (!address || address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Generate a random nonce string for wallet challenge */
export function generateNonce(length = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Human-readable relative time */
export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return "just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

/** Format asset classification for display */
export function classificationColor(
  classification: string
): { label: string; className: string } {
  switch (classification) {
    case "PUBLIC":
      return { label: "Public", className: "text-green-400 bg-green-400/10" };
    case "INTERNAL":
      return { label: "Internal", className: "text-blue-400 bg-blue-400/10" };
    case "CONFIDENTIAL":
      return {
        label: "Confidential",
        className: "text-yellow-400 bg-yellow-400/10",
      };
    case "SECRET":
      return {
        label: "Secret",
        className: "text-orange-400 bg-orange-400/10",
      };
    case "CRITICAL":
      return { label: "Critical", className: "text-red-400 bg-red-400/10" };
    default:
      return { label: classification, className: "text-gray-400 bg-gray-400/10" };
  }
}

export function roleColor(role: string): string {
  switch (role) {
    case "OWNER":
      return "text-purple-400 bg-purple-400/10";
    case "ADMIN":
      return "text-red-400 bg-red-400/10";
    case "MANAGER":
      return "text-blue-400 bg-blue-400/10";
    case "AUDITOR":
      return "text-yellow-400 bg-yellow-400/10";
    default:
      return "text-gray-400 bg-gray-400/10";
  }
}
