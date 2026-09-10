import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: IconOrElement,
  title,
  description,
  actionText,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.01]",
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
        {React.isValidElement(IconOrElement) ? (
          IconOrElement
        ) : typeof IconOrElement === "function" ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <IconOrElement className="w-6 h-6" />
        ) : (
          <span className="text-xl">🛡️</span>
        )}
      </div>

      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-5">
        {description}
      </p>

      {actionText && (
        <>
          {actionHref ? (
            <Button variant="primary" size="sm" asChild>
              <a href={actionHref}>{actionText}</a>
            </Button>
          ) : onAction ? (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionText}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
