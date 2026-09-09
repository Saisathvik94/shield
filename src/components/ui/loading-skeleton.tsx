import React from "react";

export function LoadingSkeleton({ className = "h-6 w-full" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-800/80 ${className}`}
    />
  );
}

export function TableLoadingSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 p-4 border-b border-zinc-800">
          {Array.from({ length: cols }).map((_, c) => (
            <LoadingSkeleton
              key={c}
              className={`h-5 ${c === 0 ? "w-1/4" : "w-1/6"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
