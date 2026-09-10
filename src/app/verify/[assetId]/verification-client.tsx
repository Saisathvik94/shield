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
  Layers,
  Activity,
  ArrowRight,
} from "lucide-react";
import { classificationColor, relativeTime, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { TechnicalDetails } from "@/components/ui/technical-details";
import { CopyButton } from "@/components/dashboard/copy-button";

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

// ─── Main Component ───────────────────────────────────────────────────────────

import { ThemeToggle } from "@/components/ui/theme-toggle";

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

  const technicalItems = [
    { label: "Asset Identifier", value: asset.assetId, copyable: true },
    ...(asset.algorandAssetId
      ? [
          {
            label: "Algorand ASA Index",
            value: asset.algorandAssetId,
            copyable: true,
            href: `https://testnet.explorer.perawallet.app/asset/${asset.algorandAssetId}`,
          },
        ]
      : []),
    ...(asset.blockchainTxId
      ? [
          {
            label: "Anchor Transaction ID",
            value: asset.blockchainTxId,
            copyable: true,
            href: `https://testnet.explorer.perawallet.app/tx/${asset.blockchainTxId}`,
          },
        ]
      : []),
    ...(asset.ipfsCid
      ? [
          {
            label: "IPFS Document CID",
            value: asset.ipfsCid,
            copyable: true,
            href: `https://ipfs.io/ipfs/${asset.ipfsCid}`,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090a10] px-4 py-12 text-slate-800 dark:text-slate-200 transition-colors">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* SHIELD Global Branding */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 shadow-md shadow-blue-500/20">
              <Shield className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight">SHIELD</span>
            <span className="text-slate-500 text-xs hidden sm:inline">/ Public Asset Verification</span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {!isAuthenticated && (
              <Link
                href="/login"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                Sign in →
              </Link>
            )}
          </div>
        </div>

        {/* Verification Status Verdict Banner */}
        <VerificationVerdictBanner
          status={verificationStatus}
          isConsistent={isConsistent}
          indexerError={indexerError}
          assetId={assetId}
          isRevoked={asset.status === "REVOKED" || asset.status === "RETIRED"}
        />

        {/* Asset Passport Card */}
        <div className="rounded-2xl bg-white dark:bg-[#0f1017] border border-slate-200 dark:border-white/[0.08] overflow-hidden shadow-sm dark:shadow-xl">
          {/* Classification accent bar */}
          <div
            className={cn(
              "h-1.5 w-full",
              asset.classification === "CRITICAL"
                ? "bg-rose-500"
                : asset.classification === "SECRET"
                ? "bg-amber-500"
                : asset.classification === "CONFIDENTIAL"
                ? "bg-blue-500"
                : "bg-slate-500"
            )}
          />

          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">{asset.assetId}</span>
                  <span className={cn("text-xs px-2.5 py-0.5 rounded-md font-semibold", cls.className)}>
                    {cls.label}
                  </span>
                  <StatusBadge status={asset.status} />
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{asset.name}</h1>
                {asset.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">{asset.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Metadata Rows */}
          <div className="border-t border-slate-100 dark:border-white/[0.06] p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <MetaRow icon={<Building2 className="w-3.5 h-3.5" />} label="Organization">
              <span className="font-semibold text-slate-900 dark:text-white">{asset.organization.name}</span>
            </MetaRow>
            <MetaRow icon={<Package className="w-3.5 h-3.5" />} label="Asset Type">
              <span className="font-medium text-slate-900 dark:text-white">{asset.assetType.replace(/_/g, " ")}</span>
            </MetaRow>
            {asset.department && (
              <MetaRow icon={<Layers className="w-3.5 h-3.5" />} label="Department">
                <span className="font-medium text-slate-900 dark:text-white">
                  {asset.department}
                  {asset.section && <span className="text-slate-500 font-normal"> → {asset.section}</span>}
                </span>
              </MetaRow>
            )}
            {asset.owner && (
              <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Assigned Owner">
                <span className="font-medium text-slate-900 dark:text-white">{asset.owner.name}</span>
              </MetaRow>
            )}
            {asset.custodian && (
              <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Active Custodian">
                <span className="font-medium text-slate-900 dark:text-white">{asset.custodian.name}</span>
              </MetaRow>
            )}
            {asset.location && (
              <MetaRow icon={<MapPin className="w-3.5 h-3.5" />} label="Physical Location">
                <span className="font-medium text-slate-900 dark:text-white">{asset.location}</span>
              </MetaRow>
            )}
            {asset.physicalIdentifier && (
              <MetaRow icon={<Hash className="w-3.5 h-3.5" />} label="Physical Tag">
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{asset.physicalIdentifier}</span>
              </MetaRow>
            )}
            <MetaRow icon={<Calendar className="w-3.5 h-3.5" />} label="Registered Date">
              <span className="text-slate-500 dark:text-slate-400">{relativeTime(asset.createdAt)}</span>
            </MetaRow>
          </div>
        </div>

        {/* 5-Point Trust & Integrity Checklist */}
        <ChecklistCard
          hasDbRecord={true}
          hasBlockchainAnchor={blockchainRecords.length > 0}
          hasOnChainAsset={!!onChainInfo && !onChainInfo.deleted}
          isConsistent={isConsistent}
          indexerError={indexerError}
          assetRevoked={asset.status === "REVOKED" || asset.status === "RETIRED"}
        />

        {/* Live Algorand Ledger Inspection */}
        {onChainInfo && (
          <AlgorandLiveCard info={onChainInfo} isConsistent={isConsistent} />
        )}

        {/* Technical Details & Proofs */}
        <TechnicalDetails
          title="Cryptographic Proofs & Blockchain Hashes"
          description="Direct on-chain references for independent verification."
          items={technicalItems}
        />

        {/* Unauthenticated Onboarding Prompt */}
        {!isAuthenticated && (
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/[0.04] border border-blue-200 dark:border-blue-500/20 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Verify and manage institutional assets with SHIELD
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect your Algorand wallet to access digital identity credentials, manage authorized assets, and perform tamper-proof transfers.
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm"
                >
                  <span>Connect Wallet Identity</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 text-center space-y-1">
          <p className="text-xs text-slate-500">
            Cryptographically anchored on Algorand TestNet · IPFS Decentralized Storage
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-600">
            Verified by{" "}
            <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              SHIELD Enterprise Trust Platform
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Verification Verdict Banner ──────────────────────────────────────────────

function VerificationVerdictBanner({
  status,
  isConsistent,
  indexerError,
  assetId,
  isRevoked,
}: {
  status: "verified" | "partial" | "unregistered";
  isConsistent: boolean;
  indexerError: boolean;
  assetId: string;
  isRevoked: boolean;
}) {
  if (isRevoked) {
    return (
      <div className="flex items-start gap-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 p-5">
        <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-rose-900 dark:text-rose-300 text-base">
            Asset Decommissioned or Revoked
          </p>
          <p className="text-xs text-rose-700 dark:text-rose-400/90 leading-relaxed">
            <span className="font-mono font-bold text-slate-900 dark:text-white">{assetId}</span> is marked as retired or revoked in the SHIELD registry. This asset should no longer be treated as operational.
          </p>
        </div>
      </div>
    );
  }

  if (status === "verified" && isConsistent) {
    return (
      <div className="flex items-start gap-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 p-5">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-emerald-900 dark:text-emerald-300 text-base">
            Authenticity &amp; Integrity Verified
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400/90 leading-relaxed">
            <span className="font-mono font-bold text-slate-900 dark:text-white">{assetId}</span> is anchored on the Algorand blockchain. Ownership, lifecycle state, and cryptographic proofs are authentic.
          </p>
        </div>
      </div>
    );
  }

  if (status === "partial") {
    return (
      <div className="flex items-start gap-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 p-5">
        <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-900 dark:text-amber-300 text-base">
            Partial Verification
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400/90 leading-relaxed">
            This asset exists in the institutional registry with recorded transactions, but live on-chain tokenization could not be fully matched.
            {indexerError && " (Algorand Indexer temporary response timeout)"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 p-5">
      <Fingerprint className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="font-semibold text-blue-900 dark:text-blue-300 text-base">
          Registered in SHIELD Institutional Registry
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-400/90 leading-relaxed">
          <span className="font-mono font-bold text-slate-900 dark:text-white">{assetId}</span> has a valid organizational record. Tokenization to Algorand is currently pending.
        </p>
      </div>
    </div>
  );
}

// ─── 5-Point Verification Checklist ───────────────────────────────────────────

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
      label: "Institutional Database Registry",
      status: hasDbRecord ? "pass" : "fail",
      detail: hasDbRecord
        ? "Verified organization record found in SHIELD database."
        : "No registered record found.",
    },
    {
      label: "Algorand Blockchain Anchor",
      status: hasBlockchainAnchor ? "pass" : "warn",
      detail: hasBlockchainAnchor
        ? "Cryptographic transactions confirm immutable state anchoring."
        : "No blockchain anchor found yet.",
    },
    {
      label: "Live Algorand ASA Status",
      status: indexerError ? "skip" : hasOnChainAsset ? "pass" : "warn",
      detail: indexerError
        ? "Indexer timeout - verified from cached consensus records."
        : hasOnChainAsset
        ? "Active Algorand Standard Asset (ASA) live on TestNet."
        : "ASA token has not been minted yet.",
    },
    {
      label: "Metadata Consistency Check",
      status: !hasOnChainAsset ? "skip" : isConsistent ? "pass" : "fail",
      detail: !hasOnChainAsset
        ? "Skipped - asset not yet tokenized."
        : isConsistent
        ? "On-chain metadata matches registry parameters exactly."
        : "Checksum discrepancy detected between on-chain ASA and registry.",
    },
    {
      label: "Lifecycle State Validity",
      status: assetRevoked ? "fail" : "pass",
      detail: assetRevoked
        ? "Asset is revoked or decommissioned."
        : "Asset is active, registered, and valid.",
    },
  ];

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0f1017] border border-slate-200 dark:border-white/[0.08] overflow-hidden shadow-sm dark:shadow-none">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xs font-bold text-slate-900 dark:text-white">Trust &amp; Verification Checklist</h2>
        </div>
        <span className="text-[11px] text-slate-500">5-point integrity audit</span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
        {checks.map((check) => (
          <div key={check.label} className="flex items-start gap-3.5 px-5 py-3.5">
            <CheckIcon status={check.status} />
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">{check.label}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live Algorand Card ───────────────────────────────────────────────────────

function AlgorandLiveCard({
  info,
  isConsistent,
}: {
  info: OnChainInfo;
  isConsistent: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#0f1017] border border-slate-200 dark:border-white/[0.08] overflow-hidden shadow-sm dark:shadow-none">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xs font-bold text-slate-900 dark:text-white">Live Algorand ASA Inspection</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">TestNet Consensus Live</span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
        <MetaRow icon={<Hash className="w-3.5 h-3.5" />} label="ASA ID">
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">#{info.assetId}</span>
        </MetaRow>
        <MetaRow icon={<Package className="w-3.5 h-3.5" />} label="Unit Name">
          <span className="font-mono text-slate-900 dark:text-white font-medium">{info.unitName || "-"}</span>
        </MetaRow>
        <MetaRow icon={<Activity className="w-3.5 h-3.5" />} label="Total Supply">
          <span className="text-slate-900 dark:text-white font-medium">{info.total} unit (Non-fungible)</span>
        </MetaRow>
        {info.createdAtRound && (
          <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="Mint Round">
            <span className="font-mono text-slate-700 dark:text-slate-300">#{info.createdAtRound.toLocaleString()}</span>
          </MetaRow>
        )}
        <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Creator Address">
          <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
            {info.creator.slice(0, 10)}...{info.creator.slice(-6)}
          </span>
        </MetaRow>
      </div>

      <div className="px-5 pb-4 pt-1 flex items-center justify-between border-t border-slate-100 dark:border-white/[0.04]">
        <a
          href={`https://testnet.explorer.perawallet.app/asset/${info.assetId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>View on Pera Explorer</span>
        </a>

        {info.url && (
          <a
            href={info.url.replace("ipfs://", "https://ipfs.io/ipfs/").replace("#arc3", "")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Metadata Payload</span>
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CheckIcon({ status }: { status: "pass" | "fail" | "warn" | "skip" }) {
  if (status === "pass")
    return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />;
  if (status === "fail")
    return <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />;
  if (status === "warn")
    return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />;
  return <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />;
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 min-w-0">
      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0 text-xs">
        {icon}
        {label}
      </span>
      <div className="text-right truncate">{children}</div>
    </div>
  );
}
