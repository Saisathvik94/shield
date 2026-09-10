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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { relativeTime, roleColor, classificationColor } from "@/lib/utils";

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
    getOrgAuditEvents(orgId, 10),
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Org header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-white/[0.08] flex items-center justify-center text-xl font-bold text-blue-200 shrink-0">
          {org.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-white">{org.name}</h1>
          {org.description && (
            <p className="text-sm text-gray-400 mt-1 truncate max-w-lg">
              {org.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="info" className="font-mono text-[10px]">
              {org.slug}
            </Badge>
            <Badge className={roleColor(membership.role)}>
              {membership.role}
            </Badge>
            {org.algorandAppId && (
              <Badge variant="success">
                <ShieldCheck className="w-3 h-3" />
                On-chain
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Members",
            value: members.length,
            href: `/dashboard/orgs/${orgId}/members`,
            icon: Users,
            color: "blue",
          },
          {
            label: "Assets",
            value: assets.length,
            href: `/dashboard/orgs/${orgId}/assets`,
            icon: Package,
            color: "violet",
          },
          {
            label: "Departments",
            value: org.departments?.length ?? 0,
            href: `/dashboard/orgs/${orgId}/settings`,
            icon: Building2,
            color: "emerald",
          },
          {
            label: "Audit Events",
            value: auditEvents.length,
            href: `/dashboard/orgs/${orgId}/audit`,
            icon: ScrollText,
            color: "amber",
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-xl bg-[#111118] border border-white/[0.06] p-4 hover:border-white/10 transition-colors"
          >
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Members
              </CardTitle>
              <Link
                href={`/dashboard/orgs/${orgId}/members`}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-white/[0.04]">
              {members.slice(0, 5).map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-white/[0.08] flex items-center justify-center text-xs font-bold text-blue-200 shrink-0">
                    {m.user.name?.slice(0, 1)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{m.user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{m.user.email}</p>
                  </div>
                  <Badge className={roleColor(m.role)}>{m.role}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recent assets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-4 h-4 text-violet-400" />
                Assets
              </CardTitle>
              <Link
                href={`/dashboard/orgs/${orgId}/assets`}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {assets.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Package className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No assets registered yet</p>
                <Link
                  href={`/dashboard/orgs/${orgId}/assets`}
                  className="inline-flex items-center gap-1 mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Register first asset <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {assets.slice(0, 5).map((a) => {
                  const cls = classificationColor(a.classification);
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-mono font-medium truncate">
                          {a.assetId}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{a.name}</p>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cls.className}`}
                      >
                        {cls.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" />
                Recent Activity
              </CardTitle>
              <Link
                href={`/dashboard/orgs/${orgId}/audit`}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Full audit trail <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {auditEvents.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                No activity yet
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {auditEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start gap-3 px-5 py-3"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300">
                        {event.description ??
                          event.eventType.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {relativeTime(event.createdAt)}
                        {event.actor?.name ? ` · ${event.actor.name}` : ""}
                      </p>
                    </div>
                    {event.blockchainTxId && (
                      <Badge variant="success" className="shrink-0 text-[10px]">
                        On-chain
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
