"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ScrollText,
  ShieldCheck,
  ExternalLink,
  User,
  Clock,
  Zap,
  Search,
  Layers,
  FileText,
  Key,
  Users,
} from "lucide-react";
import { anchorEvent } from "@/lib/algorand/algorand-actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/dashboard/copy-button";
import { relativeTime, cn } from "@/lib/utils";

interface AuditEventData {
  id: string;
  eventType: string;
  description: string | null;
  resourceType: string | null;
  resourceId: string | null;
  blockchainTxId: string | null;
  ipfsCid: string | null;
  createdAt: string;
  actor: { name: string; id: string } | null;
}

interface Props {
  orgId: string;
  orgName: string;
  canAnchor: boolean;
  events: AuditEventData[];
}

const CATEGORIES = [
  { id: "all", label: "All Events" },
  { id: "assets", label: "Assets", icon: Layers },
  { id: "access", label: "Access & Roles", icon: Key },
  { id: "members", label: "Members", icon: Users },
  { id: "chain", label: "Blockchain & IPFS", icon: ShieldCheck },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

export function AuditClient({ orgId, orgName, canAnchor, events }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");

  const onChainCount = events.filter((e) => e.blockchainTxId).length;
  const ipfsCount = events.filter((e) => e.ipfsCid).length;
  const uniqueActors = new Set(events.map((e) => e.actor?.id).filter(Boolean)).size;

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Category filter
      if (activeCategory === "assets") {
        if (!event.eventType.startsWith("ASSET_") && event.resourceType !== "asset") return false;
      } else if (activeCategory === "access") {
        if (
          !event.eventType.startsWith("ACCESS_") &&
          !event.eventType.startsWith("ROLE_")
        )
          return false;
      } else if (activeCategory === "members") {
        if (!event.eventType.startsWith("MEMBER_") && !event.eventType.startsWith("USER_"))
          return false;
      } else if (activeCategory === "chain") {
        if (!event.blockchainTxId && !event.ipfsCid && !event.eventType.includes("BLOCKCHAIN"))
          return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const descMatch = event.description?.toLowerCase().includes(q);
        const typeMatch = event.eventType.toLowerCase().includes(q);
        const actorMatch = event.actor?.name.toLowerCase().includes(q);
        const txMatch = event.blockchainTxId?.toLowerCase().includes(q);
        const cidMatch = event.ipfsCid?.toLowerCase().includes(q);
        if (!descMatch && !typeMatch && !actorMatch && !txMatch && !cidMatch) return false;
      }

      return true;
    });
  }, [events, activeCategory, search]);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in-0 duration-150">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Audit Trail</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Cryptographically anchored immutable event log for <strong className="text-slate-900 dark:text-slate-200">{orgName}</strong>.
        </p>
      </div>

      {/* Summary Metrics (§19) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Logged Events"
          value={events.length}
          icon={ScrollText}
        />
        <StatCard
          label="On-Chain Proofs"
          value={onChainCount}
          icon={ShieldCheck}
          accent="emerald"
        />
        <StatCard
          label="IPFS Anchored"
          value={ipfsCount}
          icon={FileText}
          accent="blue"
        />
        <StatCard
          label="Active Actors"
          value={uniqueActors}
          icon={Users}
        />
      </div>

      {/* Status banner */}
      {canAnchor && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-4 py-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            Algorand TestNet connection active. Critical unproofed audit events can be anchored on-chain with one click.
          </p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    activeCategory === cat.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.04]"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                placeholder="Search event log..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500/60 shadow-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No audit events found"
              description={
                search || activeCategory !== "all"
                  ? "Try clearing your search query or switching filters."
                  : "No events have been recorded for this organization yet."
              }
              className="py-12"
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredEvents.map((event) => (
                <AuditEventRow
                  key={event.id}
                  event={event}
                  orgId={orgId}
                  canAnchor={canAnchor && !event.blockchainTxId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Audit Row Component ──────────────────────────────────────────────────────

function AuditEventRow({
  event,
  orgId,
  canAnchor,
}: {
  event: AuditEventData;
  orgId: string;
  canAnchor: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [anchored, setAnchored] = useState(!!event.blockchainTxId);
  const [txId, setTxId] = useState(event.blockchainTxId ?? null);

  function handleAnchor() {
    startTransition(async () => {
      const result = await anchorEvent(event.id, orgId);
      if (result.status === "success") {
        setAnchored(true);
        setTxId(result.txId);
        toast.success("Event anchored on Algorand", {
          description: `TXID: ${result.txId.slice(0, 16)}...`,
        });
        router.refresh();
      } else if (result.status === "skipped") {
        toast.info(result.reason);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-white/[0.015] transition-colors space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="text-[10px] font-mono tracking-wider">
              {event.eventType}
            </Badge>
            {anchored && (
              <Badge variant="success" className="gap-1 text-[10px]">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                On-Chain Proof
              </Badge>
            )}
            {event.ipfsCid && (
              <Badge variant="info" className="gap-1 text-[10px]">
                <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                IPFS Anchored
              </Badge>
            )}
          </div>

          <p className="text-xs font-medium text-slate-900 dark:text-white leading-relaxed">
            {event.description ?? event.eventType.replace(/_/g, " ")}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {relativeTime(event.createdAt)}
            </span>
            {event.actor && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {event.actor.name}
              </span>
            )}
            {event.resourceType && (
              <span className="capitalize">
                Resource: {event.resourceType}
              </span>
            )}
          </div>
        </div>

        {/* Action / Anchor button */}
        <div className="flex items-center gap-2 shrink-0">
          {canAnchor && !anchored && (
            <Button
              size="sm"
              variant="secondary"
              loading={isPending}
              onClick={handleAnchor}
              icon={<Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />}
              className="text-xs border-amber-300 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10"
            >
              Anchor On-Chain
            </Button>
          )}
        </div>
      </div>

      {/* On-Chain Transaction Drawer if anchored */}
      {txId && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-400 dark:text-slate-500 shrink-0">TX:</span>
            <span className="truncate text-slate-700 dark:text-slate-300">{txId}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <CopyButton value={txId} />
            <a
              href={`https://testnet.explorer.perawallet.app/tx/${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              title="View on Algorand Explorer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card Component ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: "emerald" | "blue";
}) {
  return (
    <div
      className={cn(
        "p-4 rounded-2xl border bg-white dark:bg-[#0f1017] transition-all shadow-xs",
        accent === "emerald"
          ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/[0.02]"
          : accent === "blue"
          ? "border-blue-200 dark:border-blue-500/20 bg-blue-50/30 dark:bg-blue-500/[0.02]"
          : "border-slate-200 dark:border-white/[0.06]"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <Icon
          className={cn(
            "w-4 h-4",
            accent === "emerald"
              ? "text-emerald-600 dark:text-emerald-400"
              : accent === "blue"
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-400 dark:text-slate-500"
          )}
        />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
    </div>
  );
}
