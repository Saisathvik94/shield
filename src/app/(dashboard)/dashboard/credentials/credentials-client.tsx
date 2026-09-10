"use client";

import React, { useState } from "react";
import {
  Award,
  ShieldCheck,
  ShieldAlert,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Trash2,
  FileCode,
  KeyRound,
  Shield,
  AlertTriangle,
} from "lucide-react";
import {
  issueCredentialAction,
  revokeCredentialAction,
  verifyCredentialAction,
} from "@/lib/actions/credential-actions";
import { copyWithToast, shortAddress } from "@/lib/utils";
import type {
  CredentialType,
  CredentialVerificationResult,
} from "@/lib/credential/types";

interface CredentialItem {
  id: string;
  type: string;
  issuerDid: string;
  subjectDid: string;
  organizationId: string;
  claims: string;
  status: string;
  credentialHash: string;
  signature: string | null;
  blockchainTxId: string | null;
  issuedAt: Date | string;
  expiresAt: Date | string | null;
  revokedAt: Date | string | null;
  revocationReason: string | null;
  organization?: { id: string; name: string } | null;
  issuedBy?: { id: string; name: string } | null;
}

interface UserOrg {
  id: string;
  name: string;
  role: string;
}

interface CurrentUser {
  id: string;
  name: string;
  did: string;
}

export function CredentialsClient({
  initialCredentials,
  userOrgs,
  currentUser,
}: {
  initialCredentials: CredentialItem[];
  userOrgs: UserOrg[];
  currentUser: CurrentUser;
}) {
  const [credentialsList, setCredentialsList] = useState<CredentialItem[]>(initialCredentials);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "revoked" | "verify_tool">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Modals state
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [selectedCred, setSelectedCred] = useState<CredentialItem | null>(null);

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<CredentialVerificationResult | null>(null);

  // Issue Form state
  const [issueType, setIssueType] = useState<CredentialType>("ORGANIZATION_MEMBERSHIP");
  const [issueOrgId, setIssueOrgId] = useState<string>(userOrgs[0]?.id || "");
  const [subjectDid, setSubjectDid] = useState<string>("");
  const [expiresInDays, setExpiresInDays] = useState<string>("365");
  const [claimRole, setClaimRole] = useState<string>("MEMBER");
  const [claimAssetId, setClaimAssetId] = useState<string>("");
  const [claimAssetName, setClaimAssetName] = useState<string>("");
  const [claimPermissions, setClaimPermissions] = useState<string>("READ,TRANSFER");
  const [claimAuditScope, setClaimAuditScope] = useState<string>("FINANCIAL,SECURITY,COMPLIANCE");
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Revoke Form state
  const [revokeReason, setRevokeReason] = useState("");
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);

  // Standalone Verification Tool state
  const [rawVcInput, setRawVcInput] = useState("");
  const [standaloneResult, setStandaloneResult] = useState<CredentialVerificationResult | null>(null);
  const [standaloneVerifying, setStandaloneVerifying] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    copyWithToast(text, "Credential Info");
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter credentials
  const filteredCredentials = credentialsList.filter((cred) => {
    if (filterTab === "active" && cred.status !== "ACTIVE") return false;
    if (filterTab === "revoked" && cred.status !== "REVOKED") return false;
    if (selectedType !== "ALL" && cred.type !== selectedType) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        cred.type.toLowerCase().includes(q) ||
        cred.subjectDid.toLowerCase().includes(q) ||
        cred.credentialHash.toLowerCase().includes(q) ||
        Boolean(cred.organization?.name && cred.organization.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const stats = {
    total: credentialsList.length,
    active: credentialsList.filter((c) => c.status === "ACTIVE").length,
    revoked: credentialsList.filter((c) => c.status === "REVOKED").length,
    blockchainAnchored: credentialsList.filter((c) => Boolean(c.blockchainTxId)).length,
  };

  // Run verification check
  const handleVerifyCredential = async (cred: CredentialItem) => {
    setSelectedCred(cred);
    setIsVerifying(true);
    setVerificationResult(null);
    setIsInspectModalOpen(true);

    try {
      const res = await verifyCredentialAction({ credentialId: cred.id });
      setVerificationResult(res);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Issue Credential Handler
  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueOrgId || !subjectDid.trim()) {
      setIssueError("Please select an organization and enter a Subject DID.");
      return;
    }

    setIsSubmittingIssue(true);
    setIssueError(null);

    let claims: Record<string, unknown> = {};
    if (issueType === "ORGANIZATION_MEMBERSHIP") {
      const selectedOrg = userOrgs.find((o) => o.id === issueOrgId);
      claims = {
        organizationId: issueOrgId,
        organizationName: selectedOrg?.name || "Organization",
        role: claimRole,
        memberSince: new Date().toISOString(),
      };
    } else if (issueType === "ROLE_ASSIGNMENT") {
      claims = {
        organizationId: issueOrgId,
        role: claimRole,
        assignedPermissions: claimPermissions.split(",").map((p) => p.trim()),
      };
    } else if (issueType === "ASSET_AUTHORIZATION") {
      claims = {
        organizationId: issueOrgId,
        assetId: claimAssetId || "asset-001",
        assetName: claimAssetName || "Enterprise Asset",
        assetType: "DOCUMENT",
        classification: "CONFIDENTIAL",
        authorizedRoles: [claimRole],
        permissions: claimPermissions.split(",").map((p) => p.trim()),
      };
    } else if (issueType === "AUDITOR_AUTHORIZATION") {
      claims = {
        organizationId: issueOrgId,
        auditScope: claimAuditScope.split(",").map((s) => s.trim()),
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    const expDate = expiresInDays ? new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000).toISOString() : null;

    try {
      const res = await issueCredentialAction({
        type: issueType,
        subjectDid: subjectDid.trim(),
        organizationId: issueOrgId,
        claims,
        expiresAt: expDate,
      });

      if (!res.success || !res.record) {
        setIssueError(res.error || "Failed to issue credential");
        return;
      }

      const newRecord = {
        ...res.record,
        organization: userOrgs.find((o) => o.id === issueOrgId) || null,
        issuedBy: { id: currentUser.id, name: currentUser.name },
      };

      setCredentialsList([newRecord, ...credentialsList]);
      setIsIssueModalOpen(false);
      setSubjectDid("");
    } catch (err: unknown) {
      setIssueError(err instanceof Error ? err.message : "Failed to issue credential");
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // Revoke Credential Handler
  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCred) return;

    setIsSubmittingRevoke(true);
    try {
      const res = await revokeCredentialAction({
        credentialId: selectedCred.id,
        reason: revokeReason || "Revoked by administrative authority",
      });

      if (res.success && res.credential) {
        setCredentialsList((prev) =>
          prev.map((c) =>
            c.id === selectedCred.id
              ? {
                  ...c,
                  status: "REVOKED",
                  revokedAt: res.credential.revokedAt,
                  revocationReason: res.credential.revocationReason,
                }
              : c
          )
        );
        setIsRevokeModalOpen(false);
        setRevokeReason("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  // Standalone Verification
  const handleRunStandaloneVerification = async () => {
    if (!rawVcInput.trim()) return;
    setStandaloneVerifying(true);
    setStandaloneResult(null);

    try {
      const parsed = JSON.parse(rawVcInput);
      const res = await verifyCredentialAction(parsed);
      setStandaloneResult(res);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setStandaloneResult({
        valid: false,
        status: "REVOKED",
        checks: {
          hashValid: false,
          formatValid: false,
          notExpired: false,
          notRevoked: false,
          blockchainAnchored: false,
        },
        details: {
          calculatedHash: "",
          recordedHash: "",
          issuerDid: "",
          subjectDid: "",
          type: "ORGANIZATION_MEMBERSHIP",
          issuedAt: "",
        },
        error: "JSON Parse Error: " + errMsg,
      });
    } finally {
      setStandaloneVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
              <Award className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Verifiable Credentials
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            W3C-compliant digital credentials cryptographically anchored on Algorand with RFC 8785 canonical hashing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterTab("verify_tool")}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Verify Credential
          </button>
          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            Issue Credential
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0d14] border border-slate-200 dark:border-white/[0.06] shadow-xs">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Total Credentials
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0d14] border border-slate-200 dark:border-white/[0.06] shadow-xs">
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
            Active &amp; Verified
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0d14] border border-slate-200 dark:border-white/[0.06] shadow-xs">
          <div className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">
            Revoked
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.revoked}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0d14] border border-slate-200 dark:border-white/[0.06] shadow-xs">
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
            On-Chain Anchored
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.blockchainAnchored}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.08] pb-1">
        <button
          onClick={() => setFilterTab("all")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            filterTab === "all"
              ? "bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          All Credentials ({stats.total})
        </button>
        <button
          onClick={() => setFilterTab("active")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            filterTab === "active"
              ? "bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Active ({stats.active})
        </button>
        <button
          onClick={() => setFilterTab("revoked")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            filterTab === "revoked"
              ? "bg-rose-50 dark:bg-rose-600/20 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Revoked ({stats.revoked})
        </button>
        <button
          onClick={() => setFilterTab("verify_tool")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            filterTab === "verify_tool"
              ? "bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Cryptographic Verifier Tool
        </button>
      </div>

      {/* Main Content Area */}
      {filterTab === "verify_tool" ? (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0c0d14] border border-slate-200 dark:border-white/[0.06] space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Independent Verifiable Credential Validator
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Paste complete W3C-compliant JSON credential payload to verify cryptographic hash integrity, expiration, and revocation status.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Verifiable Credential (JSON format)
            </label>
            <textarea
              rows={8}
              value={rawVcInput}
              onChange={(e) => setRawVcInput(e.target.value)}
              placeholder="Paste JSON verifiable credential..."
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunStandaloneVerification}
              disabled={standaloneVerifying || !rawVcInput.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors"
            >
              {standaloneVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Verifying Cryptographic Proof...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Execute Full Verification
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (credentialsList.length > 0) {
                  const sample = credentialsList[0];
                  const sampleVc = {
                    credential: {
                      context: [
                        "https://www.w3.org/2018/credentials/v1",
                        "https://shield.trust/credentials/v1",
                      ],
                      id: `urn:uuid:${sample.id}`,
                      type: [sample.type],
                      issuer: {
                        id: sample.issuerDid,
                        organizationId: sample.organizationId,
                      },
                      issuanceDate: new Date(sample.issuedAt).toISOString(),
                      expirationDate: sample.expiresAt ? new Date(sample.expiresAt).toISOString() : null,
                      credentialSubject: {
                        id: sample.subjectDid,
                        claims: JSON.parse(sample.claims),
                      },
                    },
                    proof: {
                      type: "ShieldCanonicalSha256Proof2026",
                      created: new Date(sample.issuedAt).toISOString(),
                      verificationMethod: `${sample.issuerDid}#key-1`,
                      proofPurpose: "assertionMethod",
                      jcsSha256Hash: sample.credentialHash,
                      blockchainTxId: sample.blockchainTxId,
                    },
                  };
                  setRawVcInput(JSON.stringify(sampleVc, null, 2));
                }
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Load sample from latest issued credential
            </button>
          </div>

          {/* Verification Results display */}
          {standaloneResult && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {standaloneResult.valid ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      CRYPTOGRAPHICALLY VALID CREDENTIAL
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-500/20">
                      <XCircle className="w-3.5 h-3.5" />
                      VERIFICATION FAILED: {standaloneResult.status}
                    </div>
                  )}
                </div>
              </div>

              {standaloneResult.error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                  {standaloneResult.error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">RFC 8785 Canonical Hash Check</span>
                  {standaloneResult.checks.hashValid ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                      <XCircle className="w-3.5 h-3.5" /> Mismatch
                    </span>
                  )}
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">W3C Format &amp; DID Compliance</span>
                  {standaloneResult.checks.formatValid ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Compliant
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                      <XCircle className="w-3.5 h-3.5" /> Invalid Format
                    </span>
                  )}
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Expiration Validation</span>
                  {standaloneResult.checks.notExpired ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Not Expired
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                      <Clock className="w-3.5 h-3.5" /> Expired
                    </span>
                  )}
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Revocation Registry Check</span>
                  {standaloneResult.checks.notRevoked ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                      <XCircle className="w-3.5 h-3.5" /> Revoked
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filter and Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject DID, hash, type..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d14] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d14] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="ALL">All Credential Types</option>
                <option value="ORGANIZATION_MEMBERSHIP">Organization Membership</option>
                <option value="ROLE_ASSIGNMENT">Role Assignment</option>
                <option value="ASSET_AUTHORIZATION">Asset Authorization</option>
                <option value="AUDITOR_AUTHORIZATION">Auditor Authorization</option>
              </select>
            </div>
          </div>

          {/* Credentials Table / Cards */}
          {filteredCredentials.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0c0d14] border border-slate-200 dark:border-white/[0.06]">
              <Award className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">No verifiable credentials found</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Issue your first verifiable credential to cryptographically authorize members, roles, or assets.
              </p>
              <button
                onClick={() => setIsIssueModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Issue Credential
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredCredentials.map((cred) => {
                const claimsObj = JSON.parse(cred.claims);
                const isRevoked = cred.status === "REVOKED";

                return (
                  <div
                    key={cred.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#0c0d14] border border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12] transition-all shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-blue-50 dark:bg-blue-600/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
                          {cred.type.replace(/_/g, " ")}
                        </span>
                        {isRevoked ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            REVOKED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            ACTIVE
                          </span>
                        )}
                        {cred.organization?.name && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            • {cred.organization.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerifyCredential(cred)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/20 transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verify
                        </button>
                        {!isRevoked && (
                          <button
                            onClick={() => {
                              setSelectedCred(cred);
                              setIsRevokeModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>

                    {/* DIDs & Hashes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">Subject DID: </span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">
                          {cred.subjectDid}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">JCS Hash: </span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                          {cred.credentialHash.slice(0, 16)}...{cred.credentialHash.slice(-8)}
                        </span>
                        <button
                          onClick={() => handleCopy(cred.credentialHash, `hash-${cred.id}`)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          title="Copy Full Hash"
                        >
                          {copiedId === `hash-${cred.id}` ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Claims Preview */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] text-xs">
                      <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Claims Data:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(claimsObj).map(([key, value]) => (
                          <span
                            key={key}
                            className="px-2 py-0.5 rounded bg-white dark:bg-black/30 border border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-slate-300 font-mono text-[11px]"
                          >
                            {key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                      <div>
                        Issued: {new Date(cred.issuedAt).toLocaleDateString()}
                        {cred.expiresAt && ` • Expires: ${new Date(cred.expiresAt).toLocaleDateString()}`}
                      </div>

                      {cred.blockchainTxId && (
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Algorand Tx: {cred.blockchainTxId.slice(0, 10)}...</span>
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

      {/* Issue Credential Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                Issue New Verifiable Credential
              </h3>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {issueError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                {issueError}
              </div>
            )}

            <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Credential Type
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as CredentialType)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="ORGANIZATION_MEMBERSHIP">Organization Membership</option>
                  <option value="ROLE_ASSIGNMENT">Role Assignment</option>
                  <option value="ASSET_AUTHORIZATION">Asset Authorization</option>
                  <option value="AUDITOR_AUTHORIZATION">Auditor Authorization</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Issuing Organization
                </label>
                <select
                  value={issueOrgId}
                  onChange={(e) => setIssueOrgId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/40"
                >
                  {userOrgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Subject DID (Recipient)
                </label>
                <input
                  type="text"
                  required
                  placeholder="did:shield:user:... or did:algo:..."
                  value={subjectDid}
                  onChange={(e) => setSubjectDid(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              {/* Dynamic Claim Fields */}
              {issueType === "ORGANIZATION_MEMBERSHIP" && (
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Membership Role
                  </label>
                  <input
                    type="text"
                    value={claimRole}
                    onChange={(e) => setClaimRole(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {issueType === "ROLE_ASSIGNMENT" && (
                <div className="space-y-2">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Role
                    </label>
                    <input
                      type="text"
                      value={claimRole}
                      onChange={(e) => setClaimRole(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Permissions (comma separated)
                    </label>
                    <input
                      type="text"
                      value={claimPermissions}
                      onChange={(e) => setClaimPermissions(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {issueType === "ASSET_AUTHORIZATION" && (
                <div className="space-y-2">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Asset Identifier / Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DOC-2026-001"
                      value={claimAssetName}
                      onChange={(e) => setClaimAssetName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Authorized Permissions
                    </label>
                    <input
                      type="text"
                      value={claimPermissions}
                      onChange={(e) => setClaimPermissions(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Validity Period (Days)
                </label>
                <input
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIssue}
                  className="inline-flex items-center gap-2 px-4 py-2 font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-xs"
                >
                  {isSubmittingIssue ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Issuing &amp; Anchoring...
                    </>
                  ) : (
                    "Issue Credential"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect & Verify Modal */}
      {isInspectModalOpen && selectedCred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Credential Verification Report
              </h3>
              <button
                onClick={() => setIsInspectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {isVerifying ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Executing RFC 8785 canonical hash verification &amp; checking Algorand ledger...
                </p>
              </div>
            ) : verificationResult ? (
              <div className="space-y-4 text-xs">
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    verificationResult.valid
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {verificationResult.valid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    )}
                    <span>
                      {verificationResult.valid
                        ? "VERIFIED — IMMUTABLE CRYPTOGRAPHIC PROOF CONFIRMED"
                        : `FAILED — STATUS: ${verificationResult.status}`}
                    </span>
                  </div>
                </div>

                {/* 5-point check details */}
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                    <span>Canonical JCS SHA-256 Hash Integrity</span>
                    {verificationResult.checks.hashValid ? (
                      <span className="text-emerald-500 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 100% Match
                      </span>
                    ) : (
                      <span className="text-rose-500 font-medium flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Hash Mismatch
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                    <span>W3C VC Format &amp; DID Syntax</span>
                    {verificationResult.checks.formatValid ? (
                      <span className="text-emerald-500 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Compliant
                      </span>
                    ) : (
                      <span className="text-rose-500 font-medium flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Invalid Syntax
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                    <span>Expiration Status</span>
                    {verificationResult.checks.notExpired ? (
                      <span className="text-emerald-500 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active (Not Expired)
                      </span>
                    ) : (
                      <span className="text-amber-500 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Expired
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                    <span>Revocation Registry Check</span>
                    {verificationResult.checks.notRevoked ? (
                      <span className="text-emerald-500 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Valid &amp; Active
                      </span>
                    ) : (
                      <span className="text-rose-500 font-medium flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Revoked: {verificationResult.details.revocationReason}
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                    <span>Algorand Blockchain Anchor</span>
                    {verificationResult.checks.blockchainAnchored ? (
                      <span className="text-blue-500 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed on TestNet
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">Off-chain only</span>
                    )}
                  </div>
                </div>

                {/* Raw JSON VC Viewer */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      W3C Verifiable Credential Payload:
                    </span>
                    <button
                      onClick={() => handleCopy(JSON.stringify(selectedCred, null, 2), "modal-json")}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy JSON
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 dark:bg-black/50 text-[11px] font-mono overflow-x-auto max-h-48 border border-white/[0.06]">
                    {JSON.stringify(
                      {
                        credential: {
                          context: [
                            "https://www.w3.org/2018/credentials/v1",
                            "https://shield.trust/credentials/v1",
                          ],
                          id: `urn:uuid:${selectedCred.id}`,
                          type: [selectedCred.type],
                          issuer: {
                            id: selectedCred.issuerDid,
                            organizationId: selectedCred.organizationId,
                          },
                          issuanceDate: new Date(selectedCred.issuedAt).toISOString(),
                          expirationDate: selectedCred.expiresAt
                            ? new Date(selectedCred.expiresAt).toISOString()
                            : null,
                          credentialSubject: {
                            id: selectedCred.subjectDid,
                            claims: JSON.parse(selectedCred.claims),
                          },
                        },
                        proof: {
                          type: "ShieldCanonicalSha256Proof2026",
                          jcsSha256Hash: selectedCred.credentialHash,
                          blockchainTxId: selectedCred.blockchainTxId,
                        },
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Revoke Credential Modal */}
      {isRevokeModalOpen && selectedCred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Revoke Verifiable Credential
              </h3>
              <button
                onClick={() => setIsRevokeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Revoking this credential will mark it permanently invalid across the SHIELD verification network and anchor the revocation event on Algorand.
            </p>

            <form onSubmit={handleRevokeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Revocation Reason
                </label>
                <textarea
                  required
                  rows={3}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Employee departed organization, key compromised, privilege altered..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/40"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsRevokeModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRevoke}
                  className="inline-flex items-center gap-2 px-4 py-2 font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-xs"
                >
                  {isSubmittingRevoke ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Revoking on Blockchain...
                    </>
                  ) : (
                    "Confirm Revocation"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
