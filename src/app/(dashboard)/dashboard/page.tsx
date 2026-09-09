"use client";

import React, { useEffect, useState } from "react";
import { useOrganization } from "@/context/organization-context";
import { StatCard } from "@/components/ui/stat-card";
import { BlockchainCard } from "@/components/dashboard/blockchain-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OrgStats {
  organization: {
    id: string;
    name: string;
    slug: string;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    description: string | null;
  };
  counts: {
    totalEmployees: number;
    activeEmployees: number;
    departments: number;
    sections: number;
    teams: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { activeOrgId, loading: orgLoading } = useOrganization();
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!activeOrgId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/organizations/${activeOrgId}/stats`);
        if (res.ok && !ignore) {
          const json = await res.json();
          setStats(json.data);
        }
      } catch (err) {
        console.error("Failed to load organization statistics", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [activeOrgId]);

  if (orgLoading || (activeOrgId && loading && !stats)) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <LoadingSkeleton className="h-8 w-64" />
          <LoadingSkeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <LoadingSkeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!activeOrgId) {
    return (
      <EmptyState
        title="No Organization Configured"
        description="To begin managing departments, sections, teams, and employees in SHIELD, create your first organization tenant."
        actionText="Create Organization"
        onAction={() => router.push("/organization")}
      />
    );
  }

  const org = stats?.organization;
  const counts = stats?.counts;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {org?.name || "Organization Overview"}
            </h1>
            {org?.status && (
              <Badge
                variant={
                  org.status === "ACTIVE"
                    ? "success"
                    : org.status === "SUSPENDED"
                    ? "warning"
                    : "danger"
                }
              >
                {org.status}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Tenant slug: <code className="font-mono text-cyan-400">{org?.slug}</code> • Phase 0 Identity & Organizational Security
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/employees/new"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-500 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Employee
          </Link>
          <Link
            href="/organization"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition"
          >
            Org Settings
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Employees"
          value={counts?.totalEmployees ?? 0}
          subtitle="Registered personnel"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <StatCard
          title="Active Employees"
          value={counts?.activeEmployees ?? 0}
          subtitle="Active status"
          trend={`${counts && counts.totalEmployees > 0 ? Math.round((counts.activeEmployees / counts.totalEmployees) * 100) : 100}% active`}
          icon={
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Departments"
          value={counts?.departments ?? 0}
          subtitle="Level 1 hierarchy"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <StatCard
          title="Sections"
          value={counts?.sections ?? 0}
          subtitle="Level 2 hierarchy"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          }
        />

        <StatCard
          title="Teams"
          value={counts?.teams ?? 0}
          subtitle="Level 3 hierarchy"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          href="/organization/departments"
          className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-cyan-500/40 hover:bg-zinc-900/80 transition"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition">
              Departments
            </h3>
            <span className="text-xs text-zinc-400">→</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Configure business units and organizational branches
          </p>
        </Link>

        <Link
          href="/organization/sections"
          className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-cyan-500/40 hover:bg-zinc-900/80 transition"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition">
              Sections
            </h3>
            <span className="text-xs text-zinc-400">→</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Manage functional divisions scoped to departments
          </p>
        </Link>

        <Link
          href="/organization/teams"
          className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-cyan-500/40 hover:bg-zinc-900/80 transition"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition">
              Teams
            </h3>
            <span className="text-xs text-zinc-400">→</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Define working groups and squads within sections
          </p>
        </Link>

        <Link
          href="/employees"
          className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-cyan-500/40 hover:bg-zinc-900/80 transition"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition">
              Employees Directory
            </h3>
            <span className="text-xs text-zinc-400">→</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Search, filter, and assign employee records
          </p>
        </Link>
      </div>

      {/* Algorand Blockchain Status Widget */}
      <BlockchainCard />
    </div>
  );
}
