import React from "react";
import { cn, statusColor, classificationColor } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string;
  classification?: string;
  label?: string;
  variant?: "status" | "classification" | "custom";
  customClassName?: string;
  dotColor?: string;
  size?: "sm" | "md";
  showDot?: boolean;
}

export function StatusBadge({
  status,
  classification,
  label,
  variant = "status",
  customClassName,
  dotColor,
  size = "sm",
  showDot = true,
}: StatusBadgeProps) {
  let displayLabel = label;
  let styling = "text-slate-400 bg-slate-500/10 border-slate-500/20";
  let dotBg = dotColor || "bg-slate-400";

  if (classification || variant === "classification") {
    const info = classificationColor(classification || "");
    displayLabel = label || info.label;
    styling = info.className;
    dotBg = dotColor || info.dotColor;
  } else if (status || variant === "status") {
    const info = statusColor(status || "");
    displayLabel = label || info.label;
    styling = info.className;
    dotBg = dotColor || info.dotColor;
  }

  if (customClassName) {
    styling = customClassName;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs",
        styling
      )}
    >
      {showDot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            dotBg
          )}
        />
      )}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
}
