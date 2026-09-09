"use client";

import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Package,
  Building2,
  User,
  MapPin,
  Hash,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  Fingerprint,
  Link2,
  Activity,
} from "lucide-react";
import { classificationColor, relativeTime, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssetInfo {
  id: string;
  assetId: string;
  name: string;
  description: string | null;
  assetType: string;
  classification: string;
  status: string;
  location: string | null;
  physicalIdentifier: string | null;
  algorandAssetId: string | null;
  blockchainTxId: string | null;
  ipfsCid: string | null;
  createdAt: string;
  updatedAt: string;
  organization: { name: string; slug: string };
  owner: { name: string } | null;
  custodian: { name: string } | null;
  department: string | null;
  section: string | null;
}

interface OnChainInfo {
  assetId: string;
  name: string;
  unitName: string;
  total: number;
  creator: string;
  manager: string | null;
  url: string | null;
  createdAtRound: number | null;
  deleted: boolean;
}

interface BlockchainRecord {
  txId: string;
  confirmedRound: string | null;
  recordType: string;
  network: string;
  createdAt: string;
}

interface Props {
  assetId: string;
  verificationStatus: "verified" | "partial" | "unregistered";
  isConsistent: boolean;
  indexerError: boolean;
  isAuthenticated: boolean;
  asset: AssetInfo;
  onChainInfo: OnChainInfo | null;
  blockchainRecords: BlockchainRecord[];
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: "text-gray-400 bg-gray-400/10",
  REGISTERED: "text-blue-400 bg-blue-400/10",
  ASSIGNED: "text-indigo-400 bg-indigo-400/10",
  ACTIVE: "text-green-400 bg-green-400/10",
  TRANSFER_REQUESTED: "text-yellow-400 bg-yellow-400/10",
  TRANSFERRED: "text-cyan-400 bg-cyan-400/10",
  REVOKED: "text-red-400 bg-red-400/10",
  RETIRED: "text-gray-500 bg-gray-500/10",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function VerificationClient({
  assetId,
  verificationStatus,
  isConsistent,
  indexerError,
  isAuthenticated,
  asset,
  onChainInfo,
  blockchainRecords,
}: Props) {
  const cls = classificationColor(asset.classification);
  const statusCls = STATUS_COLORS[asset.status] ?? "text-gray-400 bg-gray-400/10";

  const stripeClass =
    asset.classification === "CRITICAL"
      ? "bg-gradient-to-r from-red-600 to-rose-500"
      : asset.classification === "SECRET"
      ? "bg-gradient-to-r from-orange-600 to-amber-500"
      : asset.classification === "CONFIDENTIAL"
      ? "bg-gradient-to-r from-yellow-600 to-yellow-400"
      : "bg-gradient-to-r from-blue-600 to-violet-600";

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-10">
      <div className="max-w-2xl mx-auto">

        {/* SHIELD header */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600">
            <Shield className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="font-semibold text-white tracking-tight">SHIELD</span>
          <span className="text-gray-600 text-sm">/ Asset Verification</span>
        </div>

        {/* Join banner - shown to unauthenticated visitors */}
        {!isAuthenticated && (
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-blue-600/10 to-violet-600/10 border border-blue-500/20 p-5 flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                You don&apos;t have a SHIELD account yet
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                This asset is managed on the SHIELD platform. Connect your
                Pera Wallet to create a free identity - it only takes a moment.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link
                  href={`/login?callbackUrl=/verify/${encodeURIComponent(assetId)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-medium hover:from-blue-500 hover:to-violet-500 transition-all shadow-md shadow-blue-500/20"
                >
                  <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Create SHIELD Identity
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-white/[0.10] text-gray-300 text-xs font-medium hover:bg-white/[0.06] hover:text-white transition-all"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Verification status banner */}
        <VerificationBanner
          status={verificationStatus}
          isConsistent={isConsistent}
          indexerError={indexerError}
          assetId={assetId}
        />

        {/* Asset passport card */}
        <div className="bg-[#111118] border border-white/[0.06] rounded-2xl overflow-hidden mt-5">
          {/* Classification stripe */}
          <div className={cn("h-1.5", stripeClass)} />

          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-white/[0.08] flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xl font-bold text-white font-mono">{asset.assetId}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded font-semibold", cls.className)}>
                    {cls.label}
                  </span>
                  <span className={cn("text-xs px-2 py-0.5 rounded font-medium", statusCls)}>
                    {asset.status.replace(/_/g, " ")}
                  </span>
                </div>
                <h1 className="text-base font-semibold text-white">{asset.name}</h1>
                {asset.description && (
                  <p className="text-sm text-gray-400 mt-1">{asset.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Metadata grid */}
          <div className="border-t border-white/[0.06] px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MetaField icon={<Building2 className="w-3.5 h-3.5" />} label="Organization">
              {asset.organization.name}
            </MetaField>
            <MetaField icon={<Package className="w-3.5 h-3.5" />} label="Type">
              {asset.assetType.replace(/_/g, " ")}
            </MetaField>
            {asset.department && (
              <MetaField icon={<Link2 className="w-3.5 h-3.5" />} label="Department">
                {asset.department}
                {asset.section && <span className="text-gray-500"> → {asset.section}</span>}
              </MetaField>
            )}
            {asset.owner && (
              <MetaField icon={<User className="w-3.5 h-3.5" />} label="Owner">
                {asset.owner.name}
              </MetaField>
            )}
            {asset.custodian && (
              <MetaField icon={<User className="w-3.5 h-3.5" />} label="Custodian">
                {asset.custodian.name}
              </MetaField>
            )}
            {asset.location && (
              <MetaField icon={<MapPin className="w-3.5 h-3.5" />} label="Location">
                {asset.location}
              </MetaField>
            )}
            {asset.physicalIdentifier && (
              <MetaField icon={<Hash className="w-3.5 h-3.5" />} label="Physical ID">
                <span className="font-mono text-xs">{asset.physicalIdentifier}</span>
              </MetaField>
            )}
            <MetaField icon={<Calendar className="w-3.5 h-3.5" />} label="Registered">
              {relativeTime(asset.createdAt)}
            </MetaField>
          </div>

          {/* IPFS + Algorand identifiers */}
          {(asset.ipfsCid || asset.algorandAssetId) && (
            <div className="border-t border-white/[0.06] px-6 py-4 flex flex-col gap-2.5">
              {asset.algorandAssetId && (
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="gap-1 shrink-0">
                    <ShieldCheck className="w-3 h-3" />
                    ASA
                  </Badge>
                  <span className="text-xs font-mono text-gray-300 truncate">
                    {asset.algorandAssetId}
                  </span>
                  <a
                    href={`https://testnet.algoexplorer.io/asset/${asset.algorandAssetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-emerald-400 transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
              {asset.ipfsCid && (
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="gap-1 shrink-0">
                    <FileText className="w-3 h-3" />
                    IPFS
                  </Badge>
                  <span className="text-xs font-mono text-gray-300 truncate flex-1">
                    {asset.ipfsCid}
                  </span>
                  <a
                    href={`https://ipfs.io/ipfs/${asset.ipfsCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-blue-400 transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Algorand check */}
        {onChainInfo && (
          <AlgorandLiveCard info={onChainInfo} isConsistent={isConsistent} />
        )}

        {/* Blockchain records */}
        {blockchainRecords.length > 0 && (
          <BlockchainRecordsCard records={blockchainRecords} />
        )}

        {/* Verification checklist */}
        <ChecklistCard
          hasDbRecord={true}
          hasBlockchainAnchor={blockchainRecords.length > 0}
          hasOnChainAsset={!!onChainInfo && !onChainInfo.deleted}
          isConsistent={isConsistent}
          indexerError={indexerError}
          assetRevoked={asset.status === "REVOKED" || asset.status === "RETIRED"}
        />

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-600">
            Verified by{" "}
            <Link href="/" className="text-blue-400 hover:underline">
              SHIELD
            </Link>{" "}
            - Blockchain-Based Secure Platform for Identity, Access Control &
            Digital Asset Management
          </p>
          <p className="text-[10px] text-gray-700 mt-1">
            Powered by Algorand TestNet · IPFS · Neon PostgreSQL
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Verification status banner ───────────────────────────────────────────────

function VerificationBanner({
  status,
  isConsistent,
  indexerError,
  assetId,
}: {
  status: "verified" | "partial" | "unregistered";
  isConsistent: boolean;
  indexerError: boolean;
  assetId: string;
}) {
  if (status === "verified" && isConsistent) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5">
        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-emerald-300 text-base">
            Asset verified on Algorand
          </p>
          <p className="text-sm text-emerald-400/70 mt-0.5">
            <span className="font-mono font-bold">{assetId}</span> is registered
            on the SHIELD platform with on-chain proof. Ownership and status are
            authentic.
          </p>
        </div>
      </div>
    );
  }

  if (status === "partial") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-5">
        <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-yellow-300 text-base">
            Partial verification
          </p>
          <p className="text-sm text-yellow-400/70 mt-0.5">
            This asset exists in the SHIELD registry with some blockchain
            anchors, but a live Algorand check could not be fully completed.
            {indexerError && " The Algorand Indexer was unreachable."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 p-5">
      <Fingerprint className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-blue-300 text-base">
          SHIELD registry record found
        </p>
        <p className="text-sm text-blue-400/70 mt-0.5">
          <span className="font-mono font-bold">{assetId}</span> is registered in
          the SHIELD platform database. On-chain tokenisation has not yet been
          performed.
        </p>
      </div>
    </div>
  );
}

// ─── Live Algorand card ───────────────────────────────────────────────────────

function AlgorandLiveCard({
  info,
  isConsistent,
}: {
  info: OnChainInfo;
  isConsistent: boolean;
}) {
  return (
    <div className="mt-5 bg-[#111118] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">
            Live Algorand Verification
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400">Indexer live</span>
        </div>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetaField icon={<Hash className="w-3.5 h-3.5" />} label="ASA Index">
          <span className="font-mono">{info.assetId}</span>
        </MetaField>
        <MetaField icon={<Package className="w-3.5 h-3.5" />} label="Unit name">
          <span className="font-mono">{info.unitName || "-"}</span>
        </MetaField>
        <MetaField icon={<Package className="w-3.5 h-3.5" />} label="Asset name">
          {info.name || "-"}
        </MetaField>
        <MetaField icon={<Activity className="w-3.5 h-3.5" />} label="Supply">
          {info.total} unit{info.total !== 1 ? "s" : ""} (non-fungible)
        </MetaField>
        {info.createdAtRound && (
          <MetaField icon={<Clock className="w-3.5 h-3.5" />} label="Created at round">
            #{info.createdAtRound.toLocaleString()}
          </MetaField>
        )}
        <MetaField icon={<User className="w-3.5 h-3.5" />} label="Creator">
          <span className="font-mono text-[10px]">
            {info.creator.slice(0, 12)}…{info.creator.slice(-6)}
          </span>
        </MetaField>
      </div>

      {!isConsistent && (
        <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">
            The on-chain asset metadata does not fully match the SHIELD registry
            record. This may indicate tampering or an incorrect Algorand ASA ID.
          </p>
        </div>
      )}

      <div className="px-5 pb-4 flex gap-3">
        <a
          href={`https://testnet.algoexplorer.io/asset/${info.assetId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          View on AlgoExplorer
        </a>
        {info.url && (
          <a
            href={info.url.replace("ipfs://", "https://ipfs.io/ipfs/").replace("#arc3", "")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline"
          >
            <FileText className="w-3 h-3" />
            Asset metadata
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Blockchain records card ──────────────────────────────────────────────────

function BlockchainRecordsCard({ records }: { records: BlockchainRecord[] }) {
  return (
    <div className="mt-5 bg-[#111118] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
        <Activity className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-white">
          Blockchain Proof Records
        </h2>
        <span className="ml-auto text-xs text-gray-500">{records.length} record{records.length !== 1 ? "s" : ""}</span>
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {records.map((r) => {
          const explorerBase = r.network === "testnet"
            ? "https://testnet.algoexplorer.io"
            : "https://algoexplorer.io";
          return (
            <li key={r.txId} className="px-5 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="success" className="text-[10px] font-mono">
                    {r.recordType.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-[10px] text-gray-500 capitalize">{r.network}</span>
                </div>
                <p className="text-[10px] font-mono text-gray-400 truncate">
                  {r.txId}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {r.confirmedRound && `Round #${r.confirmedRound} · `}
                  {relativeTime(r.createdAt)}
                </p>
              </div>
              <a
                href={`${explorerBase}/tx/${r.txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-emerald-400 transition-colors shrink-0"
                title="View on AlgoExplorer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Verification checklist ───────────────────────────────────────────────────

function ChecklistCard({
  hasDbRecord,
  hasBlockchainAnchor,
  hasOnChainAsset,
  isConsistent,
  indexerError,
  assetRevoked,
}: {
  hasDbRecord: boolean;
  hasBlockchainAnchor: boolean;
  hasOnChainAsset: boolean;
  isConsistent: boolean;
  indexerError: boolean;
  assetRevoked: boolean;
}) {
  const checks: Array<{
    label: string;
    status: "pass" | "fail" | "warn" | "skip";
    detail: string;
  }> = [
    {
      label: "SHIELD registry record",
      status: hasDbRecord ? "pass" : "fail",
      detail: hasDbRecord
        ? "Asset found in the SHIELD platform database."
        : "No record found in the SHIELD database.",
    },
    {
      label: "On-chain proof",
      status: hasBlockchainAnchor ? "pass" : "warn",
      detail: hasBlockchainAnchor
        ? "At least one Algorand transaction anchors this asset."
        : "No blockchain anchor found. Asset may not be tokenised yet.",
    },
    {
      label: "Live Algorand ASA",
      status: indexerError ? "skip" : hasOnChainAsset ? "pass" : "warn",
      detail: indexerError
        ? "Algorand Indexer unreachable - could not verify live."
        : hasOnChainAsset
        ? "ASA exists and is active on Algorand."
        : "No active ASA found for this asset on Algorand.",
    },
    {
      label: "Metadata consistency",
      status: !hasOnChainAsset ? "skip" : isConsistent ? "pass" : "fail",
      detail: !hasOnChainAsset
        ? "Cannot check - no on-chain asset found."
        : isConsistent
        ? "On-chain asset metadata matches SHIELD registry."
        : "Metadata mismatch between on-chain and SHIELD registry.",
    },
    {
      label: "Asset not revoked",
      status: assetRevoked ? "fail" : "pass",
      detail: assetRevoked
        ? "This asset has been revoked or retired. It is no longer valid."
        : "Asset is in active/registered state.",
    },
  ];

  return (
    <div className="mt-5 bg-[#111118] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-blue-400" />
        <h2 className="text-sm font-semibold text-white">Verification Checklist</h2>
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {checks.map((check) => (
          <li key={check.label} className="flex items-start gap-3 px-5 py-3">
            <CheckIcon status={check.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">{check.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function CheckIcon({ status }: { status: "pass" | "fail" | "warn" | "skip" }) {
  if (status === "pass")
    return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
  if (status === "fail")
    return <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />;
  if (status === "warn")
    return <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />;
  return <Clock className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />;
}

function MetaField({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2 min-w-0">
      <span className="text-gray-500 flex items-center gap-1.5 shrink-0 text-xs">
        {icon}
        {label}
      </span>
      <span className="text-gray-300 text-xs text-right">{children}</span>
    </div>
  );
}
