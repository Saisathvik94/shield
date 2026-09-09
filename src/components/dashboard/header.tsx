"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import { useOrganization } from "@/context/organization-context";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();
  const { organizations, activeOrgId, setActiveOrgId } = useOrganization();

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 px-6 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
      {/* Active Organization Switcher */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 hidden sm:inline-block">
          Tenant:
        </span>
        {organizations.length > 0 ? (
          <select
            value={activeOrgId || ""}
            onChange={(e) => setActiveOrgId(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white outline-none focus:border-cyan-500 transition cursor-pointer"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.slug})
              </option>
            ))}
          </select>
        ) : (
          <Link
            href="/organization"
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20 transition"
          >
            + Create Organization
          </Link>
        )}
      </div>

      {/* User Controls & Logout */}
      <div className="flex items-center gap-4">
        {session?.user && (
          <div className="flex items-center gap-3 pl-4 border-l border-zinc-800">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-medium text-white">
                {session.user.name || "Administrator"}
              </span>
              <span className="block text-[10px] text-zinc-400">
                {session.user.email}
              </span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 text-xs font-bold text-white shadow-sm">
              {(session.user.name?.[0] || session.user.email?.[0] || "U").toUpperCase()}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out of SHIELD"
          className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
