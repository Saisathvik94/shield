"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Package, Shield, ShieldCheck, FileText, CloudUpload,
  ExternalLink, Copy, CheckCircle2, XCircle, Loader2, Hash, MapPin,
  User, Calendar, Activity, FileCheck2, AlertTriangle, QrCode,
  ChevronDown, ChevronUp, Download, Link2, Zap, RotateCw,
  ArrowRightLeft, ThumbsUp, ThumbsDown, Archive, Fingerprint,
} from "lucide-react";
import { uploadAssetDocument, verifyFileIntegrity } from "@/lib/ipfs/ipfs-actions";
import { grantAssetAccess, revokeAssetAccess } from "@/lib/actions/asset-actions";
import { tokeniseAsset } from "@/lib/algorand/algorand-actions";
import {
  requestTransfer,
  approveTransfer,
  rejectTransfer,
  retireAsset,
} from "@/lib/actions/transfer-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { classificationColor, relativeTime, cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssetData {
  id: string; assetId: string; name: string; description: string | null;
  assetType: string; classification: string; status: string;
  location: string | null; physicalIdentifier: string | null;
  algorandAssetId: string | null; blockchainTxId: string | null;
  ipfsCid: string | null; createdAt: string; updatedAt: string;
  organization: { id: string; name: string; slug: string };
  owner: { id: string; name: string; email: string } | null;
  custodian: { id: string; name: string; email: string } | null;
  department: string | null; section: string | null;
  transferToUserId: string | null; transferReason: string | null;
}

interface OrgMember { id: string; name: string; email: string; }
interface AssetAccess { user: OrgMember; }

interface IpfsObjectData {
  id: string; cid: string; gatewayUrl: string | null; objectType: string;
  fileName: string | null; fileSize: number | null; mimeType: string | null;
  sha256Hash: string | null; createdAt: string;
  uploadedBy: { name: string; email: string } | null;
}

interface BlockchainRecordData {
  id: string; txId: string; confirmedRound: string | null; recordType: string;
  algorandAssetId: string | null; network: string; notePayload: string | null;
  createdAt: string; actor: { name: string } | null;
}

interface AuditEventData {
  id: string; eventType: string; description: string | null;
  blockchainTxId: string | null; ipfsCid: string | null;
  createdAt: string; actor: { name: string } | null;
}

interface Props {
  orgId: string; canManage: boolean; isOwnerOrAdmin: boolean;
  currentUserId: string; asset: AssetData; orgMembers: OrgMember[];
  access: AssetAccess[];
  ipfsObjects: IpfsObjectData[]; blockchainRecords: BlockchainRecordData[];
  auditEvents: AuditEventData[];
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

export function AssetPassportClient({
  orgId, canManage, isOwnerOrAdmin, currentUserId,
  asset, orgMembers, ipfsObjects, blockchainRecords, auditEvents,
  access,
}: Props) {
  const cls = classificationColor(asset.classification);
  const statusCls = STATUS_COLORS[asset.status] ?? "text-gray-400 bg-gray-400/10";
  const stripeClass =
    asset.classification === "CRITICAL" ? "bg-gradient-to-r from-red-600 to-rose-500"
    : asset.classification === "SECRET" ? "bg-gradient-to-r from-orange-600 to-amber-500"
    : asset.classification === "CONFIDENTIAL" ? "bg-gradient-to-r from-yellow-600 to-yellow-400"
    : "bg-gradient-to-r from-blue-600 to-violet-600";

  const isActive = !["REVOKED", "RETIRED"].includes(asset.status);
  const isPendingTransfer = asset.status === "TRANSFER_REQUESTED";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link
        href={`/dashboard/orgs/${orgId}/assets`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to assets
      </Link>

      {/* Passport header */}
      <div className="bg-[#111118] border border-white/[0.06] rounded-2xl overflow-hidden mb-6">
        <div className={cn("h-1.5", stripeClass)} />
        <div className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-white/[0.08] flex items-center justify-center shrink-0">
              <Package className="w-7 h-7 text-violet-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xl font-bold text-white font-mono">{asset.assetId}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded font-semibold", cls.className)}>{cls.label}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded font-medium", statusCls)}>{asset.status.replace(/_/g, " ")}</span>
              </div>
              <h1 className="text-lg font-semibold text-white">{asset.name}</h1>
              {asset.description && <p className="text-sm text-gray-400 mt-1">{asset.description}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {asset.algorandAssetId && (
                  <Badge variant="success" className="gap-1">
                    <ShieldCheck className="w-3 h-3" /> ASA #{asset.algorandAssetId}
                  </Badge>
                )}
                {asset.ipfsCid && (
                  <Badge variant="info" className="gap-1">
                    <Hash className="w-3 h-3" /> IPFS {asset.ipfsCid.slice(0, 12)}…
                  </Badge>
                )}
                {asset.blockchainTxId && (
                  <a href={`https://testnet.explorer.perawallet.app/tx/${asset.blockchainTxId}`} target="_blank" rel="noopener noreferrer">
                    <Badge variant="success" className="gap-1 cursor-pointer hover:opacity-80">
                      <ExternalLink className="w-3 h-3" /> View on Algorand
                    </Badge>
                  </a>
                )}
              </div>
              {/* Tokenise button */}
              {canManage && !asset.algorandAssetId && isActive && (
                <TokeniseButton assetDbId={asset.id} orgId={orgId} />
              )}
            </div>
            <div className="shrink-0 hidden sm:flex flex-col items-center gap-1.5">
              <Link
                href={`/verify/${asset.assetId}`}
                className="w-16 h-16 bg-white/[0.05] border border-white/[0.08] rounded-xl flex items-center justify-center hover:bg-white/[0.08] transition-colors"
              >
                <QrCode className="w-8 h-8 text-gray-400" />
              </Link>
              <span className="text-[10px] text-gray-500">Verify</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PassportMetadata asset={asset} />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Transfer panel */}
          {isActive && (
            <TransferPanel
              asset={asset}
              orgId={orgId}
              orgMembers={orgMembers}
              canManage={canManage}
              isOwnerOrAdmin={isOwnerOrAdmin}
              currentUserId={currentUserId}
            />
          )}
          <DocumentsPanel
            orgId={orgId}
            assetDbId={asset.id}
            ipfsObjects={ipfsObjects}
            canManage={canManage}
          />
          <AccessPanel
            assetDbId={asset.id}
            access={access}
            orgMembers={orgMembers}
            canManage={canManage}
          />
          {blockchainRecords.length > 0 && <BlockchainPanel records={blockchainRecords} />}
          <AuditPanel events={auditEvents} />
          {/* Retire / danger zone */}
          {isOwnerOrAdmin && isActive && !isPendingTransfer && (
            <DangerZone assetDbId={asset.id} assetLabel={asset.assetId} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Passport metadata ────────────────────────────────────────────────────────

function PassportMetadata({ asset }: { asset: AssetData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" /> Asset Passport
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <MetaRow icon={<Package className="w-3.5 h-3.5" />} label="Type">
          {asset.assetType.replace(/_/g, " ")}
        </MetaRow>
        {asset.organization && (
          <MetaRow icon={<Link2 className="w-3.5 h-3.5" />} label="Organization">
            {asset.organization.name}
          </MetaRow>
        )}
        {asset.department && (
          <MetaRow icon={<Package className="w-3.5 h-3.5" />} label="Department">
            {asset.department}{asset.section && <span className="text-gray-500"> → {asset.section}</span>}
          </MetaRow>
        )}
        {asset.owner && (
          <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Owner">{asset.owner.name}</MetaRow>
        )}
        {asset.custodian && (
          <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Custodian">{asset.custodian.name}</MetaRow>
        )}
        {asset.location && (
          <MetaRow icon={<MapPin className="w-3.5 h-3.5" />} label="Location">{asset.location}</MetaRow>
        )}
        {asset.physicalIdentifier && (
          <MetaRow icon={<Fingerprint className="w-3.5 h-3.5" />} label="Physical ID">
            <span className="font-mono text-xs">{asset.physicalIdentifier}</span>
          </MetaRow>
        )}
        <div className="border-t border-white/[0.06] pt-3 mt-1 flex flex-col gap-2.5">
          <MetaRow icon={<Calendar className="w-3.5 h-3.5" />} label="Registered">
            {relativeTime(asset.createdAt)}
          </MetaRow>
          <MetaRow icon={<Calendar className="w-3.5 h-3.5" />} label="Updated">
            {relativeTime(asset.updatedAt)}
          </MetaRow>
        </div>
        {asset.ipfsCid && (
          <div className="border-t border-white/[0.06] pt-3 mt-1">
            <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider font-medium">Primary IPFS CID</p>
            <CopyableHash value={asset.ipfsCid} />
          </div>
        )}
        {asset.algorandAssetId && (
          <div className="pt-1">
            <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider font-medium">Algorand ASA ID</p>
            <CopyableHash value={asset.algorandAssetId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Transfer panel ───────────────────────────────────────────────────────────

function TransferPanel({
  asset, orgId, orgMembers, canManage, isOwnerOrAdmin, currentUserId,
}: {
  asset: AssetData; orgId: string; orgMembers: OrgMember[];
  canManage: boolean; isOwnerOrAdmin: boolean; currentUserId: string;
}) {
  const router = useRouter();
  const [requestPending, startRequest] = useTransition();
  const [approvePending, startApprove] = useTransition();
  const [rejectPending, startReject] = useTransition();
  const [toUserId, setToUserId] = useState("");
  const [reason, setReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const isPending = asset.status === "TRANSFER_REQUESTED";
  const isCustodianOrOwner =
    asset.custodian?.id === currentUserId || asset.owner?.id === currentUserId;

  // Members excluding current custodian/owner as transfer targets
  const eligibleTargets = orgMembers.filter(
    (m) => m.id !== asset.custodian?.id && m.id !== currentUserId
  );

  const transferTargetName = asset.transferToUserId
    ? orgMembers.find((m) => m.id === asset.transferToUserId)?.name ?? "Unknown member"
    : null;

  function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!toUserId || !reason.trim()) return;
    startRequest(async () => {
      const r = await requestTransfer(asset.id, toUserId, reason);
      if (r.status === "success") {
        toast.success("Transfer requested");
        setShowForm(false);
        router.refresh();
      } else toast.error(r.message);
    });
  }

  function handleApprove() {
    startApprove(async () => {
      const r = await approveTransfer(asset.id);
      if (r.status === "success") {
        toast.success("Transfer approved and completed");
        router.refresh();
      } else toast.error(r.message);
    });
  }

  function handleReject(e: React.FormEvent) {
    e.preventDefault();
    startReject(async () => {
      const r = await rejectTransfer(asset.id, rejectReason || "No reason provided");
      if (r.status === "success") {
        toast.success("Transfer rejected");
        setShowRejectForm(false);
        router.refresh();
      } else toast.error(r.message);
    });
  }

  // If transfer pending - show approval UI for managers
  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-yellow-400" />
            Transfer Pending Approval
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4">
            <p className="text-sm text-yellow-200 font-medium">
              Transfer requested → {transferTargetName ?? "Unknown"}
            </p>
            {asset.transferReason && (
              <p className="text-xs text-yellow-400/70 mt-1">Reason: {asset.transferReason}</p>
            )}
          </div>

          {isOwnerOrAdmin && !showRejectForm && (
            <div className="flex gap-3">
              <Button
                variant="primary"
                loading={approvePending}
                icon={<ThumbsUp className="w-4 h-4" />}
                onClick={handleApprove}
                className="flex-1"
              >
                Approve transfer
              </Button>
              <Button
                variant="danger"
                icon={<ThumbsDown className="w-4 h-4" />}
                onClick={() => setShowRejectForm(true)}
                className="flex-1"
              >
                Reject
              </Button>
            </div>
          )}

          {isOwnerOrAdmin && showRejectForm && (
            <form onSubmit={handleReject} className="flex flex-col gap-3">
              <input
                autoFocus
                placeholder="Reason for rejection (optional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-red-500/50"
              />
              <div className="flex gap-2">
                <Button type="submit" variant="danger" loading={rejectPending} className="flex-1">
                  Confirm rejection
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

  // Normal state - show request form if canManage
  if (!canManage) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-400" /> Transfer Asset
          </CardTitle>
          {!showForm && (
            <Button size="sm" variant="secondary" icon={<ArrowRightLeft className="w-3.5 h-3.5" />} onClick={() => setShowForm(true)}>
              Request transfer
            </Button>
          )}
        </div>
      </CardHeader>
      {showForm && (
        <CardContent>
          <form onSubmit={handleRequest} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-300">Transfer to</label>
              <select
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                required
                className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/60"
              >
                <option value="">- Select member -</option>
                {eligibleTargets.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-300">Reason</label>
              <input
                autoFocus
                placeholder="Reason for transfer…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setToUserId(""); setReason(""); }}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={requestPending} disabled={!toUserId || !reason.trim()} icon={<ArrowRightLeft className="w-4 h-4" />}>
                Submit request
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Documents & IPFS panel ───────────────────────────────────────────────────

function DocumentsPanel({
  orgId, assetDbId, ipfsObjects, canManage,
}: {
  orgId: string; assetDbId: string; ipfsObjects: IpfsObjectData[]; canManage: boolean;
}) {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);
  const verifyRef = useRef<HTMLInputElement>(null);
  const [uploadPending, startUpload] = useTransition();
  const [verifyPending, startVerify] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [verifyCid, setVerifyCid] = useState("");
  const [verifyResult, setVerifyResult] = useState<{
    status: "verified" | "tampered" | "not_found" | "error" | null;
    message?: string; sha256?: string;
  }>({ status: null });

  function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const filesToUpload = Array.from(files);
    startUpload(async () => {
      setUploadProgress({ current: 0, total: filesToUpload.length });
      let uploadedCount = 0;
      const failures: string[] = [];

      for (const file of filesToUpload) {
        const fd = new FormData();
        fd.append("file", file);
        const result = await uploadAssetDocument(fd, orgId, assetDbId);

        if (result.status === "success") {
          uploadedCount += 1;
        } else {
          failures.push(`${file.name}: ${result.message}`);
        }
        setUploadProgress((progress) => ({ ...progress, current: progress.current + 1 }));
      }

      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} file${uploadedCount === 1 ? "" : "s"} pinned to IPFS`);
        router.refresh();
      }
      if (failures.length > 0) {
        toast.error(`${failures.length} file${failures.length === 1 ? "" : "s"} failed`, {
          description: failures[0],
        });
      }
      setUploadProgress({ current: 0, total: 0 });
      if (uploadRef.current) uploadRef.current.value = "";
    });
  }

  function handleVerify(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!verifyCid.trim()) { toast.error("Paste a CID first."); return; }
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
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" /> Documents &amp; Files
          <span className="ml-auto text-xs font-normal text-gray-500">{ipfsObjects.length} pinned</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {ipfsObjects.length > 0 && (
          <ul className="flex flex-col gap-2">
            {ipfsObjects.map((obj) => <FileRow key={obj.id} obj={obj} />)}
          </ul>
        )}

        {canManage && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Upload to IPFS</p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
              onClick={() => !uploadPending && uploadRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 transition-colors select-none",
                uploadPending ? "border-blue-500/30 bg-blue-500/5 cursor-default"
                : dragOver ? "border-blue-500/50 bg-blue-500/5 cursor-copy"
                : "border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02] cursor-pointer"
              )}
            >
              {uploadPending ? (
                <>
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  <p className="text-sm text-blue-300">
                    Pinning {uploadProgress.current} of {uploadProgress.total} to IPFS…
                  </p>
                </>
              ) : (
                <>
                  <CloudUpload className="w-8 h-8 text-gray-500" />
                  <div className="text-center">
                    <p className="text-sm text-gray-300">Drop files or <span className="text-blue-400">browse</span></p>
                    <p className="text-xs text-gray-600 mt-0.5">Any format · Max 50 MB each · SHA-256 computed</p>
                  </div>
                </>
              )}
              <input ref={uploadRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
            </div>
          </div>
        )}

        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">Verify file integrity</p>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">Re-upload a file and match it against a stored CID to detect tampering.</p>
          <div className="flex gap-2 mb-3">
            <input
              placeholder="IPFS CID (e.g. Qm… or bafy…)"
              value={verifyCid}
              onChange={(e) => { setVerifyCid(e.target.value); setVerifyResult({ status: null }); }}
              className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-blue-500/50 font-mono"
            />
            <Button variant="secondary" size="sm" onClick={() => verifyRef.current?.click()} disabled={verifyPending || !verifyCid.trim()} loading={verifyPending} icon={<FileCheck2 className="w-4 h-4" />}>
              Verify
            </Button>
            <input ref={verifyRef} type="file" className="hidden" onChange={(e) => handleVerify(e.target.files)} />
          </div>
          {verifyResult.status === "verified" && (
            <div className="flex items-start gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm text-green-300 font-medium">Integrity verified</p>
                {verifyResult.sha256 && <p className="text-[10px] text-green-500/70 mt-0.5 font-mono break-all">SHA-256: {verifyResult.sha256}</p>}
              </div>
            </div>
          )}
          {verifyResult.status === "tampered" && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300 font-medium">Integrity check FAILED</p>
                <p className="text-xs text-red-400/80 mt-0.5">{verifyResult.message}</p>
              </div>
            </div>
          )}
          {(verifyResult.status === "not_found" || verifyResult.status === "error") && (
            <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-300">{verifyResult.message}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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
        toast.success("Asset access granted");
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
        toast.success("Asset access revoked");
        router.refresh();
      } else toast.error(result.message);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-4 h-4 text-blue-400" /> Asset Access
          <span className="ml-auto text-xs font-normal text-gray-500">{access.length} member{access.length === 1 ? "" : "s"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {access.length === 0 ? (
          <p className="text-sm text-gray-500">No additional members have access.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {access.map((grant) => (
              <li key={grant.user.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-200 truncate">{grant.user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{grant.user.email}</p>
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => handleRevoke(grant.user)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canManage && availableMembers.length > 0 && (
          <div className="flex gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/60"
            >
              <option value="">- Select member -</option>
              {availableMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.name} ({member.email})</option>
              ))}
            </select>
            <Button size="sm" variant="secondary" loading={pending} disabled={!selectedUserId} onClick={handleGrant}>
              Grant access
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── File row ─────────────────────────────────────────────────────────────────

function FileRow({ obj }: { obj: IpfsObjectData }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors">
        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{obj.fileName ?? "Unnamed file"}</p>
          <p className="text-[10px] text-gray-500 font-mono truncate">{obj.cid}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {obj.fileSize != null && <span className="text-xs text-gray-500">{formatBytes(obj.fileSize)}</span>}
          {obj.gatewayUrl && (
            <a href={obj.gatewayUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-blue-400 transition-colors" title="Open on IPFS gateway">
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-white/[0.06] pt-2.5 flex flex-col gap-1.5">
          <InfoLine label="CID" value={obj.cid} mono copyable />
          {obj.sha256Hash && <InfoLine label="SHA-256" value={obj.sha256Hash} mono copyable />}
          {obj.mimeType && <InfoLine label="MIME" value={obj.mimeType} />}
          {obj.uploadedBy && <InfoLine label="Uploaded by" value={obj.uploadedBy.name} />}
          <InfoLine label="Pinned" value={relativeTime(obj.createdAt)} />
          {obj.gatewayUrl && (
            <a href={obj.gatewayUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline mt-1">
              <ExternalLink className="w-3 h-3" /> Open on IPFS gateway
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Blockchain panel ─────────────────────────────────────────────────────────

function BlockchainPanel({ records }: { records: BlockchainRecordData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Blockchain Records
          <Badge variant="success" className="ml-auto text-[10px]">Algorand</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-white/[0.04]">
          {records.map((r) => {
            const explorerBase = r.network === "testnet" ? "https://testnet.explorer.perawallet.app" : "https://explorer.perawallet.app";
            return (
              <li key={r.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="success" className="text-[10px] font-mono">{r.recordType.replace(/_/g, " ")}</Badge>
                      {r.algorandAssetId && <span className="text-[10px] text-emerald-400">ASA #{r.algorandAssetId}</span>}
                    </div>
                    <p className="text-xs font-mono text-gray-400 truncate">TX: {r.txId}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {r.confirmedRound && `Round #${r.confirmedRound} · `}{relativeTime(r.createdAt)}{r.actor && ` · ${r.actor.name}`}
                    </p>
                  </div>
                  <a href={`${explorerBase}/tx/${r.txId}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-emerald-400 transition-colors shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                {r.notePayload && <p className="text-[10px] text-gray-600 font-mono mt-2 bg-white/[0.03] rounded px-2 py-1 break-all">{r.notePayload}</p>}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Audit panel ──────────────────────────────────────────────────────────────

function AuditPanel({ events }: { events: AuditEventData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" /> Asset History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No events recorded yet.</p>
        ) : (
          <div className="relative px-5 py-4">
            <div className="absolute left-[22px] top-0 bottom-0 w-px bg-white/[0.05]" />
            <ul className="flex flex-col gap-4">
              {events.map((event) => (
                <li key={event.id} className="flex items-start gap-4">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 z-10 ring-2 ring-[#111118] bg-blue-400" />
                  <div className="flex-1 min-w-0 pb-4 border-b border-white/[0.04] last:border-0 last:pb-0">
                    <p className="text-xs text-white leading-snug">{event.description ?? event.eventType.replace(/_/g, " ")}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-600">{relativeTime(event.createdAt)}{event.actor && ` · ${event.actor.name}`}</span>
                      {event.blockchainTxId && <Badge variant="success" className="text-[10px]">On-chain</Badge>}
                      {event.ipfsCid && <Badge variant="info" className="text-[10px]">IPFS</Badge>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Danger zone ──────────────────────────────────────────────────────────────

function DangerZone({ assetDbId, assetLabel }: { assetDbId: string; assetLabel: string }) {
  const router = useRouter();
  const [retiring, startRetire] = useTransition();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  function handleRetire(e: React.FormEvent) {
    e.preventDefault();
    startRetire(async () => {
      const r = await retireAsset(assetDbId, reason || "End of life");
      if (r.status === "success") { toast.success(`Asset ${assetLabel} retired`); router.refresh(); }
      else toast.error(r.message);
      setOpen(false);
    });
  }

  return (
    <Card className="border-red-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-400">
          <Archive className="w-4 h-4" /> Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!open ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Retire asset</p>
              <p className="text-xs text-gray-500 mt-0.5">Mark this asset as end-of-life. This cannot be undone.</p>
            </div>
            <Button variant="danger" size="sm" icon={<Archive className="w-4 h-4" />} onClick={() => setOpen(true)}>
              Retire
            </Button>
          </div>
        ) : (
          <form onSubmit={handleRetire} className="flex flex-col gap-3">
            <p className="text-sm text-red-300 font-medium">Confirm retirement of {assetLabel}</p>
            <input
              autoFocus placeholder="Reason (optional)"
              value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-red-500/50"
            />
            <div className="flex gap-2">
              <Button type="submit" variant="danger" loading={retiring} className="flex-1">Confirm retire</Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tokenise button ──────────────────────────────────────────────────────────

function TokeniseButton({ assetDbId, orgId }: { assetDbId: string; orgId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  void orgId;

  function handleTokenise() {
    startTransition(async () => {
      const result = await tokeniseAsset(assetDbId);
      if (result.status === "success") {
        setDone(true);
        toast.success("Asset tokenised on Algorand!", { description: `ASA #${result.algorandAssetId} · TX: ${result.txId.slice(0, 16)}…` });
        router.refresh();
      } else if (result.status === "skipped") {
        toast.info("Algorand not configured", { description: result.reason });
      } else {
        toast.error(result.message);
      }
    });
  }

  if (done) return null;
  return (
    <div className="mt-3">
      <Button
        variant="secondary" size="sm" onClick={handleTokenise} loading={isPending}
        icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
        className="border-amber-500/20 text-amber-300 hover:bg-amber-500/10"
      >
        Tokenise on Algorand
      </Button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MetaRow({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode; }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-gray-500 flex items-center gap-1.5 shrink-0 text-xs">{icon}{label}</span>
      <span className="text-gray-300 text-xs text-right">{children}</span>
    </div>
  );
}

function InfoLine({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean; }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-gray-500 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={cn("text-[10px] text-gray-400 truncate", mono && "font-mono")}>{value}</span>
        {copyable && (
          <button onClick={handleCopy} className="text-gray-600 hover:text-white transition-colors shrink-0">
            {copied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

function CopyableHash({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <div className="flex items-center gap-1.5 bg-white/[0.04] rounded-lg px-2.5 py-1.5">
      <span className="text-[10px] font-mono text-gray-400 truncate flex-1">{value}</span>
      <button onClick={handleCopy} className="text-gray-600 hover:text-white transition-colors shrink-0">
        {copied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
