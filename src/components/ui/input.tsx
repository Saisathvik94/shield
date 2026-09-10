import { cn } from "@/lib/utils";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-xl bg-slate-50 dark:bg-white/[0.04] border px-3.5 py-2.5 text-xs text-slate-900 dark:text-white",
          "placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors",
          "focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20",
          error
            ? "border-rose-500/50"
            : "border-slate-200 dark:border-white/[0.08]",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={3}
        className={cn(
          "w-full rounded-xl bg-slate-50 dark:bg-white/[0.04] border px-3.5 py-2.5 text-xs text-slate-900 dark:text-white resize-none",
          "placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors",
          "focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20",
          error
            ? "border-rose-500/50"
            : "border-slate-200 dark:border-white/[0.08]",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>}
    </div>
  );
}
