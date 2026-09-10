"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Building2,
  Users,
  Package,
  ScrollText,
  Fingerprint,
  Award,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Plus,
  LogOut,
  Settings,
  Wallet,
  Copy,
  Check,
} from "lucide-react";
import { cn, shortAddress, copyWithToast } from "@/lib/utils";
import { logout } from "@/lib/actions/auth-actions";
import { useWallet } from "@/lib/wallet/wallet-context";

interface OrgMenuItem {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface SidebarProps {
  orgs: OrgMenuItem[];
  activeOrgId?: string;
  userName: string;
  userEmail: string;
}

export function Sidebar({ orgs, activeOrgId, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const { address, disconnect } = useWallet();
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);

  // Determine active organization based on activeOrgId or route pathname
  let currentOrgId = activeOrgId;
  if (!currentOrgId && pathname.includes("/dashboard/orgs/")) {
    const segments = pathname.split("/");
    const orgIndex = segments.indexOf("orgs");
    if (orgIndex !== -1 && segments[orgIndex + 1]) {
      currentOrgId = segments[orgIndex + 1];
    }
  }

  const activeOrg = orgs.find((o) => o.id === currentOrgId) ?? orgs[0];

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    await disconnect();
    await logout();
  }

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address) return;
    copyWithToast(address, "Algorand Wallet Address");
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  return (
    <aside className="flex flex-col h-full w-[260px] shrink-0 bg-slate-50 dark:bg-[#090a10] border-r border-slate-200 dark:border-white/[0.07] transition-colors">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-slate-200 dark:border-white/[0.06] shrink-0 bg-white/50 dark:bg-white/[0.01]">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 shadow-sm shadow-blue-500/20">
          <Shield className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
        <div>
          <span className="font-bold text-slate-900 dark:text-white tracking-tight text-sm block leading-none">
            SHIELD
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
            Enterprise Trust
          </span>
        </div>
        <span className="ml-auto text-[10px] text-blue-600 dark:text-blue-300/80 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-medium">
          v1.0
        </span>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Organization Switcher */}
        <div className="p-3 border-b border-slate-200 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => setOrgPickerOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.1] transition-all group shadow-xs"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-600/30 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-blue-700 dark:text-blue-200">
              {activeOrg?.name?.slice(0, 1)?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {activeOrg?.name ?? "Select organization"}
              </p>
              {activeOrg && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                  {activeOrg.role}
                </p>
              )}
            </div>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-transform shrink-0",
                orgPickerOpen && "rotate-180"
              )}
            />
          </button>

          {/* Org Picker Dropdown */}
          {orgPickerOpen && (
            <div className="mt-2 flex flex-col gap-1 p-1 bg-white dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-xl animate-in fade-in-0 zoom-in-95 duration-100 z-30">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Switch Organization
              </div>
              {orgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/dashboard/orgs/${org.id}`}
                  onClick={() => setOrgPickerOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                    org.id === activeOrg?.id
                      ? "bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-200 font-medium border border-blue-200 dark:border-blue-500/20"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <div className="w-5 h-5 rounded bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-[10px] font-bold shrink-0 text-slate-700 dark:text-slate-300">
                    {org.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="truncate flex-1">{org.name}</span>
                  {org.id === activeOrg?.id && (
                    <ChevronRight className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                  )}
                </Link>
              ))}

              <Link
                href="/dashboard/orgs/new"
                onClick={() => setOrgPickerOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors mt-1 border-t border-slate-100 dark:border-white/[0.06] pt-2 font-medium"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Create new organization</span>
              </Link>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-4">
          {/* Core Overview */}
          <div className="space-y-0.5">
            <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Overview
            </div>
            <SidebarNavItem
              href="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              active={isActive("/dashboard", true)}
            />
          </div>

          {/* Organization Workspace */}
          {activeOrg ? (
            <div className="space-y-0.5">
              <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Workspace
              </div>
              <SidebarNavItem
                href={`/dashboard/orgs/${activeOrg.id}`}
                icon={Building2}
                label="Organization Home"
                active={isActive(`/dashboard/orgs/${activeOrg.id}`, true)}
              />
              <SidebarNavItem
                href={`/dashboard/orgs/${activeOrg.id}/members`}
                icon={Users}
                label="Members & Hierarchy"
                active={isActive(`/dashboard/orgs/${activeOrg.id}/members`)}
              />
              <SidebarNavItem
                href={`/dashboard/orgs/${activeOrg.id}/assets`}
                icon={Package}
                label="Digital Assets"
                active={isActive(`/dashboard/orgs/${activeOrg.id}/assets`)}
              />
              <SidebarNavItem
                href={`/dashboard/orgs/${activeOrg.id}/audit`}
                icon={ScrollText}
                label="Immutable Audit Trail"
                active={isActive(`/dashboard/orgs/${activeOrg.id}/audit`)}
              />
              <SidebarNavItem
                href={`/dashboard/orgs/${activeOrg.id}/settings`}
                icon={Settings}
                label="Settings & Structure"
                active={isActive(`/dashboard/orgs/${activeOrg.id}/settings`)}
              />
            </div>
          ) : (
            <div className="p-3 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-xl text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">No organization selected.</p>
              <Link
                href="/dashboard/orgs/new"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-500 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Org
              </Link>
            </div>
          )}

          {/* Personal Identity & Credentials */}
          <div className="space-y-0.5">
            <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Trust & Governance
            </div>
            <SidebarNavItem
              href="/dashboard/approvals"
              icon={ShieldCheck}
              label="Multi-Party Approvals"
              active={isActive("/dashboard/approvals")}
            />
            <SidebarNavItem
              href="/dashboard/credentials"
              icon={Award}
              label="Verifiable Credentials"
              active={isActive("/dashboard/credentials")}
            />
            <SidebarNavItem
              href="/dashboard/identity"
              icon={Fingerprint}
              label="My Identity & Keys"
              active={isActive("/dashboard/identity")}
            />
          </div>
        </nav>

        {/* Footer Widget: Connected Wallet & User Logout */}
        <div className="border-t border-slate-200 dark:border-white/[0.06] p-3 space-y-2 shrink-0 bg-white/50 dark:bg-white/[0.01]">
          {address ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate">
                  {shortAddress(address, 5)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyAddress}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                title="Copy full Algorand address"
              >
                {copiedAddr ? (
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          ) : null}

          {/* User profile & Logout */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-600/30 border border-blue-200 dark:border-white/[0.12] flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-200 shrink-0">
              {userName?.slice(0, 1)?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              title="Sign out of SHIELD"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarNavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all group select-none",
        active
          ? "bg-blue-50 dark:bg-blue-600/15 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-500/25 shadow-xs"
          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]"
      )}
    >
      <Icon
        className={cn(
          "w-4 h-4 shrink-0 transition-colors",
          active ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200"
        )}
      />
      <span className="truncate">{label}</span>
      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 ml-auto shrink-0 shadow-xs" />
      )}
    </Link>
  );
}
