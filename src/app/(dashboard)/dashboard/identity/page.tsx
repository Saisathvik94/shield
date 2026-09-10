import { auth } from "@/lib/auth";
import { getUserWithOrgs } from "@/db/queries/users";
import { getUserAuditEvents } from "@/db/queries/audit";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Fingerprint,
  Wallet,
  ShieldCheck,
  Building2,
  Clock,
  ExternalLink,
  Shield,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { TechnicalDetails } from "@/components/ui/technical-details";
import { relativeTime, roleColor, shortAddress, cn } from "@/lib/utils";
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
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in-0 duration-150">
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-white/[0.06] pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          My SHIELD Identity
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Your sovereign decentralized identity and linked Algorand Access Wallet.
        </p>
      </div>

      {/* Identity Summary Card (§11 & §12) */}
      <Card className="overflow-hidden border-blue-200 dark:border-blue-500/20 bg-gradient-to-r from-blue-50 via-white to-indigo-50 dark:from-blue-950/20 dark:via-[#0f1017] dark:to-indigo-950/20">
        <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-gradient-to-br dark:from-blue-600/30 dark:to-indigo-600/30 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-2xl font-bold text-blue-700 dark:text-blue-200 shrink-0 shadow-sm">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{user.name}</h2>
                  <StatusBadge status="ACTIVE" label="Identity Verified" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{user.email}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Active in <strong className="text-slate-800 dark:text-white">{memberships.length}</strong> Organization{memberships.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-slate-400 dark:text-slate-600">·</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Created {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {primaryWallet && (
              <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-white/[0.08] pt-4 sm:pt-0 sm:pl-6">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Access Wallet Status
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    Pera Wallet Linked
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DID & Algorand Access Wallet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Decentralized Identifier Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Fingerprint className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Decentralized Identifier (DID)
            </CardTitle>
            <CardDescription>
              W3C-compliant global identifier for trust verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.did ? (
              <div>
                <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.06] rounded-xl px-3.5 py-2.5 mb-2">
                  <code className="text-xs font-mono text-blue-700 dark:text-blue-300 truncate flex-1">
                    {user.did}
                  </code>
                  <CopyButton text={user.did} />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Your DID is unique across the SHIELD network and resolves sovereign verifiable permissions.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">DID is pending creation.</p>
            )}
          </CardContent>
        </Card>

        {/* Algorand Access Wallet Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Algorand Access Wallet
            </CardTitle>
            <CardDescription>
              Non-custodial cryptographic keypair on Algorand TestNet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {primaryWallet ? (
              <div>
                <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.06] rounded-xl px-3.5 py-2.5 mb-2">
                  <code className="text-xs font-mono text-emerald-700 dark:text-emerald-300 truncate flex-1">
                    {primaryWallet.walletAddress}
                  </code>
                  <CopyButton text={primaryWallet.walletAddress} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="capitalize text-slate-700 dark:text-slate-300 font-medium">
                    {primaryWallet.walletType} Wallet
                  </span>
                  <a
                    href={`https://testnet.explorer.perawallet.app/address/${primaryWallet.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View on Algorand <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No wallet linked yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Collapsible Technical Cryptographic Details (§20) */}
      <TechnicalDetails
        title="Technical Identity & Cryptographic Metadata"
        description="Public keys, DID document structure, and on-chain identity anchor"
        items={[
          { label: "DID Scheme", value: "did:shield", isCode: true },
          { label: "Full DID URI", value: user.did, isCode: true, copyable: true },
          { label: "Algorand Network", value: "TestNet (algonode.cloud)" },
          { label: "Wallet Address", value: primaryWallet?.walletAddress, isCode: true, copyable: true },
          { label: "Key Algorithm", value: "Ed25519 (Curve25519 standard)" },
          { label: "Auth Method", value: "Non-custodial ARC-0000 Pera signature" },
          { label: "User ID", value: user.id, isCode: true, copyable: true },
        ]}
      />

      {/* Organization Memberships Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Organization Memberships ({memberships.length})
              </CardTitle>
              <CardDescription>
                Organizations where this cryptographic identity holds authorized roles
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {memberships.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              You are not a member of any organization yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {memberships.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/dashboard/orgs/${m.organization.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-white/[0.08] flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-200 shrink-0">
                      {m.organization.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors truncate">
                        {m.organization.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                        slug: {m.organization.slug}
                      </p>
                    </div>
                    <span className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-medium border", roleColor(m.role))}>
                      {m.role}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Identity Activity History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Identity Activity Timeline
          </CardTitle>
          <CardDescription>
            Audit log of authentications and cryptographic events tied to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {auditEvents.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No audit events recorded for this identity yet.
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
  );
}
