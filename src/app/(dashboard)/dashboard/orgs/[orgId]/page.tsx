import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import {
  getOrganizationById,
  getMembership,
  getOrganizationMembers,
} from "@/db/queries/organizations";
import { getOrgAuditEvents } from "@/db/queries/audit";
import { getOrgAssets } from "@/lib/actions/asset-actions";
import Link from "next/link";
import {
  Users,
  Package,
  ScrollText,
  ArrowRight,
  Activity,
  Building2,
  ShieldCheck,
  Plus,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { relativeTime, roleColor, cn } from "@/lib/utils";

interface Props {
  params: Promise<{ orgId: string }>;
}

export default async function OrgOverviewPage({ params }: Props) {
  const { orgId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [org, membership] = await Promise.all([
    getOrganizationById(orgId),
    getMembership(orgId, session.user.id),
  ]);

  if (!org || !membership || membership.status !== "ACTIVE") notFound();

  const [members, assets, auditEvents] = await Promise.all([
    getOrganizationMembers(orgId),
    getOrgAssets(orgId, session.user.id),
    getOrgAuditEvents(orgId, 8),
  ]);

  const canManage = ["OWNER", "ADMIN"].includes(membership.role);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in-0 duration-150">
      {/* Organization Hero Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0f1017] p-6 relative overflow-hidden shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-gradient-to-br dark:from-blue-600/30 dark:to-indigo-600/30 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-xl font-bold text-blue-700 dark:text-blue-200 shrink-0 shadow-xs">
              {org.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{org.name}</h1>
                <StatusBadge status="ACTIVE" label="Active Org" />
                {org.algorandAppId && (
                  <Badge variant="success" className="gap-1 font-mono text-[10px]">
                    <ShieldCheck className="w-3 h-3" /> App #{org.algorandAppId}
                  </Badge>
                )}
              </div>
              {org.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  {org.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.04] px-2 py-0.5 rounded border border-slate-200 dark:border-white/[0.06]">
                  slug: {org.slug}
                </span>
                <span className="text-slate-400 dark:text-slate-600">·</span>
                <span>
                  Your Role:{" "}
                  <strong className={cn("px-2 py-0.5 rounded text-[11px] border font-medium", roleColor(membership.role))}>
                    {membership.role}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {canManage && (
              <>
                <Button variant="primary" size="sm" asChild>
                  <Link href={`/dashboard/orgs/${orgId}/assets`}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Register Asset
                  </Link>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/dashboard/orgs/${orgId}/members`}>
                    <Users className="w-3.5 h-3.5 mr-1" /> Invite Member
                  </Link>
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/orgs/${orgId}/settings`}>
                <Settings className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Members & Personnel",
            value: members.length,
            href: `/dashboard/orgs/${orgId}/members`,
            icon: Users,
            accent: "blue",
          },
          {
            label: "Protected Assets",
            value: assets.length,
            href: `/dashboard/orgs/${orgId}/assets`,
            icon: Package,
            accent: "indigo",
          },
          {
            label: "Hierarchy Departments",
            value: org.departments?.length ?? 0,
            href: `/dashboard/orgs/${orgId}/settings`,
            icon: Building2,
            accent: "emerald",
          },
          {
            label: "Immutable Audit Proofs",
            value: auditEvents.length,
            href: `/dashboard/orgs/${orgId}/audit`,
            icon: ScrollText,
            accent: "amber",
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-2xl bg-white dark:bg-[#0f1017] border border-slate-200/80 dark:border-white/[0.07] p-5 hover:border-slate-300 dark:hover:border-white/[0.14] transition-all shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {stat.label}
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <stat.icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
              <span className="text-xs text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform font-medium">
                View →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Dual Columns: Members & Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members Column */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Recent Members
                </CardTitle>
                <CardDescription>Personnel assigned with scoped access roles</CardDescription>
              </div>
              <Link
                href={`/dashboard/orgs/${orgId}/members`}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
              >
                All Members ({members.length}) →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {members.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Users}
                  title="No Members Found"
                  description="Invite personnel to begin assigning departments and access tiers."
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {members.slice(0, 5).map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-white/[0.08] flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-200 shrink-0">
                      {m.user.name?.slice(0, 1)?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{m.user.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{m.user.email}</p>
                    </div>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border", roleColor(m.role))}>
                      {m.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Assets Column */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Registered Assets
                </CardTitle>
                <CardDescription>Digital and physical assets with cryptographic proof</CardDescription>
              </div>
              <Link
                href={`/dashboard/orgs/${orgId}/assets`}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
              >
                All Assets ({assets.length}) →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {assets.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Package}
                  title="No Assets Registered"
                  description="Register critical documents or equipment to anchor ownership and integrity on-chain."
                  actionText="Register First Asset"
                  actionHref={`/dashboard/orgs/${orgId}/assets`}
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {assets.slice(0, 5).map((a) => {
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/dashboard/orgs/${orgId}/assets/${a.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors truncate">
                            {a.assetId}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{a.name}</p>
                        </div>
                        <StatusBadge classification={a.classification} size="sm" />
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Organization Audit Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  Organization Activity Stream
                </CardTitle>
                <CardDescription>
                  Live ledger of authorizations, transfers, and security events
                </CardDescription>
              </div>
              <Link
                href={`/dashboard/orgs/${orgId}/audit`}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
              >
                Full Audit Trail ({auditEvents.length}) →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {auditEvents.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No activity recorded yet for this organization.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {auditEvents.map((event) => (
                  <li key={event.id} className="flex items-start gap-3.5 px-5 py-3.5">
                    <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {event.description ?? event.eventType.replace(/_/g, " ")}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {relativeTime(event.createdAt)}
                        {event.actor?.name ? ` · Actor: ${event.actor.name}` : ""}
                      </p>
                    </div>
                    {event.blockchainTxId && (
                      <Badge variant="success" className="shrink-0 text-[10px] font-mono">
                        On-Chain
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
