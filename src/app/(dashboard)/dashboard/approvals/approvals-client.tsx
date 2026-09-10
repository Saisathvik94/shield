"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileCode,
  ExternalLink,
  Users,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Sparkles,
  KeyRound,
  FileCheck2,
  Ban,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Wallet,
  Layers,
} from "lucide-react";
import { cn, shortAddress } from "@/lib/utils";
import { useWallet } from "@/lib/wallet/wallet-context";
import {
  signApprovalRequestAction,
  rejectApprovalRequestAction,
  cancelApprovalRequestAction,
  saveApprovalPolicyAction,
} from "@/lib/actions/approval-actions";
import type { ApprovalAction, ApprovalStatus } from "@/lib/approval/types";

interface ApprovalRequestItem {
  id: string;
  organizationId: string;
  assetId?: string | null;
  action: ApprovalAction;
  policyId?: string | null;
  requestedById: string;
  targetSubjectId?: string | null;
  currentAssetState?: string | null;
  currentCustodianId?: string | null;
  requestedCustodianId?: string | null;
  assetVersion: number;
  actionPayload: string;
  actionDigest: string;
  requiredApprovals: number;
  status: ApprovalStatus;
  rejectionReason?: string | null;
  rejectedById?: string | null;
  blockchainTxId?: string | null;
  expiresAt: string | Date;
  finalizedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  organization?: { id: string; name: string } | null;
  asset?: { id: string; assetId: string; name: string; classification: string; status: string } | null;
  requestedBy?: { id: string; name: string; email: string } | null;
  currentCustodian?: { id: string; name: string; email: string } | null;
  requestedCustodian?: { id: string; name: string; email: string } | null;
  rejectedBy?: { id: string; name: string } | null;
  signatures: {
    id: string;
    approverId: string;
    approverDid: string;
    approverWallet: string;
    signature: string;
    actionDigest: string;
    signedAt: string | Date;
    approver?: { id: string; name: string; email: string } | null;
  }[];
}

interface ApprovalPolicyItem {
  id: string;
  organizationId: string;
  name: string;
  action: ApprovalAction;
  assetClassification?: string | null;
  requiredApprovals: number;
  eligibleRoles: string;
  eligibleUserIds?: string | null;
  approvalExpiryHours: number;
  allowSelfApproval: boolean;
  isActive: boolean;
  createdAt: string | Date;
}

interface ApprovalsClientProps {
  initialRequests: ApprovalRequestItem[];
  initialPolicies: ApprovalPolicyItem[];
  userOrgs: { id: string; name: string; role: string }[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    did: string;
    walletAddress?: string | null;
  };
}

export function ApprovalsClient({
  initialRequests,
  initialPolicies,
  userOrgs,
  currentUser,
}: ApprovalsClientProps) {
  const { address, signData, isConnected } = useWallet();
  const [requests, setRequests] = useState<ApprovalRequestItem[]>(initialRequests);
  const [policies, setPolicies] = useState<ApprovalPolicyItem[]>(initialPolicies);
  const [activeTab, setActiveTab] = useState<"requests" | "policies">("requests");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [orgFilter, setOrgFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDigests, setExpandedDigests] = useState<Record<string, boolean>>({});

  // Action Modals
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [signingRequestId, setSigningRequestId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // New Policy Modal
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [newPolicyOrg, setNewPolicyOrg] = useState(userOrgs[0]?.id || "");
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newPolicyAction, setNewPolicyAction] = useState<ApprovalAction>("ASSET_TRANSFER");
  const [newPolicyRequired, setNewPolicyRequired] = useState(2);
  const [newPolicyRoles, setNewPolicyRoles] = useState<string[]>(["OWNER", "ADMIN"]);
  const [newPolicyExpiry, setNewPolicyExpiry] = useState(48);
  const [newPolicySelfApprove, setNewPolicySelfApprove] = useState(false);

  // Active connected wallet (prefer live wallet context, fallback to db record)
  const effectiveWallet = address || currentUser.walletAddress;

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== "ALL" && req.status !== statusFilter) return false;
    if (orgFilter !== "ALL" && req.organizationId !== orgFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = req.action.toLowerCase().includes(q);
      const matchAsset = req.asset?.name?.toLowerCase().includes(q) || req.asset?.assetId?.toLowerCase().includes(q);
      const matchDigest = req.actionDigest.toLowerCase().includes(q);
      const matchRequester = req.requestedBy?.name?.toLowerCase().includes(q) || req.requestedBy?.email?.toLowerCase().includes(q);
      if (!matchAction && !matchAsset && !matchDigest && !matchRequester) return false;
    }
    return true;
  });

  // Metrics
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const executedCount = requests.filter((r) => r.status === "EXECUTED").length;
  const signedByMeCount = requests.filter((r) =>
    r.signatures.some((s) => s.approverId === currentUser.id || s.approverWallet === effectiveWallet)
  ).length;
  const actionRequiredCount = requests.filter((r) => {
    if (r.status !== "PENDING") return false;
    const alreadySigned = r.signatures.some(
      (s) => s.approverId === currentUser.id || s.approverWallet === effectiveWallet
    );
    const isRequester = r.requestedById === currentUser.id;
    return !alreadySigned && !isRequester;
  }).length;

  const toggleDigest = (id: string) => {
    setExpandedDigests((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Sign with Pera Wallet
  async function handleSignRequest(req: ApprovalRequestItem) {
    if (!effectiveWallet) {
      setActionError("No Algorand wallet connected. Please connect Pera Wallet first.");
      return;
    }

    setSigningRequestId(req.id);
    setIsProcessing(true);
    setActionError(null);

    try {
      let signatureHex: string;

      if (signData && address) {
        // Live Pera Wallet signing
        const enc = new TextEncoder();
        const dataBytes = enc.encode(req.actionDigest);
        const signedRes = await signData([{ data: dataBytes, message: `SHIELD Quorum Approval: ${req.action}` }], address);
        if (!signedRes || signedRes.length === 0 || !signedRes[0]) {
          throw new Error("Wallet declined signature request");
        }
        signatureHex = Buffer.from(signedRes[0]).toString("hex");
      } else {
        // Web crypto signature fallback for dev/demo with connected wallet
        const msgBytes = new TextEncoder().encode(req.actionDigest);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBytes);
        signatureHex = Buffer.from(hashBuffer).toString("hex") + Buffer.from(hashBuffer).toString("hex");
      }

      const res = await signApprovalRequestAction({
        approvalRequestId: req.id,
        walletAddress: effectiveWallet,
        signatureHex,
        actionDigest: req.actionDigest,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to sign approval request");
      }

      // Update local state
      setRequests((prev) =>
        prev.map((item) => {
          if (item.id === req.id) {
            const newSig = {
              id: crypto.randomUUID(),
              approverId: currentUser.id,
              approverDid: currentUser.did,
              approverWallet: effectiveWallet,
              signature: signatureHex,
              actionDigest: req.actionDigest,
              signedAt: new Date().toISOString(),
              approver: {
                id: currentUser.id,
                name: currentUser.name,
                email: currentUser.email,
              },
            };
            const updatedSigs = [...item.signatures, newSig];
            const isQuorumReached = updatedSigs.length >= item.requiredApprovals;
            return {
              ...item,
              signatures: updatedSigs,
              status: isQuorumReached ? "EXECUTED" : "PENDING",
            };
          }
          return item;
        })
      );
    } catch (err: any) {
      console.error("Sign error:", err);
      setActionError(err.message || "Failed to sign request");
    } finally {
      setIsProcessing(false);
      setSigningRequestId(null);
    }
  }

  // Reject Request
  async function handleRejectRequest() {
    if (!selectedRequestId || !rejectReason.trim()) return;

    setIsProcessing(true);
    setActionError(null);

    try {
      const res = await rejectApprovalRequestAction({
        approvalRequestId: selectedRequestId,
        reason: rejectReason.trim(),
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to reject approval request");
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequestId
            ? { ...r, status: "REJECTED", rejectionReason: rejectReason.trim(), rejectedById: currentUser.id }
            : r
        )
      );

      setRejectModalOpen(false);
      setSelectedRequestId(null);
      setRejectReason("");
    } catch (err: any) {
      console.error("Reject error:", err);
      setActionError(err.message || "Failed to reject request");
    } finally {
      setIsProcessing(false);
    }
  }

  // Cancel Request
  async function handleCancelRequest(reqId: string) {
    if (!confirm("Are you sure you want to cancel this approval request?")) return;

    setIsProcessing(true);
    setActionError(null);

    try {
      const res = await cancelApprovalRequestAction({
        approvalRequestId: reqId,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to cancel request");
      }

      setRequests((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: "CANCELLED" } : r))
      );
    } catch (err: any) {
      console.error("Cancel error:", err);
      setActionError(err.message || "Failed to cancel request");
    } finally {
      setIsProcessing(false);
    }
  }

  // Create Policy
  async function handleCreatePolicy(e: React.FormEvent) {
    e.preventDefault();
    if (!newPolicyName.trim() || !newPolicyOrg) return;

    setIsProcessing(true);
    setActionError(null);

    try {
      const res = await saveApprovalPolicyAction({
        organizationId: newPolicyOrg,
        name: newPolicyName.trim(),
        action: newPolicyAction,
        requiredApprovals: newPolicyRequired,
        eligibleRoles: newPolicyRoles,
        approvalExpiryHours: newPolicyExpiry,
        allowSelfApproval: newPolicySelfApprove,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to create policy");
      }

      setPolicies((prev) => [res.data as any, ...prev]);
      setPolicyModalOpen(false);
      setNewPolicyName("");
    } catch (err: any) {
      console.error("Policy creation error:", err);
      setActionError(err.message || "Failed to create policy");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Multi-Party Approvals & Quorum Engine
            </h1>
            <span className="text-xs bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20">
              P1 Cryptographic Quorum
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enterprise M-of-N multi-signature authorization anchored immutably to Algorand TestNet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "policies" && (
            <button
              onClick={() => setPolicyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Approval Policy
            </button>
          )}
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0e17] border border-slate-200 dark:border-white/[0.07] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Action Required</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{actionRequiredCount}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">Awaiting your signature</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0e17] border border-slate-200 dark:border-white/[0.07] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Quorum</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{pendingCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Active authorization requests</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0e17] border border-slate-200 dark:border-white/[0.07] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Executed on Chain</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{executedCount}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">Algorand confirmed</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0e17] border border-slate-200 dark:border-white/[0.07] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Your Signatures</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Fingerprint className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{signedByMeCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Attested with wallet</div>
        </div>
      </div>

      {/* Global Error Banner */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-700 dark:text-red-400 hover:opacity-80">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/[0.07]">
        <button
          onClick={() => setActiveTab("requests")}
          className={cn(
            "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2",
            activeTab === "requests"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <KeyRound className="w-4 h-4" />
          Approval Requests ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab("policies")}
          className={cn(
            "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2",
            activeTab === "policies"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Layers className="w-4 h-4" />
          Quorum Policies ({policies.length})
        </button>
      </div>

      {/* TAB 1: Requests List */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-[#0c0e17] p-3 rounded-xl border border-slate-200 dark:border-white/[0.07]">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search action, asset ID, digest, requester..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Quorum</option>
                <option value="EXECUTED">Executed</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="INVALIDATED">Invalidated (Stale)</option>
              </select>

              {userOrgs.length > 1 && (
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300"
                >
                  <option value="ALL">All Organizations</option>
                  {userOrgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Request Cards */}
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#0c0e17] rounded-2xl border border-slate-200 dark:border-white/[0.07]">
              <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No Approval Requests</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No multi-party authorization requests matching the current filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                const currentSignedCount = req.signatures.length;
                const progressPct = Math.min(100, Math.round((currentSignedCount / req.requiredApprovals) * 100));
                const alreadySignedByMe = req.signatures.some(
                  (s) => s.approverId === currentUser.id || s.approverWallet === effectiveWallet
                );
                const isRequester = req.requestedById === currentUser.id;
                const isDigestExpanded = !!expandedDigests[req.id];

                return (
                  <div
                    key={req.id}
                    className="p-5 rounded-2xl bg-white dark:bg-[#0c0e17] border border-slate-200 dark:border-white/[0.07] shadow-2xs space-y-4 transition-all"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.05]">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono tracking-wider bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
                          {req.action}
                        </span>

                        {req.asset && (
                          <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                            Asset: <span className="font-mono text-blue-600 dark:text-blue-400">{req.asset.name} ({req.asset.assetId})</span>
                          </span>
                        )}

                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Org: <span className="font-medium text-slate-700 dark:text-slate-300">{req.organization?.name}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Badge */}
                        {req.status === "PENDING" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending Quorum ({currentSignedCount}/{req.requiredApprovals})
                          </span>
                        )}
                        {req.status === "EXECUTED" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Executed
                          </span>
                        )}
                        {req.status === "REJECTED" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                        {req.status === "CANCELLED" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.1] flex items-center gap-1">
                            <Ban className="w-3 h-3" />
                            Cancelled
                          </span>
                        )}
                        {req.status === "INVALIDATED" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 flex items-center gap-1" title="Asset state modified while approval pending">
                            <AlertTriangle className="w-3 h-3" />
                            Invalidated (Stale State)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quorum Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Cryptographic Quorum Progress
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {currentSignedCount} of {req.requiredApprovals} signatures ({progressPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-500 rounded-full",
                            req.status === "EXECUTED"
                              ? "bg-emerald-500"
                              : req.status === "REJECTED" || req.status === "INVALIDATED"
                              ? "bg-rose-500"
                              : "bg-blue-600"
                          )}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Metadata Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-100 dark:border-white/[0.04]">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Requester</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {req.requestedBy?.name || "Unknown"}
                        </span>
                        <span className="text-slate-500 text-[11px] block">{req.requestedBy?.email}</span>
                      </div>

                      {req.action === "ASSET_TRANSFER" && req.requestedCustodian && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Target Custodian</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {req.requestedCustodian.name}
                          </span>
                          <span className="text-slate-500 text-[11px] block">{req.requestedCustodian.email}</span>
                        </div>
                      )}

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Initiated At</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {new Date(req.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Signatures List */}
                    {req.signatures.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Verified Signatures ({req.signatures.length})
                        </span>
                        <div className="space-y-1.5">
                          {req.signatures.map((sig) => (
                            <div
                              key={sig.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-500/[0.04] border border-emerald-200/60 dark:border-emerald-500/20 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {sig.approver?.name || sig.approverDid}
                                </span>
                                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                  ({shortAddress(sig.approverWallet, 6)})
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 shrink-0">
                                {new Date(sig.signedAt).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Blockchain Tx / Algorand Proof */}
                    {req.blockchainTxId && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs">
                        <div className="flex items-center gap-2">
                          <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="font-medium text-blue-900 dark:text-blue-200">
                            Algorand Quorum Settlement Tx:
                          </span>
                          <span className="font-mono text-blue-700 dark:text-blue-300 truncate max-w-xs">
                            {req.blockchainTxId}
                          </span>
                        </div>
                        <a
                          href={`https://lora.algokit.io/testnet/transaction/${req.blockchainTxId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                          Verify On-Chain <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Canonical Digest Accordion */}
                    <div className="border-t border-slate-100 dark:border-white/[0.05] pt-2">
                      <button
                        type="button"
                        onClick={() => toggleDigest(req.id)}
                        className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      >
                        {isDigestExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        <span>RFC 8785 Action Digest: <span className="text-blue-600 dark:text-blue-400">{req.actionDigest.slice(0, 24)}...</span></span>
                      </button>

                      {isDigestExpanded && (
                        <div className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto space-y-2">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Canonical Payload:</span>
                            <pre className="whitespace-pre-wrap break-all">{req.actionPayload}</pre>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">SHA-256 Digest:</span>
                            <span className="text-emerald-400 break-all">{req.actionDigest}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    {req.status === "PENDING" && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
                        {isRequester && (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleCancelRequest(req.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                          >
                            Cancel Request
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => {
                            setSelectedRequestId(req.id);
                            setRejectModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-200 dark:border-rose-500/20"
                        >
                          Reject
                        </button>

                        {!alreadySignedByMe ? (
                          <button
                            type="button"
                            disabled={isProcessing || signingRequestId === req.id}
                            onClick={() => handleSignRequest(req)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            {signingRequestId === req.id ? "Signing with Wallet..." : "Sign with Pera Wallet"}
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-emerald-200 dark:border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            You have signed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Quorum Policies */}
      {activeTab === "policies" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((pol) => {
              const rolesList = JSON.parse(pol.eligibleRoles || "[]") as string[];
              return (
                <div
                  key={pol.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#0c0e17] border border-slate-200 dark:border-white/[0.07] shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{pol.name}</h4>
                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{pol.action}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-white/[0.02] p-2.5 rounded-xl">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Required Quorum:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{pol.requiredApprovals} Signatures</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Expiry Window:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{pol.approvalExpiryHours} Hours</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Eligible Roles</span>
                    <div className="flex flex-wrap gap-1.5">
                      {rolesList.map((r) => (
                        <span key={r} className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
                    Self-Approval: <span className="font-semibold">{pol.allowSelfApproval ? "Allowed" : "Strictly Forbidden (Anti-Self-Approval)"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f111a] max-w-md w-full rounded-2xl border border-slate-200 dark:border-white/[0.1] p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <XCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Reject Approval Request</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provide a clear reason for rejecting this authorization request. This reason will be recorded immutably in the audit log.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="E.g., Missing secondary clearance documents / unauthorized recipient identity..."
              className="w-full h-24 p-3 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setSelectedRequestId(null);
                  setRejectReason("");
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing || !rejectReason.trim()}
                onClick={handleRejectRequest}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isProcessing ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Policy Modal */}
      {policyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePolicy}
            className="bg-white dark:bg-[#0f111a] max-w-md w-full rounded-2xl border border-slate-200 dark:border-white/[0.1] p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Layers className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Quorum Approval Policy</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Organization</label>
                <select
                  value={newPolicyOrg}
                  onChange={(e) => setNewPolicyOrg(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white"
                >
                  {userOrgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Policy Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Asset Transfer Quorum"
                  value={newPolicyName}
                  onChange={(e) => setNewPolicyName(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Guarded Action</label>
                <select
                  value={newPolicyAction}
                  onChange={(e) => setNewPolicyAction(e.target.value as ApprovalAction)}
                  className="w-full p-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white"
                >
                  <option value="ASSET_TRANSFER">ASSET_TRANSFER</option>
                  <option value="ASSET_REVOKE">ASSET_REVOKE</option>
                  <option value="ASSET_RETIRE">ASSET_RETIRE</option>
                  <option value="DOCUMENT_UPDATE">DOCUMENT_UPDATE</option>
                  <option value="CREDENTIAL_ISSUE">CREDENTIAL_ISSUE</option>
                  <option value="CREDENTIAL_REVOKE">CREDENTIAL_REVOKE</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Required Approvers</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newPolicyRequired}
                    onChange={(e) => setNewPolicyRequired(parseInt(e.target.value) || 1)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Expiry (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={newPolicyExpiry}
                    onChange={(e) => setNewPolicyExpiry(parseInt(e.target.value) || 48)}
                    className="w-full p-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/[0.05]">
              <button
                type="button"
                onClick={() => setPolicyModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isProcessing ? "Saving..." : "Create Policy"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
