import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
}

export function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm transition hover:border-zinc-700">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </span>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/80 text-cyan-400 border border-zinc-700/50">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-white">{value}</span>
        {trend && <span className="text-xs text-emerald-400 font-medium">{trend}</span>}
      </div>
      {subtitle && <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>}
    </div>
  );
}
