"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ShieldIcon,
  LayoutDashboard,
  Building2,
  Users,
  Package,
  ScrollText,
  Fingerprint,
  ChevronDown,
  ChevronRight,
  Plus,
  LogOut,
  Settings,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/utils";
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

const orgNavItems = (orgId: string) => [
  {
    label: "Overview",
    href: `/dashboard/orgs/${orgId}`,
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Members",
    href: `/dashboard/orgs/${orgId}/members`,
    icon: Users,
  },
  {
    label: "Assets",
    href: `/dashboard/orgs/${orgId}/assets`,
    icon: Package,
  },
  {
    label: "Audit Trail",
    href: `/dashboard/orgs/${orgId}/audit`,
    icon: ScrollText,
  },
  {
    label: "Settings",
    href: `/dashboard/orgs/${orgId}/settings`,
    icon: Settings,
  },
];

export function Sidebar({ orgs, activeOrgId, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const { address } = useWallet();
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];
  const navItems = activeOrg ? orgNavItems(activeOrg.id) : [];

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex flex-col h-full w-[260px] shrink-0 bg-[#0d0d14] border-r border-white/[0.06]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600">
          <ShieldIcon className="w-4 h-4 text-white" strokeWidth={1.5} />
        </div>
        <span className="font-semibold text-white tracking-tight">SHIELD</span>
        <span className="ml-auto text-[10px] text-gray-500 bg-white/[0.05] px-1.5 py-0.5 rounded font-mono">
          v0.1
        </span>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Org switcher */}
        <div className="px-3 py-3 border-b border-white/[0.06]">
          <button
            onClick={() => setOrgPickerOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.05] transition-colors group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600/40 to-violet-600/40 border border-white/10 flex items-center justify-center shrink-0 text-xs font-bold text-blue-200">
              {activeOrg?.name?.slice(0, 1)?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">
                {activeOrg?.name ?? "Select organization"}
              </p>
              {activeOrg && (
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  {activeOrg.role}
                </p>
              )}
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-gray-500 transition-transform shrink-0",
                orgPickerOpen && "rotate-180"
              )}
            />
          </button>

          {orgPickerOpen && (
            <div className="mt-1 flex flex-col gap-0.5">
              {orgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/dashboard/orgs/${org.id}`}
                  onClick={() => setOrgPickerOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors",
                    org.id === activeOrg?.id
                      ? "bg-blue-500/10 text-blue-300"
                      : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  <div className="w-5 h-5 rounded bg-white/[0.06] flex items-center justify-center text-[10px] font-bold shrink-0">
                    {org.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="truncate">{org.name}</span>
                  {org.id === activeOrg?.id && (
                    <ChevronRight className="w-3 h-3 ml-auto shrink-0" />
                  )}
                </Link>
              ))}

              <Link
                href="/dashboard/orgs/new"
                onClick={() => setOrgPickerOpen(false)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-white/[0.05] transition-colors mt-1 border-t border-white/[0.05] pt-2"
              >
                <Plus className="w-4 h-4 shrink-0" />
                New organization
              </Link>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 flex flex-col gap-0.5">
          {/* Dashboard home */}
          <NavLink
            href="/dashboard"
            icon={LayoutDashboard}
            label="Home"
            active={isActive("/dashboard", true)}
          />

          {activeOrg && (
            <>
              <div className="px-2 pt-3 pb-1">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">
                  Organization
                </p>
              </div>
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={isActive(item.href, item.exact)}
                />
              ))}
            </>
          )}

          {!activeOrg && (
            <div className="px-2 py-4 text-center">
              <p className="text-xs text-gray-500 mb-3">
                You&apos;re not in any organization yet.
              </p>
              <Link
                href="/dashboard/orgs/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs rounded-lg hover:bg-blue-600/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create organization
              </Link>
            </div>
          )}
        </nav>

        {/* Identity section at bottom */}
        <div className="border-t border-white/[0.06] p-3 flex flex-col gap-0.5 shrink-0">
          <NavLink
            href="/dashboard/identity"
            icon={Fingerprint}
            label="My Identity"
            active={isActive("/dashboard/identity")}
          />

          {address && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
              <Wallet className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-xs text-gray-500 font-mono truncate">
                {shortAddress(address)}
              </span>
            </div>
          )}

          {/* User + logout */}
          <div className="flex items-center gap-2 px-2 py-2 mt-1 rounded-lg hover:bg-white/[0.05] transition-colors cursor-default">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600/40 to-violet-600/40 border border-white/10 flex items-center justify-center text-xs font-bold text-blue-200 shrink-0">
              {userName?.slice(0, 1)?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{userName}</p>
              <p className="text-[10px] text-gray-500 truncate">{userEmail}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.08] transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
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
        "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors",
        active
          ? "bg-blue-500/10 text-blue-300 font-medium"
          : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </Link>
  );
}
