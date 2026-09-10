"use client";

import React, { useState } from "react";
import { ChevronDown, Code2, Copy, Check, ExternalLink } from "lucide-react";
import { cn, copyWithToast } from "@/lib/utils";

interface DetailItem {
  label: string;
  value?: string | number | null;
  copyable?: boolean;
  isCode?: boolean;
  href?: string;
}

interface TechnicalDetailsProps {
  title?: string;
  description?: string;
  items: DetailItem[];
  defaultOpen?: boolean;
  className?: string;
}

export function TechnicalDetails({
  title = "Technical Cryptographic Proof",
  description = "Underlying immutable blockchain & IPFS records",
  items,
  defaultOpen = false,
  className,
}: TechnicalDetailsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    copyWithToast(text, label);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const validItems = items.filter(
    (item) => item.value !== undefined && item.value !== null && item.value !== ""
  );

  if (validItems.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#0c0d14] overflow-hidden transition-colors",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100/60 dark:hover:bg-white/[0.02] transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors block">
              {title}
            </span>
            {description && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{description}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
            {open ? "Hide technical data" : "View technical data"}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200",
              open && "rotate-180 text-blue-600 dark:text-blue-400"
            )}
          />
        </div>
      </button>

      {open && (
        <div className="p-4 pt-0 border-t border-slate-200 dark:border-white/[0.04] space-y-2.5 animate-in fade-in-0 duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
            {validItems.map((item) => (
              <div
                key={item.label}
                className="bg-white dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.04] rounded-xl p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {item.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.copyable && item.value && (
                      <button
                        type="button"
                        onClick={() => handleCopy(String(item.value), item.label)}
                        className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-0.5 rounded"
                        title={`Copy ${item.label}`}
                      >
                        {copiedKey === item.label ? (
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    {item.href && (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="font-mono text-xs text-slate-900 dark:text-slate-200 break-all">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
