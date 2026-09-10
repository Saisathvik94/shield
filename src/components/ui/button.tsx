"use client";

import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  icon?: React.ReactNode;
  asChild?: boolean;
}

const variants = {
  primary:
    "bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 border border-blue-500/30 active:bg-blue-700",
  secondary:
    "bg-slate-100 dark:bg-white/[0.05] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08] hover:bg-slate-200/80 dark:hover:bg-white/[0.09] hover:text-slate-900 dark:hover:text-white active:bg-slate-200 dark:active:bg-white/[0.04]",
  ghost:
    "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] active:bg-slate-200/60 dark:active:bg-white/[0.03]",
  danger:
    "bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-700 dark:hover:text-rose-200 active:bg-rose-500/30",
  success:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-200 active:bg-emerald-500/30",
  outline:
    "border border-slate-300 dark:border-white/[0.14] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white active:bg-slate-200/50 dark:active:bg-white/[0.02]",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-4 py-2 text-sm gap-2 rounded-xl",
  lg: "px-5 py-2.5 text-sm gap-2.5 rounded-xl font-semibold",
  icon: "h-9 w-9 p-0 rounded-lg justify-center",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  className,
  disabled,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-100 select-none",
        "hover:scale-[1.01] active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : icon ? (
            <span className="shrink-0">{icon}</span>
          ) : null}
          {children}
        </>
      )}
    </Comp>
  );
}
