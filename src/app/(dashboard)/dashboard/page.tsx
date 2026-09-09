import { auth } from "@/lib/auth";
import { getOrganizationsByUser } from "@/db/queries/organizations";
import { getUserWithOrgs } from "@/db/queries/users";
import { getOrgAuditEvents } from "@/db/queries/audit";
import Link from "next/link";
import {
  Building2,
  Plus,
  ShieldIcon,
  Activity,
  Fingerprint,
  Package,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { relativeTime, roleColor } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [user, orgs] = await Promise.all([
    getUserWithOrgs(session.user.id),
    getOrganizationsByUser(session.user.id),
  ]);

  // Grab audit events from the first org for quick activity feed
  const recentActivity =
    orgs.length > 0 ? await getOrgAuditEvents(orgs[0].id, 8) : [];

  const walletAddress = user?.walletIdentities?.[0]?.walletAddress;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">
          {greeting}, {session.user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Your SHIELD dashboard - identity, organizations, assets.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Building2 className="w-5 h-5 text-blue-400" />}
          label="Organizations"
          value={orgs.length}
          accent="blue"
        />
        <StatCard
          icon={<Fingerprint className="w-5 h-5 text-violet-400" />}
          label="Identity"
          value={walletAddress ? "Verified" : "Incomplete"}
          accent="violet"
        />
        <StatCard
          icon={<Package className="w-5 h-5 text-emerald-400" />}
          label="Assets"
          value="-"
          accent="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organizations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Organizations</CardTitle>
              <Link
                href="/dashboard/orgs/new"
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {orgs.length === 0 ? (
              <div className="flex flex-col items-center py-10 px-5 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-sm text-gray-300 font-medium mb-1">
                  No organizations yet
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Create one or accept an invitation to get started.
                </p>
                <Link
                  href="/dashboard/orgs/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs rounded-lg hover:bg-blue-600/30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create organization
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {orgs.map((org) => (
                  <li key={org.id}>
                    <Link
                      href={`/dashboard/orgs/${org.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-white/[0.08] flex items-center justify-center text-sm font-bold text-blue-200 shrink-0">
                        {org.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {org.name}
                        </p>
                        <p className="text-xs text-gray-500 font-mono truncate">
                          {org.slug}
                        </p>
                      </div>
                      <Badge className={roleColor(org.role)}>
                        {org.role}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              {orgs.length > 0 && (
                <Link
                  href={`/dashboard/orgs/${orgs[0].id}/audit`}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View all
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Activity className="w-8 h-8 text-gray-600 mb-2" />
                <p className="text-sm text-gray-500">No activity yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {recentActivity.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">
                        {event.description ?? event.eventType.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {relativeTime(event.createdAt)}
                        {event.actor?.name ? ` · ${event.actor.name}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Identity card */}
      <Card className="mt-6">
        <CardContent className="flex items-center gap-5 py-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-white/[0.08] flex items-center justify-center shrink-0">
            <ShieldIcon className="w-6 h-6 text-violet-300" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              Global SHIELD Identity
            </p>
            <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">
              {user?.did ?? "DID not yet generated"}
            </p>
            {walletAddress && (
              <p className="text-xs text-gray-500 font-mono truncate mt-0.5">
                Wallet: {walletAddress.slice(0, 12)}…{walletAddress.slice(-6)}
              </p>
            )}
          </div>
          <Link
            href="/dashboard/identity"
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
          >
            View identity
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: "blue" | "violet" | "emerald";
}) {
  const accentClasses = {
    blue: "from-blue-600/10 to-blue-600/5 border-blue-500/10",
    violet: "from-violet-600/10 to-violet-600/5 border-violet-500/10",
    emerald: "from-emerald-600/10 to-emerald-600/5 border-emerald-500/10",
  };
  return (
    <div
      className={`rounded-xl bg-gradient-to-br border p-4 ${accentClasses[accent]}`}
    >
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
