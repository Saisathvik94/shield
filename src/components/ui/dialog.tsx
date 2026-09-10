"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

export function DialogContent({
  children,
  className,
  title,
  description,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
          "w-full max-w-lg bg-white dark:bg-[#13131c] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl p-0 overflow-hidden",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          "duration-200",
          className
        )}
      >
        {(title || description) && (
          <div className="px-6 py-5 border-b border-slate-100 dark:border-white/[0.06]">
            {title && (
              <RadixDialog.Title className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </RadixDialog.Title>
            )}
            {description && (
              <RadixDialog.Description className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {description}
              </RadixDialog.Description>
            )}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        <RadixDialog.Close className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white transition-colors rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.06]">
          <X className="w-4 h-4" />
          <span className="sr-only">Close</span>
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
