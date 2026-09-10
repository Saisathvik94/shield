"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { copyWithToast, cn } from "@/lib/utils";

export function CopyButton({
  text,
  value,
  label = "Value",
  className,
}: {
  text?: string;
  value?: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copyText = text ?? value ?? "";

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      copyWithToast(copyText, label);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "shrink-0 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all select-none",
        className
      )}
      title={`Copy ${label} to clipboard`}
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-75 duration-100" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
