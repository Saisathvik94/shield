"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ScrollText,
  ShieldCheck,
  ExternalLink,
  User,
  Clock,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { anchorEvent } from "@/lib/algorand/algorand-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const EVENT_DOT_COLORS: Record<string, string> = {
  ORG_CREATED: "bg-blue-400",
  ORG_UPDATED: "bg-blue-400",
  MEMBER_INVITED: "bg-violet-400",
  MEMBER_JOINED: "bg-green-400",
  MEMBER_REMOVED: "bg-red-400",
  ROLE_ASSIGNED: "bg-indigo-400",
  ROLE_REVOKED: "bg-orange-400",
  ASSET_CREATED: "bg-emerald-400",
  ASSET_UPDATED: "bg-emerald-400",
  ASSET_ASSIGNED: "bg-cyan-400",
  ASSET_TRANSFERRED: "bg-yellow-400",
  ASSET_REVOKED: "bg-red-400",
  ACCESS_GRANTED: "bg-green-400",
  ACCESS_DENIED: "bg-red-400",
  BLOCKCHAIN_TX: "bg-amber-400",
  IPFS_UPLOAD: "bg-blue-300",
  USER_LOGIN: "bg-gray-400",
  USER_CREATED: "bg-blue-400",
  USER_WALLET_LINKED: "bg-violet-400",
};

export function AuditClient({ orgId, orgName, canAnchor, events }: Props) {
  const onChainCount = events.filter((e) => e.blockchainTxId).length;
  const ipfsCount = events.filter((e) => e.ipfsCid).length;
  const uniqueActors = new Set(events.map((e) => e.actor?.id).filter(Boolean)).size;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Audit Trail</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Immutable log of all critical events in {orgName}.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatBox label="Total events" value={events.length} />
        <StatBox label="On-chain proofs" value={onChainCount} accent="emerald" />
        <StatBox label="IPFS anchored" value={ipfsCount} accent="blue" />
        <StatBox label="Unique actors" value={uniqueActors} />
      </div>

      {/* Algorand status banner */}
      {canAnchor && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-4 py-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300">
            Algorand is connected - you can anchor unproofed events on-chain.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-gray-400" />
            Event Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <ScrollText className="w-10 h-10 text-gray-700 mb-3" />
              <p className="text-sm text-gray-500">No audit events recorded yet.</p>
            </div>
          ) : (
            <div className="relative px-5 py-4">
              {/* Vertical timeline line */}
              <div className="absolute left-[22px] top-0 bottom-0 w-px bg-white/[0.05]" />
              <ul className="flex flex-col gap-4">
                {events.map((event) => (
                  <AuditEventRow
                    key={event.id}
                    event={event}
                    orgId={orgId}
                    canAnchor={canAnchor && !event.blockchainTxId}
                  />
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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

  const dotColor = EVENT_DOT_COLORS[event.eventType] ?? "bg-gray-400";

  function handleAnchor() {
    startTransition(async () => {
      const result = await anchorEvent(event.id, orgId);
      if (result.status === "success") {
        setAnchored(true);
        setTxId(result.txId);
        toast.success("Event anchored on Algorand", {
          description: `TX: ${result.txId.slice(0, 20)}…`,
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
    <li className="flex items-start gap-4 relative">
      <div
        className={cn(
          "w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 z-10 ring-2 ring-[#111118]",
          dotColor
        )}
      />
      <div className="flex-1 min-w-0 pb-4 border-b border-white/[0.04] last:border-0 last:pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white leading-snug">
              {event.description ?? event.eventType.replace(/_/g, " ")}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge variant="default" className="text-[10px] font-mono">
                {event.eventType}
              </Badge>
              {anchored && (
                <Badge variant="success" className="text-[10px] gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  On-chain
                </Badge>
              )}
              {event.ipfsCid && (
                <Badge variant="info" className="text-[10px]">IPFS</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] text-gray-600">
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
                <span className="capitalize">{event.resourceType}</span>
              )}
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {txId ? (
              <a
                href={`https://testnet.algoexplorer.io/tx/${txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-emerald-400 transition-colors"
                title="View on AlgoExplorer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : canAnchor ? (
              <Button
                size="sm"
                variant="secondary"
                loading={isPending}
                onClick={handleAnchor}
                icon={<Zap className="w-3 h-3" />}
                className="text-[10px] px-2 py-1 h-auto"
              >
                Anchor
              </Button>
            ) : null}
          </div>
        </div>

        {/* Blockchain TX */}
        {txId && (
          <div className="mt-2 flex items-center gap-1.5 bg-white/[0.03] rounded-lg px-2.5 py-1.5">
            <span className="text-[10px] text-gray-500">TX:</span>
            <span className="text-[10px] font-mono text-gray-300 truncate flex-1">
              {txId}
            </span>
            <a
              href={`https://testnet.algoexplorer.io/tx/${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-emerald-400 transition-colors shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </li>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "blue";
}) {
  const accentCls = accent === "emerald"
    ? "border-emerald-500/10 from-emerald-600/8 to-emerald-600/3"
    : accent === "blue"
    ? "border-blue-500/10 from-blue-600/8 to-blue-600/3"
    : "border-white/[0.06] from-white/[0.03] to-transparent";
  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-4", accentCls)}>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
