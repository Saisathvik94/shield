import { auth } from "@/lib/auth";
import {
  getOrganizationsByUser,
  getPendingInvitationsForEmail,
} from "@/db/queries/organizations";
import { getUserWithOrgs } from "@/db/queries/users";
import { getOrgAuditEvents } from "@/db/queries/audit";
import Link from "next/link";
import {
  Building2,
  Plus,
  Shield,
  Activity,
  Fingerprint,
  Package,
  ArrowRight,
  Mail,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { relativeTime, roleColor, shortAddress, cn } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [user, orgs, pendingInvitations] = await Promise.all([
    getUserWithOrgs(session.user.id),
    getOrganizationsByUser(session.user.id),
    session.user.email
      ? getPendingInvitationsForEmail(session.user.email)
      : Promise.resolve([]),
  ]);

  // Grab audit events from the first org for quick activity feed
  const recentActivity =
    orgs.length > 0 ? await getOrgAuditEvents(orgs[0].id, 6) : [];

  const walletAddress = user?.walletIdentities?.[0]?.walletAddress;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in-0 duration-150">
      {/* Welcome & Security Status Banner (§10) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {greeting}, {session.user.name?.split(" ")[0]}
            </h1>
            <span className="text-xl">👋</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enterprise digital trust overview for your identity, organizations, and protected assets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Organization Trust Status: Active &amp; Secure</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={<Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          label="Organizations"
          value={orgs.length}
          subtext={`${orgs.filter((o) => o.role === "OWNER" || o.role === "ADMIN").length} Managed as Admin`}
          accent="blue"
        />
        <MetricCard
          icon={<Fingerprint className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          label="Digital Identity"
          value={walletAddress ? "Verified" : "Incomplete"}
          subtext={walletAddress ? `Algorand: ${shortAddress(walletAddress, 4)}` : "Connect Pera Wallet"}
          accent="indigo"
        />
        <MetricCard
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          label="Trust Layer"
          value="Algorand"
          subtext="Cryptographic Audits Enabled"
          accent="emerald"
        />
      </div>

      {/* Pending Invitations Banner (If Any) */}
      {pendingInvitations.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Pending Organization Invitations ({pendingInvitations.length})
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  You have been invited to collaborate with secure access roles.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.06] shadow-xs"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {invitation.organization.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Role: <span className="text-amber-700 dark:text-amber-300 font-medium">{invitation.role}</span> · Expires{" "}
                    {invitation.expiresAt.toLocaleDateString()}
                  </p>
                </div>
                <Button variant="primary" size="sm" asChild>
                  <Link href={`/invite/${invitation.token}`}>
                    Review <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Organizations & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organizations Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Organizations
                </CardTitle>
                <CardDescription>
                  Multi-tenant organizational workspaces and role assignments
                </CardDescription>
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/dashboard/orgs/new">
                  <Plus className="w-3.5 h-3.5 mr-1" /> New Org
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {orgs.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Building2}
                  title="No Organizations Yet"
                  description="Create an organization to begin managing departments, assets, and role-based permissions."
                  actionText="Create Organization"
                  actionHref="/dashboard/orgs/new"
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {orgs.map((org) => (
                  <li key={org.id}>
                    <Link
                      href={`/dashboard/orgs/${org.id}`}
                      className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-white/[0.08] flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-200 shrink-0">
                        {org.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors truncate">
                          {org.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                          slug: {org.slug}
                        </p>
                      </div>
                      <span className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-medium border", roleColor(org.role))}>
                        {org.role}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-slate-700 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit & Activity Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Recent Audit Activity
                </CardTitle>
                <CardDescription>
                  Chronological event stream with immutable blockchain verification
                </CardDescription>
              </div>
              {orgs.length > 0 && (
                <Link
                  href={`/dashboard/orgs/${orgs[0].id}/audit`}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline transition-colors font-medium"
                >
                  View All →
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Activity}
                  title="No Recent Activity"
                  description="Security actions, asset changes, and member updates will be logged here with cryptographic proof."
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {recentActivity.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {event.description ?? event.eventType.replace(/_/g, " ")}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {relativeTime(event.createdAt)}
                        {event.actor?.name ? ` · Actor: ${event.actor.name}` : ""}
                      </p>
                    </div>
                    {event.blockchainTxId && (
                      <Badge variant="success" className="text-[10px] shrink-0 font-mono">
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

      {/* Global SHIELD Identity Card (§11 & §12) */}
      <Card className="border-blue-200 dark:border-blue-500/20 bg-gradient-to-r from-blue-50 via-white to-indigo-50 dark:from-blue-950/20 dark:via-[#0f1017] dark:to-indigo-950/20">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-600/30 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-300 shrink-0 shadow-sm">
              <Shield className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Global Decentralized Identity</h3>
                <StatusBadge status="ACTIVE" label="Verified Identity" size="sm" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-mono truncate max-w-md">
                DID: {user?.did || "did:shield:user:pending"}
              </p>
              {walletAddress && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Algorand Access Wallet: {shortAddress(walletAddress, 6)}
                </p>
              )}
            </div>
          </div>

          <Button variant="primary" size="sm" asChild className="shrink-0">
            <Link href="/dashboard/identity">
              Manage Identity &amp; Keys <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subtext,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  accent: "blue" | "indigo" | "emerald";
}) {
  const accentClasses = {
    blue: "border-blue-200 dark:border-blue-500/20 bg-white dark:bg-[#0f1019]",
    indigo: "border-indigo-200 dark:border-indigo-500/20 bg-white dark:bg-[#0f1019]",
    emerald: "border-emerald-200 dark:border-emerald-500/20 bg-white dark:bg-[#0f1019]",
  };

  return (
    <div className={cn("rounded-2xl border p-5 transition-all shadow-xs", accentClasses[accent])}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{subtext}</p>
    </div>
  );
}
