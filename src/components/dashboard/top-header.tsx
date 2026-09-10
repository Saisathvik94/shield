"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

interface TopHeaderProps {
  userName?: string;
  userEmail?: string;
  activeOrgName?: string;
}

export function TopHeader({
  userName = "User",
  userEmail = "",
  activeOrgName,
}: TopHeaderProps) {
  const pathname = usePathname();

  // Generate breadcrumb items
  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];

  let currentPath = "";
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    currentPath += `/${part}`;

    if (part === "dashboard" && i === 0) {
      breadcrumbs.push({ label: "Dashboard", href: "/dashboard" });
    } else if (part === "orgs" && i === 1) {
      // Skip "orgs" in breadcrumb display
    } else if (i === 2 && pathParts[1] === "orgs") {
      // This is the orgId, show org name if available
      breadcrumbs.push({ label: activeOrgName || "Organization", href: `/dashboard/orgs/${part}` });
    } else if (part === "assets") {
      breadcrumbs.push({ label: "Assets", href: currentPath });
    } else if (part === "members") {
      breadcrumbs.push({ label: "Members", href: currentPath });
    } else if (part === "audit") {
      breadcrumbs.push({ label: "Audit Trail", href: currentPath });
    } else if (part === "settings") {
      breadcrumbs.push({ label: "Settings", href: currentPath });
    } else if (part === "identity") {
      breadcrumbs.push({ label: "My Identity", href: "/dashboard/identity" });
    } else if (part === "new") {
      breadcrumbs.push({ label: "New Organization", href: currentPath });
    } else if (part.length > 20) {
      // Likely an asset ID or UUID
      breadcrumbs.push({ label: "Passport", href: currentPath });
    }
  }

  return (
    <header className="h-14 border-b border-slate-200 dark:border-white/[0.06] bg-white/80 dark:bg-[#090a10]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 shrink-0 transition-colors">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
        >
          <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">SHIELD</span>
        </Link>

        {breadcrumbs.slice(1).map((crumb, idx) => (
          <React.Fragment key={crumb.href + idx}>
            <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600 shrink-0" />
            <Link
              href={crumb.href}
              className={cn(
                "truncate hover:text-slate-900 dark:hover:text-white transition-colors max-w-[140px] sm:max-w-[200px]",
                idx === breadcrumbs.length - 2
                  ? "text-slate-900 dark:text-slate-200 font-medium"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              {crumb.label}
            </Link>
          </React.Fragment>
        ))}
      </nav>

      {/* Right status & profile items */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Network status pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span>Algorand TestNet</span>
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* User initials chip */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/[0.08]">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-600/30 border border-blue-200 dark:border-white/[0.12] flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-200">
            {userName?.slice(0, 1)?.toUpperCase() || "U"}
          </div>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden md:inline">
            {userName?.split(" ")[0]}
          </span>
        </div>
      </div>
    </header>
  );
}
