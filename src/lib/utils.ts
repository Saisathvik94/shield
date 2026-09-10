import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Format file sizes in human-readable bytes */
export function formatBytes(bytes?: number | null, decimals = 1): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/** Helper to copy text with an accessible sonner toast */
export function copyWithToast(text: string, label = "Item") {
  if (!navigator?.clipboard) return;
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied to clipboard`, {
    description: text.length > 36 ? `${text.slice(0, 32)}...` : text,
    duration: 2000,
  });
}

/** Format asset classification for display following UI design system */
export function classificationColor(
  classification: string
): { label: string; className: string; dotColor: string } {
  switch (classification?.toUpperCase()) {
    case "PUBLIC":
      return {
        label: "Public",
        className: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20",
        dotColor: "bg-emerald-500 dark:bg-emerald-400",
      };
    case "INTERNAL":
      return {
        label: "Internal",
        className: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20",
        dotColor: "bg-blue-500 dark:bg-blue-400",
      };
    case "CONFIDENTIAL":
      return {
        label: "Confidential",
        className: "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20",
        dotColor: "bg-amber-500 dark:bg-amber-400",
      };
    case "SECRET":
      return {
        label: "Secret",
        className: "text-orange-800 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-500/10 dark:border-orange-500/20",
        dotColor: "bg-orange-500 dark:bg-orange-400",
      };
    case "CRITICAL":
      return {
        label: "Critical",
        className: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20",
        dotColor: "bg-rose-500 dark:bg-rose-400",
      };
    default:
      return {
        label: classification || "Unclassified",
        className: "text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/20",
        dotColor: "bg-slate-400",
      };
  }
}

/** Format role styling for organizational members */
export function roleColor(role: string): string {
  switch (role?.toUpperCase()) {
    case "OWNER":
      return "text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-500/25";
    case "ADMIN":
      return "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/25";
    case "MANAGER":
      return "text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-300 dark:bg-cyan-500/10 dark:border-cyan-500/25";
    case "AUDITOR":
      return "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/25";
    case "USER":
    case "MEMBER":
      return "text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-500/10 dark:border-slate-500/25";
    default:
      return "text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-white/[0.05] dark:border-white/[0.08]";
  }
}

/** Status styling combining text, background, and dot colors */
export function statusColor(status: string): { label: string; className: string; dotColor: string } {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
    case "VERIFIED":
    case "CONFIRMED":
    case "APPROVED":
      return {
        label: status.replace(/_/g, " "),
        className: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20",
        dotColor: "bg-emerald-500 dark:bg-emerald-400",
      };
    case "PENDING":
    case "TRANSFER_REQUESTED":
    case "REVIEW_REQUIRED":
    case "IN_PROGRESS":
      return {
        label: status.replace(/_/g, " "),
        className: "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20",
        dotColor: "bg-amber-500 dark:bg-amber-400",
      };
    case "REVOKED":
    case "RETIRED":
    case "BLOCKED":
    case "DENIED":
    case "REJECTED":
    case "TAMPERED":
      return {
        label: status.replace(/_/g, " "),
        className: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20",
        dotColor: "bg-rose-500 dark:bg-rose-400",
      };
    case "REGISTERED":
    case "ASSIGNED":
    case "TRANSFERRED":
      return {
        label: status.replace(/_/g, " "),
        className: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20",
        dotColor: "bg-blue-500 dark:bg-blue-400",
      };
    default:
      return {
        label: status?.replace(/_/g, " ") || "Unknown",
        className: "text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/20",
        dotColor: "bg-slate-400",
      };
  }
}
