import { auth } from "@/lib/auth";
import { getUserWithOrgs } from "@/db/queries/users";
import { getUserAuditEvents } from "@/db/queries/audit";
import { redirect } from "next/navigation";
import {
  Fingerprint,
  Wallet,
  ShieldCheck,
  Building2,
  Clock,
  Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { relativeTime, roleColor, shortAddress } from "@/lib/utils";
import { CopyButton } from "@/components/dashboard/copy-button";

export default async function IdentityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, auditEvents] = await Promise.all([
    getUserWithOrgs(session.user.id),
    getUserAuditEvents(session.user.id, 20),
  ]);

  if (!user) redirect("/login");

  const primaryWallet = user.walletIdentities?.[0];
  const memberships = user.memberships ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">My Identity</h1>
        <p className="text-gray-400 text-sm mt-1">
          Your global SHIELD identity - one wallet across all organizations.
        </p>
      </div>

      {/* Identity card */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600" />
        <CardContent className="pt-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-white/[0.08] flex items-center justify-center text-2xl font-bold text-blue-200 shrink-0">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-white">{user.name}</h2>
              <p className="text-sm text-gray-400">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="info">
                  <ShieldCheck className="w-3 h-3" />
                  SHIELD Identity
                </Badge>
                {primaryWallet && (
                  <Badge variant="success">
                    <Wallet className="w-3 h-3" />
                    Wallet Linked
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* DID */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-violet-400" />
              Decentralized Identifier (DID)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.did ? (
              <div>
                <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2.5 mb-2">
                  <p className="text-xs font-mono text-gray-300 truncate flex-1">
                    {user.did}
                  </p>
                  <CopyButton text={user.did} />
                </div>
                <p className="text-xs text-gray-500">
                  Your DID anchors your identity across the SHIELD network.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">DID not yet generated.</p>
            )}
          </CardContent>
        </Card>

        {/* Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-400" />
              Algorand Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            {primaryWallet ? (
              <div>
                <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2.5 mb-2">
                  <p className="text-xs font-mono text-gray-300 truncate flex-1">
                    {primaryWallet.walletAddress}
                  </p>
                  <CopyButton text={primaryWallet.walletAddress} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="capitalize">{primaryWallet.walletType} wallet</span>
                  {primaryWallet.verifiedAt && (
                    <>
                      <span>·</span>
                      <span>Verified {relativeTime(primaryWallet.verifiedAt)}</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No wallet linked yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Organization memberships */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            Organizations ({memberships.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {memberships.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              You are not a member of any organization yet.
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {memberships.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-white/[0.08] flex items-center justify-center text-sm font-bold text-blue-200 shrink-0">
                    {m.organization.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {m.organization.name}
                    </p>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {m.organization.slug}
                    </p>
                  </div>
                  <Badge className={roleColor(m.role)}>{m.role}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Activity timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Identity History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {auditEvents.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              No events yet.
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {auditEvents.map((event) => (
                <li key={event.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">
                      {event.description ?? event.eventType.replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {relativeTime(event.createdAt)}
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
  );
}
