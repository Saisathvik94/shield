"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Package,
  Shield,
  ShieldCheck,
  FileText,
  CloudUpload,
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  MapPin,
  User,
  Calendar,
  Activity,
  FileCheck2,
  AlertTriangle,
  QrCode,
  ChevronDown,
  ChevronUp,
  Download,
  Link2,
  Zap,
  ArrowRightLeft,
  ThumbsUp,
  ThumbsDown,
  Archive,
  Fingerprint,
  Layers,
  FileSpreadsheet,
  Lock,
  History,
  KeyRound,
} from "lucide-react";
import { uploadAssetDocument, verifyFileIntegrity } from "@/lib/ipfs/ipfs-actions";
import {
  uploadDocumentVersionAction,
  verifyDocumentIntegrityAction,
  simulateDocumentTamperAction,
} from "@/lib/actions/document-actions";
import { grantAssetAccess, revokeAssetAccess } from "@/lib/actions/asset-actions";
import { tokeniseAsset } from "@/lib/algorand/algorand-actions";
import {
  requestTransfer,
  approveTransfer,
  rejectTransfer,
  retireAsset,
} from "@/lib/actions/transfer-actions";
import { evaluateAssetRiskAction } from "@/lib/actions/risk-actions";
import {
  createApprovalRequestAction,
  signApprovalRequestAction,
  rejectApprovalRequestAction,
} from "@/lib/actions/approval-actions";
import { useWallet } from "@/lib/wallet/wallet-context";
import type { RiskEvaluationResult } from "@/lib/risk/types";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TechnicalDetails } from "@/components/ui/technical-details";
import { EmptyState } from "@/components/ui/empty-state";
import { classificationColor, formatBytes, relativeTime, shortAddress, cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssetData {
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
  organization: { id: string; name: string; slug: string };
  owner: { id: string; name: string; email: string } | null;
  custodian: { id: string; name: string; email: string } | null;
  department: string | null;
  section: string | null;
  transferToUserId: string | null;
  transferReason: string | null;
}

interface OrgMember {
  id: string;
  name: string;
  email: string;
}

interface AssetAccess {
  user: OrgMember;
}

export interface DocumentVersionData {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256Hash: string;
  ipfsCid: string;
  changeReason?: string | null;
  isCurrent: boolean;
  blockchainTxId?: string | null;
  uploadedAt: string;
  uploadedBy?: { name: string; email: string } | null;
}

interface IpfsObjectData {
  id: string;
  cid: string;
  gatewayUrl: string | null;
  objectType: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  sha256Hash: string | null;
  createdAt: string;
  uploadedBy: { name: string; email: string } | null;
}

interface BlockchainRecordData {
  id: string;
  txId: string;
  confirmedRound: string | null;
  recordType: string;
  algorandAssetId: string | null;
  network: string;
  notePayload: string | null;
  createdAt: string;
  actor: { name: string } | null;
}

interface AuditEventData {
  id: string;
  eventType: string;
  description: string | null;
  blockchainTxId: string | null;
  ipfsCid: string | null;
  createdAt: string;
  actor: { name: string } | null;
}

interface Props {
  orgId: string;
  canManage: boolean;
  isOwnerOrAdmin: boolean;
  currentUserId: string;
  currentUserWallet?: string | null;
  initialRiskEvaluation?: RiskEvaluationResult | null;
  pendingApproval?: any | null;
  asset: AssetData;
  orgMembers: OrgMember[];
  access: AssetAccess[];
  ipfsObjects: IpfsObjectData[];
  documentVersions?: DocumentVersionData[];
  blockchainRecords: BlockchainRecordData[];
  auditEvents: AuditEventData[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AssetPassportClient({
  orgId,
  canManage,
  isOwnerOrAdmin,
  currentUserId,
  currentUserWallet,
  initialRiskEvaluation = null,
  pendingApproval = null,
  asset,
  orgMembers,
  ipfsObjects,
  documentVersions = [],
  blockchainRecords,
  auditEvents,
  access,
}: Props) {
  const router = useRouter();
  const cls = classificationColor(asset.classification);
  const isActive = !["REVOKED", "RETIRED"].includes(asset.status);
  const isPendingTransfer = asset.status === "TRANSFER_REQUESTED";

  const [riskResult, setRiskResult] = useState<RiskEvaluationResult | null>(initialRiskEvaluation);
  const [isEvaluatingRisk, setIsEvaluatingRisk] = useState(false);
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [approval, setApproval] = useState<any | null>(pendingApproval);

  async function handleReevaluateRisk() {
    setIsEvaluatingRisk(true);
    try {
      const res = await evaluateAssetRiskAction({
        assetId: asset.id,
        organizationId: orgId,
        action: "ASSET_ACCESS",
      });
      if (res.success && res.data) {
        setRiskResult(res.data);
        toast.success("Risk & Trust Score re-evaluated against latest evidence.");
      } else {
        toast.error(res.error || "Failed to evaluate risk");
      }
    } catch (e: any) {
      toast.error(e.message || "Risk evaluation failed");
    } finally {
      setIsEvaluatingRisk(false);
    }
  }

  const technicalItems = [
    { label: "Internal Database ID", value: asset.id },
    { label: "SHIELD Asset ID", value: asset.assetId, copyable: true },
    ...(asset.algorandAssetId
      ? [
          {
            label: "Algorand ASA ID",
            value: asset.algorandAssetId,
            copyable: true,
            href: `https://testnet.explorer.perawallet.app/asset/${asset.algorandAssetId}`,
          },
        ]
      : []),
    ...(asset.blockchainTxId
      ? [
          {
            label: "Registration TXID",
            value: asset.blockchainTxId,
            copyable: true,
            href: `https://testnet.explorer.perawallet.app/tx/${asset.blockchainTxId}`,
          },
        ]
      : []),
    ...(asset.ipfsCid
      ? [
          {
            label: "Primary Document CID",
            value: asset.ipfsCid,
            copyable: true,
            href: `https://ipfs.io/ipfs/${asset.ipfsCid}`,
          },
        ]
      : []),
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb back */}
      <Link
        href={`/dashboard/orgs/${orgId}/assets`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Assets Registry
      </Link>

      {/* Asset Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0f1017] border border-slate-200 dark:border-white/[0.08] shadow-sm transition-colors">
        {/* Top Accent Stripe based on classification */}
        <div
          className={cn(
            "h-1.5 w-full",
            asset.classification === "CRITICAL"
              ? "bg-rose-500"
              : asset.classification === "SECRET"
              ? "bg-amber-500"
              : asset.classification === "CONFIDENTIAL"
              ? "bg-blue-500"
              : "bg-slate-400 dark:bg-slate-600"
          )}
        />

        <div className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                <Package className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                    {asset.assetId}
                  </span>
                  <span className={cn("text-xs px-2.5 py-0.5 rounded-md font-semibold", cls.className)}>
                    {cls.label}
                  </span>
                  <StatusBadge status={asset.status} />
                </div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">{asset.name}</h1>
                {asset.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{asset.description}</p>
                )}
              </div>
            </div>

            {/* Quick Actions & Verify Button */}
            <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
              <Link
                href={`/verify/${asset.assetId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs"
              >
                <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Public Verification</span>
                <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              </Link>

              {canManage && !asset.algorandAssetId && isActive && (
                <TokeniseButton assetDbId={asset.id} />
              )}
            </div>
          </div>

          {/* Trust Checklist Banner (§14) */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
              {asset.algorandAssetId ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Shield className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">Algorand ASA</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {asset.algorandAssetId ? `Tokenized (ASA #${asset.algorandAssetId})` : "Not yet tokenized"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
              {asset.ipfsCid ? (
                <FileCheck2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              ) : (
                <FileText className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">Document Integrity</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {asset.ipfsCid ? `${ipfsObjects.length} file(s) on IPFS` : "No IPFS files anchored"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">Lifecycle State</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {asset.status === "ACTIVE" ? "Operational & Verified" : asset.status.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* P1: Deterministic Risk & Trust Engine Banner */}
      {riskResult && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0f1017] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center font-bold font-mono text-base border shrink-0",
                riskResult.riskScore <= 20
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                  : riskResult.riskScore <= 50
                  ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                  : riskResult.riskScore <= 75
                  ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                  : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
              )}>
                {riskResult.trustScore}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Deterministic Risk & Trust Assessment
                  </h3>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                    riskResult.riskLevel === "LOW"
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                      : riskResult.riskLevel === "MODERATE"
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                      : riskResult.riskLevel === "ELEVATED" || riskResult.riskLevel === "HIGH"
                      ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                      : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                  )}>
                    {riskResult.riskLevel} RISK ({riskResult.riskScore}/100)
                  </span>

                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-md",
                    riskResult.decision === "ALLOW"
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                      : riskResult.decision === "REQUIRE_APPROVAL"
                      ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                      : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                  )}>
                    Policy Decision: {riskResult.decision}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Calculated from cryptographic hashes, DID credentials, and immutable on-chain proofs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRiskModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Inspect Signals ({riskResult.signals.filter((s) => s.detected).length})
              </button>

              <button
                type="button"
                disabled={isEvaluatingRisk}
                onClick={handleReevaluateRisk}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isEvaluatingRisk ? "Evaluating..." : "Re-evaluate Proofs"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata & Technical Proofs */}
        <div className="lg:col-span-1 space-y-6">
          <PassportMetadata asset={asset} />
          <TechnicalDetails
            title="Cryptographic & Chain Proofs"
            description="Algorand ASA, transaction hashes, and IPFS CIDs for this asset."
            items={technicalItems}
          />
        </div>

        {/* Right Column: Workflows, Documents, Access, History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transfer & Approval Workflow */}
          {isActive && (
            <TransferPanel
              asset={asset}
              orgId={orgId}
              orgMembers={orgMembers}
              canManage={canManage}
              isOwnerOrAdmin={isOwnerOrAdmin}
              currentUserId={currentUserId}
              currentUserWallet={currentUserWallet}
              approval={approval}
              onApprovalUpdate={(updated) => setApproval(updated)}
            />
          )}

          {/* IPFS Documents & Tamper Verifier */}
          <DocumentsPanel
            orgId={orgId}
            assetDbId={asset.id}
            ipfsObjects={ipfsObjects}
            documentVersions={documentVersions}
            canManage={canManage}
          />

          {/* Access Control List */}
          <AccessPanel
            assetDbId={asset.id}
            access={access}
            orgMembers={orgMembers}
            canManage={canManage}
          />

          {/* Blockchain & Event History */}
          {blockchainRecords.length > 0 && <BlockchainPanel records={blockchainRecords} />}
          <AuditPanel events={auditEvents} />

          {/* Danger Zone */}
          {isOwnerOrAdmin && isActive && !isPendingTransfer && (
            <DangerZone assetDbId={asset.id} assetLabel={asset.assetId} />
          )}
        </div>
      </div>

      {/* P1 Risk Signals Inspector Modal */}
      <RiskSignalsModal
        open={riskModalOpen}
        onClose={() => setRiskModalOpen(false)}
        result={riskResult}
      />
    </div>
  );
}

// ─── Metadata Card ────────────────────────────────────────────────────────────

function PassportMetadata({ asset }: { asset: AssetData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Asset Identity
        </CardTitle>
        <CardDescription>Core organizational metadata &amp; custodial assignment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3.5 text-xs">
        <MetaRow icon={<Package className="w-3.5 h-3.5" />} label="Asset Type">
          <span className="font-medium text-slate-900 dark:text-white">{asset.assetType.replace(/_/g, " ")}</span>
        </MetaRow>

        {asset.organization && (
          <MetaRow icon={<Link2 className="w-3.5 h-3.5" />} label="Organization">
            <span className="font-medium text-slate-900 dark:text-white">{asset.organization.name}</span>
          </MetaRow>
        )}

        {asset.department && (
          <MetaRow icon={<Layers className="w-3.5 h-3.5" />} label="Department">
            <span className="font-medium text-slate-900 dark:text-white">
              {asset.department}
              {asset.section && <span className="text-slate-400 dark:text-slate-500 font-normal"> → {asset.section}</span>}
            </span>
          </MetaRow>
        )}

        {asset.owner && (
          <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Owner">
            <span className="font-medium text-slate-900 dark:text-white">{asset.owner.name}</span>
          </MetaRow>
        )}

        {asset.custodian && (
          <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Custodian">
            <span className="font-medium text-slate-900 dark:text-white">{asset.custodian.name}</span>
          </MetaRow>
        )}

        {asset.location && (
          <MetaRow icon={<MapPin className="w-3.5 h-3.5" />} label="Physical Location">
            <span className="font-medium text-slate-900 dark:text-white">{asset.location}</span>
          </MetaRow>
        )}

        {asset.physicalIdentifier && (
          <MetaRow icon={<Fingerprint className="w-3.5 h-3.5" />} label="Serial / Tag">
            <span className="font-mono text-slate-700 dark:text-slate-300">{asset.physicalIdentifier}</span>
          </MetaRow>
        )}

        <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2.5">
          <MetaRow icon={<Calendar className="w-3.5 h-3.5" />} label="Registered">
            <span className="text-slate-500 dark:text-slate-400">{relativeTime(asset.createdAt)}</span>
          </MetaRow>
          <MetaRow icon={<History className="w-3.5 h-3.5" />} label="Last Updated">
            <span className="text-slate-500 dark:text-slate-400">{relativeTime(asset.updatedAt)}</span>
          </MetaRow>
        </div>
      </CardContent>
    </Card>
  );
}
// ─── Transfer & Custody Workflow Panel ─────────────────────────────────────────

function TransferPanel({
  asset,
  orgId,
  orgMembers,
  canManage,
  isOwnerOrAdmin,
  currentUserId,
  currentUserWallet,
  approval,
  onApprovalUpdate,
}: {
  asset: AssetData;
  orgId: string;
  orgMembers: OrgMember[];
  canManage: boolean;
  isOwnerOrAdmin: boolean;
  currentUserId: string;
  currentUserWallet?: string | null;
  approval?: any | null;
  onApprovalUpdate?: (updated: any) => void;
}) {
  const router = useRouter();
  const { address, signData } = useWallet();
  const [requestPending, startRequest] = useTransition();
  const [approvePending, startApprove] = useTransition();
  const [rejectPending, startReject] = useTransition();
  const [signPending, setSignPending] = useTransition();
  const [toUserId, setToUserId] = useState("");
  const [reason, setReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const effectiveWallet = address || currentUserWallet;
  const isPending = asset.status === "TRANSFER_REQUESTED";
  const eligibleTargets = orgMembers.filter(
    (m) => m.id !== asset.custodian?.id && m.id !== currentUserId
  );

  const transferTargetName = asset.transferToUserId
    ? orgMembers.find((m) => m.id === asset.transferToUserId)?.name ?? "Unknown member"
    : approval?.requestedCustodian?.name ?? "Unknown member";

  function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!toUserId || !reason.trim()) return;

    startRequest(async () => {
      // If critical/secret or confidential, enforce M-of-N Quorum
      if (asset.classification === "SECRET" || asset.classification === "CONFIDENTIAL" || asset.classification === "CRITICAL") {
        const res = await createApprovalRequestAction({
          organizationId: orgId,
          assetId: asset.id,
          action: "ASSET_TRANSFER",
          requestedCustodianId: toUserId,
          customParams: { reason },
        });

        if (res.success && res.data) {
          toast.success("M-of-N Quorum Approval initiated on Algorand TestNet.", {
            description: `Requires cryptographic signatures before custody transfer takes effect.`,
          });
          setShowForm(false);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to create approval request");
        }
      } else {
        const r = await requestTransfer(asset.id, toUserId, reason);
        if (r.status === "success") {
          toast.success("Custody transfer requested.");
          setShowForm(false);
          router.refresh();
        } else toast.error(r.message);
      }
    });
  }

  // Sign M-of-N Quorum with Pera Wallet
  function handleSignQuorum() {
    if (!approval) return;
    if (!effectiveWallet) {
      toast.error("Please connect your Algorand wallet (Pera Wallet) to sign.");
      return;
    }

    setSignPending(async () => {
      try {
        let signatureHex: string;
        if (signData && address) {
          const enc = new TextEncoder();
          const dataBytes = enc.encode(approval.actionDigest);
          const signedRes = await signData(
            [{ data: dataBytes, message: `SHIELD Quorum Approval: ASSET_TRANSFER` }],
            address
          );
          if (!signedRes || signedRes.length === 0 || !signedRes[0]) {
            throw new Error("Wallet signature rejected");
          }
          signatureHex = Buffer.from(signedRes[0]).toString("hex");
        } else {
          const msgBytes = new TextEncoder().encode(approval.actionDigest);
          const hashBuffer = await crypto.subtle.digest("SHA-256", msgBytes);
          signatureHex = Buffer.from(hashBuffer).toString("hex") + Buffer.from(hashBuffer).toString("hex");
        }

        const res = await signApprovalRequestAction({
          approvalRequestId: approval.id,
          walletAddress: effectiveWallet,
          signatureHex,
          actionDigest: approval.actionDigest,
        });

        if (res.success) {
          toast.success("Cryptographic signature recorded!", {
            description: res.data?.finalized
              ? "Quorum reached & settlement anchored on Algorand TestNet."
              : `Current progress: ${res.data?.currentApprovals}/${res.data?.requiredApprovals}`,
          });
          if (onApprovalUpdate) onApprovalUpdate(res.data);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to record signature");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to sign approval request");
      }
    });
  }

  function handleApprove() {
    startApprove(async () => {
      const r = await approveTransfer(asset.id);
      if (r.status === "success") {
        toast.success("Custody transfer approved & completed.");
        router.refresh();
      } else toast.error(r.message);
    });
  }

  function handleReject(e: React.FormEvent) {
    e.preventDefault();
    startReject(async () => {
      if (approval) {
        const res = await rejectApprovalRequestAction({
          approvalRequestId: approval.id,
          reason: rejectReason || "No reason provided",
        });
        if (res.success) {
          toast.success("Approval request rejected.");
          setShowRejectForm(false);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to reject approval request");
        }
      } else {
        const r = await rejectTransfer(asset.id, rejectReason || "No reason provided");
        if (r.status === "success") {
          toast.success("Custody transfer request rejected.");
          setShowRejectForm(false);
          router.refresh();
        } else toast.error(r.message);
      }
    });
  }

  if (isPending || (approval && approval.status === "PENDING")) {
    const signatures = approval?.signatures || [];
    const requiredApprovals = approval?.requiredApprovals || 2;
    const isSignedByMe = signatures.some(
      (s: any) => s.approverId === currentUserId || s.approverWallet === effectiveWallet
    );
    const progressPct = Math.min(100, Math.round((signatures.length / requiredApprovals) * 100));

    return (
      <Card className="border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/[0.03]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              {approval ? "M-of-N Cryptographic Quorum Pending" : "Transfer Pending Approval"}
            </CardTitle>
            <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-200">
              {signatures.length} / {requiredApprovals} Signatures
            </span>
          </div>
          <CardDescription>
            {approval
              ? "Multi-party authorization required before custody transfer takes effect on Algorand."
              : "A request to transfer custody of this asset is awaiting administrative review."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-amber-100/60 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 space-y-2">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              Target Custodian: <span className="text-slate-900 dark:text-white font-bold">{transferTargetName}</span>
            </p>
            {(asset.transferReason || approval?.actionDigest) && (
              <p className="text-xs text-amber-800 dark:text-amber-300/80">
                Reason: {asset.transferReason || "Multi-party transfer requested"}
              </p>
            )}

            {/* Quorum Progress */}
            {approval && (
              <div className="pt-2 space-y-1.5">
                <div className="h-2 w-full bg-amber-200/60 dark:bg-white/[0.1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-600 dark:bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                {signatures.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] uppercase font-bold text-amber-900 dark:text-amber-300 block">
                      Signed By ({signatures.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {signatures.map((s: any) => (
                        <span
                          key={s.id}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-200/80 dark:bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-300/60 dark:border-amber-500/30 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          {s.approver?.name || shortAddress(s.approverWallet, 4)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!showRejectForm && (
            <div className="flex flex-wrap gap-3">
              {approval ? (
                !isSignedByMe ? (
                  <Button
                    variant="primary"
                    loading={signPending}
                    icon={<KeyRound className="w-4 h-4" />}
                    onClick={handleSignQuorum}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    Sign with Pera Wallet
                  </Button>
                ) : (
                  <div className="flex-1 px-4 py-2 rounded-xl bg-emerald-100/70 dark:bg-emerald-500/10 border border-emerald-300/60 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    You have signed this quorum request
                  </div>
                )
              ) : (
                isOwnerOrAdmin && (
                  <Button
                    variant="primary"
                    loading={approvePending}
                    icon={<ThumbsUp className="w-4 h-4" />}
                    onClick={handleApprove}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Approve Transfer
                  </Button>
                )
              )}

              {isOwnerOrAdmin && (
                <Button
                  variant="danger"
                  icon={<ThumbsDown className="w-4 h-4" />}
                  onClick={() => setShowRejectForm(true)}
                  className="shrink-0"
                >
                  Reject Request
                </Button>
              )}
            </div>
          )}

          {isOwnerOrAdmin && showRejectForm && (
            <form onSubmit={handleReject} className="space-y-3">
              <input
                autoFocus
                placeholder="Reason for rejection (recorded in audit log)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.10] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-red-500/50"
              />
              <div className="flex gap-2">
                <Button type="submit" variant="danger" loading={rejectPending} className="flex-1">
                  Confirm Rejection
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowRejectForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!canManage) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Custody Transfer
            </CardTitle>
            <CardDescription>
              {asset.classification === "SECRET" || asset.classification === "CONFIDENTIAL"
                ? "Initiates M-of-N cryptographic quorum approval before mutation."
                : "Reassign operational custody to another member."}
            </CardDescription>
          </div>
          {!showForm && (
            <Button
              size="sm"
              variant="secondary"
              icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
              onClick={() => setShowForm(true)}
            >
              Initiate Transfer
            </Button>
          )}
        </div>
      </CardHeader>
      {showForm && (
        <CardContent>
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">New Custodian</label>
              <select
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                required
                className="w-full rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.10] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500/60"
              >
                <option value="">- Select member -</option>
                {eligibleTargets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Reason for Transfer</label>
              <input
                autoFocus
                placeholder="e.g., Department reassignment, equipment handoff..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.10] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setToUserId("");
                  setReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={requestPending}
                disabled={!toUserId || !reason.trim()}
                icon={<ArrowRightLeft className="w-4 h-4" />}
              >
                Submit Transfer Request
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}

// ─── IPFS Documents & Tamper Verifier Panel ───────────────────────────────────

function DocumentsPanel({
  orgId,
  assetDbId,
  ipfsObjects,
  documentVersions = [],
  canManage,
}: {
  orgId: string;
  assetDbId: string;
  ipfsObjects: IpfsObjectData[];
  documentVersions?: DocumentVersionData[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"versions" | "ipfs" | "verify">("versions");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [tamperingId, setTamperingId] = useState<string | null>(null);
  const [integrityResults, setIntegrityResults] = useState<Record<string, { valid: boolean; tamperDetected: boolean; error?: string }>>({});

  const uploadRef = useRef<HTMLInputElement>(null);
  const verifyRef = useRef<HTMLInputElement>(null);
  const [verifyCid, setVerifyCid] = useState("");
  const [verifyResult, setVerifyResult] = useState<{
    status: "verified" | "tampered" | "not_found" | "error" | null;
    message?: string;
    sha256?: string;
  }>({ status: null });
  const [verifyPending, startVerify] = useTransition();

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("assetId", assetDbId);
      fd.append("organizationId", orgId);
      fd.append("changeReason", changeReason || "Updated version");
      if (selectedDocId) {
        fd.append("documentId", selectedDocId);
      }

      const res = await uploadDocumentVersionAction(fd);
      if (!res.success || !res.version) {
        toast.error(res.error || "Failed to upload document version");
        return;
      }

      toast.success(`Version v${res.version.versionNumber} uploaded & anchored to Algorand!`);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setChangeReason("");
      setSelectedDocId("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerifyVersionIntegrity = async (version: DocumentVersionData) => {
    setVerifyingId(version.id);
    try {
      const res = await verifyDocumentIntegrityAction(version.id);
      setIntegrityResults((prev) => ({
        ...prev,
        [version.id]: {
          valid: res.valid,
          tamperDetected: res.tamperDetected,
          error: res.error,
        },
      }));
      if (res.valid && !res.tamperDetected) {
        toast.success(`Integrity Verified: v${version.versionNumber} SHA-256 matches blockchain anchor!`);
      } else {
        toast.error(`TAMPER DETECTED on v${version.versionNumber}: Hash mismatch!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSimulateTamper = async (version: DocumentVersionData) => {
    setTamperingId(version.id);
    try {
      const res = await simulateDocumentTamperAction(version.id);
      if (res.success) {
        toast.warning(`Simulated Tampering: Hash altered for v${version.versionNumber}!`);
        // Immediately run verification check to demonstrate alert
        await handleVerifyVersionIntegrity(version);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Simulation failed");
    } finally {
      setTamperingId(null);
    }
  };

  function handleVerifyFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!verifyCid.trim()) {
      toast.error("Enter a CID first.");
      return;
    }
    const fd = new FormData();
    fd.append("file", files[0]);
    startVerify(async () => {
      const result = await verifyFileIntegrity(fd, verifyCid.trim());
      setVerifyResult(result);
      if (verifyRef.current) verifyRef.current.value = "";
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Document Versioning &amp; Cryptographic Integrity
            </CardTitle>
            <CardDescription>
              Multi-version audit history with SHA-256 hashes, IPFS pinning, and automated tamper detection.
            </CardDescription>
          </div>
          {canManage && (
            <Button
              size="sm"
              variant="primary"
              icon={<CloudUpload className="w-4 h-4" />}
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
            >
              Upload New Version
            </Button>
          )}
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 pt-2 border-b border-slate-100 dark:border-white/[0.06]">
          <button
            onClick={() => setActiveTab("versions")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "versions"
                ? "bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Version History ({documentVersions.length})
          </button>
          <button
            onClick={() => setActiveTab("verify")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "verify"
                ? "bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Tamper Detection Engine
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {activeTab === "versions" && (
          <div className="space-y-3">
            {documentVersions.length === 0 ? (
              <EmptyState
                icon={FileSpreadsheet}
                title="No document versions recorded"
                description="Upload the initial document version to establish cryptographic provenance and version tracking."
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {documentVersions.map((ver) => {
                  const check = integrityResults[ver.id];

                  return (
                    <div
                      key={ver.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/[0.1] transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-600 text-white">
                            v{ver.versionNumber}
                          </span>
                          {ver.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              CURRENT ACTIVE
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {ver.fileName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={verifyingId === ver.id}
                            icon={<FileCheck2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                            onClick={() => handleVerifyVersionIntegrity(ver)}
                            className="text-xs h-7 px-2.5"
                          >
                            Verify Integrity
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={tamperingId === ver.id}
                            icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                            onClick={() => handleSimulateTamper(ver)}
                            title="Simulate Tampering for live demo"
                            className="text-xs h-7 px-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                          >
                            Simulate Tamper
                          </Button>
                          <a
                            href={`https://ipfs.io/ipfs/${ver.ipfsCid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.06] transition-colors"
                            title="Download / View on IPFS"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Change Reason */}
                      {ver.changeReason && (
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Change Reason: </span>
                          {ver.changeReason}
                        </div>
                      )}

                      {/* Hashes & CIDs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/[0.04] truncate">
                          <span className="text-slate-400 font-sans">SHA-256: </span>
                          <span className="text-slate-800 dark:text-slate-200">{ver.sha256Hash}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/[0.04] truncate">
                          <span className="text-slate-400 font-sans">IPFS CID: </span>
                          <span className="text-slate-800 dark:text-slate-200">{ver.ipfsCid}</span>
                        </div>
                      </div>

                      {/* Integrity verification alert banner if checked */}
                      {check && (
                        <div
                          className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                            check.valid && !check.tamperDetected
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {check.valid && !check.tamperDetected ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>INTEGRITY VERIFIED: SHA-256 matches blockchain immutable anchor.</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                              <span>TAMPER DETECTED: {check.error || "File checksum does not match registered hash!"}</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Upload metadata */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-white/[0.04]">
                        <div>
                          Uploaded: {new Date(ver.uploadedAt).toLocaleString()}
                          {ver.uploadedBy && ` by ${ver.uploadedBy.name}`}
                        </div>
                        {ver.blockchainTxId && (
                          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-mono">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Algorand Tx: {ver.blockchainTxId.slice(0, 10)}...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "verify" && (
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Cryptographic File Checksum Validator
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload any document from your workstation to verify that its byte-level SHA-256 hash matches the IPFS CID anchor on Algorand.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                placeholder="Paste IPFS CID (e.g. Qm... or bafy...)"
                value={verifyCid}
                onChange={(e) => {
                  setVerifyCid(e.target.value);
                  setVerifyResult({ status: null });
                }}
                className="flex-1 min-w-0 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.10] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500/50 font-mono"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => verifyRef.current?.click()}
                disabled={verifyPending || !verifyCid.trim()}
                loading={verifyPending}
                icon={<FileCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              >
                Verify File
              </Button>
              <input
                ref={verifyRef}
                type="file"
                className="hidden"
                onChange={(e) => handleVerifyFile(e.target.files)}
              />
            </div>

            {verifyResult.status === "verified" && (
              <div className="flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Document Integrity Check: PASS
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400/80">
                    The local file matches the pinned IPFS record exactly with zero byte modification.
                  </p>
                  {verifyResult.sha256 && (
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-500/70 font-mono break-all pt-1">
                      SHA-256: {verifyResult.sha256}
                    </p>
                  )}
                </div>
              </div>
            )}

            {verifyResult.status === "tampered" && (
              <div className="flex items-start gap-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3.5">
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                    Integrity Check FAILED (Tampering Detected)
                  </p>
                  <p className="text-xs text-rose-700 dark:text-rose-400/80">{verifyResult.message}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload New Version Modal */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CloudUpload className="w-5 h-5 text-blue-600" />
                  Upload Document Version
                </h3>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUploadVersion} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Select File
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-600/20 dark:file:text-blue-300 hover:file:bg-blue-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Change Reason / Version Notes
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Updated compliance terms, refreshed technical diagram, renewed license..."
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-white/[0.08]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsUploadModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isUploading}
                    disabled={!selectedFile || isUploading}
                    icon={<CloudUpload className="w-3.5 h-3.5" />}
                  >
                    Upload &amp; Anchor on Algorand
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── File Item Row ────────────────────────────────────────────────────────────

function FileRow({
  obj,
  onSelectForVerify,
}: {
  obj: IpfsObjectData;
  onSelectForVerify: (cid: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100/70 dark:hover:bg-white/[0.04] transition-all overflow-hidden shadow-xs">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{obj.fileName ?? "Unnamed Document"}</p>
          <p className="text-[10px] text-slate-500 font-mono truncate">{obj.cid}</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {obj.fileSize != null && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatBytes(obj.fileSize)}</span>
          )}
          {obj.gatewayUrl && (
            <a
              href={obj.gatewayUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.06] transition-colors"
              title="Download from IPFS"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectForVerify(obj.cid);
            }}
            className="text-[11px] px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
          >
            Verify
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3.5 pt-2 border-t border-slate-200 dark:border-white/[0.04] bg-white dark:bg-white/[0.01] space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">IPFS CID</span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
              <span className="truncate max-w-[240px]">{obj.cid}</span>
              <button
                onClick={() => handleCopy(obj.cid)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {obj.sha256Hash && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">SHA-256</span>
              <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[240px]">
                {obj.sha256Hash}
              </span>
            </div>
          )}

          {obj.uploadedBy && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">Uploaded By</span>
              <span className="text-slate-800 dark:text-slate-300">{obj.uploadedBy.name}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">Pinned At</span>
            <span className="text-slate-600 dark:text-slate-400">{relativeTime(obj.createdAt)}</span>
          </div>

          {obj.gatewayUrl && (
            <div className="pt-1">
              <a
                href={obj.gatewayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline transition-colors font-medium"
              >
                <ExternalLink className="w-3 h-3" /> Open via Public IPFS Gateway
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Access Control Panel ─────────────────────────────────────────────────────

function AccessPanel({
  assetDbId,
  access,
  orgMembers,
  canManage,
}: {
  assetDbId: string;
  access: AssetAccess[];
  orgMembers: OrgMember[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [pending, startTransition] = useTransition();
  const grantedIds = new Set(access.map((grant) => grant.user.id));
  const availableMembers = orgMembers.filter((member) => !grantedIds.has(member.id));

  function handleGrant() {
    if (!selectedUserId) return;
    startTransition(async () => {
      const result = await grantAssetAccess(assetDbId, selectedUserId);
      if (result.status === "success") {
        toast.success("Asset access granted.");
        setSelectedUserId("");
        router.refresh();
      } else toast.error(result.message);
    });
  }

  function handleRevoke(user: OrgMember) {
    if (!confirm(`Revoke asset access for ${user.name}?`)) return;
    startTransition(async () => {
      const result = await revokeAssetAccess(assetDbId, user.id);
      if (result.status === "success") {
        toast.success("Asset access revoked.");
        router.refresh();
      } else toast.error(result.message);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Access Permissions
            </CardTitle>
            <CardDescription>Explicitly authorized organization members</CardDescription>
          </div>
          <Badge variant="default" className="text-xs">
            {access.length} member{access.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {access.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">
            No additional members have been granted direct asset access.
          </p>
        ) : (
          <div className="space-y-2">
            {access.map((grant) => (
              <div
                key={grant.user.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0">
                    {grant.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{grant.user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{grant.user.email}</p>
                  </div>
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => handleRevoke(grant.user)}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {canManage && availableMembers.length > 0 && (
          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 min-w-0 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.10] px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500/60"
            >
              <option value="">- Select member to grant access -</option>
              {availableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              loading={pending}
              disabled={!selectedUserId}
              onClick={handleGrant}
            >
              Grant Access
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Blockchain Proof Records Panel ───────────────────────────────────────────

function BlockchainPanel({ records }: { records: BlockchainRecordData[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Algorand Ledger Anchors
            </CardTitle>
            <CardDescription>Cryptographic transactions anchoring this asset state</CardDescription>
          </div>
          <Badge variant="success" className="text-xs">
            Algorand TestNet
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
          {records.map((r) => {
            const explorerBase =
              r.network === "testnet"
                ? "https://testnet.explorer.perawallet.app"
                : "https://explorer.perawallet.app";
            return (
              <li key={r.id} className="p-4 space-y-2 hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="text-[10px] font-mono">
                        {r.recordType.replace(/_/g, " ")}
                      </Badge>
                      {r.algorandAssetId && (
                        <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                          ASA #{r.algorandAssetId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-slate-800 dark:text-slate-300 truncate">TX: {r.txId}</p>
                    <p className="text-[11px] text-slate-500">
                      {r.confirmedRound && `Round #${r.confirmedRound} · `}
                      {relativeTime(r.createdAt)}
                      {r.actor && ` · by ${r.actor.name}`}
                    </p>
                  </div>
                  <a
                    href={`${explorerBase}/tx/${r.txId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors shrink-0"
                    title="View on Algorand Explorer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                {r.notePayload && (
                  <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.04] rounded-lg p-2 text-[10px] font-mono text-slate-600 dark:text-slate-400 break-all">
                    {r.notePayload}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Audit Trail Panel ────────────────────────────────────────────────────────

function AuditPanel({ events }: { events: AuditEventData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          Asset Activity Log
        </CardTitle>
        <CardDescription>Chronological log of lifecycle and state changes</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No activity recorded yet.</p>
        ) : (
          <div className="relative pl-6 space-y-4 border-l border-slate-200 dark:border-white/[0.08] ml-2">
            {events.map((event) => (
              <div key={event.id} className="relative group">
                {/* Dot */}
                <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 ring-4 ring-white dark:ring-[#0f1017]" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-900 dark:text-white">
                    {event.description ?? event.eventType.replace(/_/g, " ")}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>{relativeTime(event.createdAt)}</span>
                    {event.actor && <span>· by {event.actor.name}</span>}
                    {event.blockchainTxId && (
                      <Badge variant="success" className="text-[10px] py-0">
                        On-chain Proof
                      </Badge>
                    )}
                    {event.ipfsCid && (
                      <Badge variant="info" className="text-[10px] py-0">
                        IPFS
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────

function DangerZone({ assetDbId, assetLabel }: { assetDbId: string; assetLabel: string }) {
  const router = useRouter();
  const [retiring, startRetire] = useTransition();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  function handleRetire(e: React.FormEvent) {
    e.preventDefault();
    startRetire(async () => {
      const r = await retireAsset(assetDbId, reason || "End of lifecycle retirement");
      if (r.status === "success") {
        toast.success(`Asset ${assetLabel} has been retired.`);
        router.refresh();
      } else toast.error(r.message);
      setOpen(false);
    });
  }

  return (
    <Card className="border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/[0.02]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
          <Archive className="w-4 h-4" /> Danger Zone
        </CardTitle>
        <CardDescription>Irreversible lifecycle operations</CardDescription>
      </CardHeader>
      <CardContent>
        {!open ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Retire Asset</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Mark this asset as decommissioned / end-of-life. This cannot be reversed.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              icon={<Archive className="w-4 h-4" />}
              onClick={() => setOpen(true)}
            >
              Retire Asset
            </Button>
          </div>
        ) : (
          <form onSubmit={handleRetire} className="space-y-3">
            <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
              Confirm retirement for asset <span className="font-mono">{assetLabel}</span>
            </p>
            <input
              autoFocus
              placeholder="Retirement reason (e.g. decommissioned, damaged, end-of-life)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.10] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-rose-500/50"
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" size="sm" loading={retiring}>
                Confirm Retirement
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tokenise Button ──────────────────────────────────────────────────────────

function TokeniseButton({ assetDbId }: { assetDbId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleTokenise() {
    startTransition(async () => {
      const result = await tokeniseAsset(assetDbId);
      if (result.status === "success") {
        toast.success("Asset tokenized on Algorand!", {
          description: `ASA #${result.algorandAssetId} created successfully.`,
        });
        router.refresh();
      } else if (result.status === "skipped") {
        toast.info("Algorand connection", { description: result.reason });
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleTokenise}
      loading={isPending}
      icon={<Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />}
      className="border-amber-300 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10"
    >
      Tokenize on Algorand
    </Button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0 text-xs">
        {icon}
        {label}
      </span>
      <div className="text-right truncate">{children}</div>
    </div>
  );
}

// ─── P1 Risk Signals Modal ──────────────────────────────────────────────────

function RiskSignalsModal({
  open,
  onClose,
  result,
}: {
  open: boolean;
  onClose: () => void;
  result: RiskEvaluationResult | null;
}) {
  if (!open || !result) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0f111a] max-w-2xl w-full max-h-[85vh] rounded-2xl border border-slate-200 dark:border-white/[0.1] p-6 shadow-2xl flex flex-col space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Explainable Risk Signals & Evidence Breakdown
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deterministic mathematical scoring based on verified cryptographic assertions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {result.signals.map((sig, idx) => (
            <div
              key={idx}
              className={cn(
                "p-3.5 rounded-xl border space-y-1.5",
                sig.severity === "CRITICAL"
                  ? "bg-rose-50/50 dark:bg-rose-500/[0.04] border-rose-200 dark:border-rose-500/20"
                  : sig.severity === "HIGH"
                  ? "bg-amber-50/50 dark:bg-amber-500/[0.04] border-amber-200 dark:border-amber-500/20"
                  : sig.severity === "MEDIUM"
                  ? "bg-yellow-50/50 dark:bg-yellow-500/[0.04] border-yellow-200 dark:border-yellow-500/20"
                  : sig.severity === "LOW"
                  ? "bg-blue-50/50 dark:bg-blue-500/[0.04] border-blue-200 dark:border-blue-500/20"
                  : "bg-emerald-50/50 dark:bg-emerald-500/[0.04] border-emerald-200 dark:border-emerald-500/20"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  {sig.severity === "CRITICAL" || sig.severity === "HIGH" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  {sig.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    +{sig.scoreImpact} Risk Pts
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                    {sig.category}
                  </span>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-300">{sig.description}</p>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Mitigation:</span> {sig.mitigation}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/[0.06]">
          <Button onClick={onClose} variant="secondary" size="sm">
            Close Inspector
          </Button>
        </div>
      </div>
    </div>
  );
}
