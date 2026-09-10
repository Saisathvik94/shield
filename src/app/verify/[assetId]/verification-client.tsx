"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Package,
  Building2,
  User,
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
  QrCode,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { classificationColor, copyWithToast, cn, getVerificationUrl } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { AdvancedAssetVerificationResult, VerificationCheckPoint } from "@/lib/verification/asset-verifier";

interface Props {
  assetId: string;
  verificationResult: AdvancedAssetVerificationResult;
  isAuthenticated: boolean;
}

export function VerificationClient({
  assetId,
  verificationResult,
  isAuthenticated,
}: Props) {
  const { overallStatus, trustScore, points, assetSummary, verifiedAt } = verificationResult;
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    const url = getVerificationUrl(assetSummary?.assetId || assetId);
    QRCode.toDataURL(url, { width: 280, margin: 2 })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [assetId, assetSummary?.assetId]);

  const handleCopy = (text: string, id: string) => {
    copyWithToast(text, "Verification Data");
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDownloadCertificate = () => {
    const cert = {
      title: "SHIELD Verifiable Trust Certificate",
      assetId: assetSummary?.assetId || assetId,
      assetName: assetSummary?.name,
      organization: assetSummary?.organizationName,
      trustScore: `${trustScore}%`,
      status: overallStatus,
      verifiedAt,
      verificationEngine: "SHIELD-P0-Engine-v1.0",
      blockchainTxId: assetSummary?.blockchainTxId,
      ipfsCid: assetSummary?.ipfsCid,
      points,
    };
    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shield-verification-${assetSummary?.assetId || assetId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusConfig = {
    TRUSTED: {
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/25",
      badgeBg: "bg-emerald-500 text-white",
      icon: ShieldCheck,
      headline: "Cryptographically Verified & Trusted",
      subline: "All 7 verification checkpoints passed with immutable on-chain consensus.",
    },
    WARNING: {
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/25",
      badgeBg: "bg-amber-500 text-white",
      icon: AlertTriangle,
      headline: "Partial Verification / Warning Flags",
      subline: "Some non-critical verification checkpoints require administrator review.",
    },
    COMPROMISED: {
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/25",
      badgeBg: "bg-rose-500 text-white",
      icon: ShieldAlert,
      headline: "Verification Compromised / Tamper Detected",
      subline: "Critical verification failure detected (asset revoked or hash mismatch).",
    },
    NOT_FOUND: {
      color: "text-slate-500",
      bg: "bg-slate-500/10 border-slate-500/25",
      badgeBg: "bg-slate-500 text-white",
      icon: XCircle,
      headline: "Asset Not Found",
      subline: "No record found in the SHIELD registry.",
    },
  }[overallStatus];

  const StatusIcon = statusConfig.icon;

  const pointsList: VerificationCheckPoint[] = [
    points.registry,
    points.blockchainAnchor,
    points.asaConsensus,
    points.metadataParity,
    points.lifecycleState,
    points.custodyConsistency,
    points.documentIntegrity,
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090a10] px-4 py-10 text-slate-800 dark:text-slate-200 transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 shadow-md shadow-blue-500/20">
              <Shield className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight">SHIELD</span>
            <span className="text-slate-500 text-xs hidden sm:inline">/ Verifiable Trust Portal</span>
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

        {/* Verification Status Banner */}
        <div className={cn("p-6 rounded-3xl border shadow-sm space-y-4", statusConfig.bg)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-white dark:bg-black/30 shadow-xs">
                <StatusIcon className={cn("w-7 h-7", statusConfig.color)} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase", statusConfig.badgeBg)}>
                    {overallStatus}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Verified: {new Date(verifiedAt).toLocaleTimeString()}
                  </span>
                </div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {statusConfig.headline}
                </h1>
              </div>
            </div>

            {/* Trust Score Indicator */}
            <div className="flex items-center sm:flex-col items-end gap-1 shrink-0">
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {trustScore}<span className="text-sm font-semibold text-slate-500 dark:text-slate-400">/100</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Trust Score</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            {statusConfig.subline}
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-200/50 dark:border-white/[0.06]">
            <button
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.1] transition-colors shadow-2xs"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              QR Code
            </button>
            <button
              onClick={handleDownloadCertificate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.1] transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Evidence Certificate (JSON)
            </button>
            {assetSummary?.blockchainTxId && (
              <a
                href={`https://testnet.explorer.perawallet.app/tx/${assetSummary.blockchainTxId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-2xs ml-auto"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Algorand TestNet
              </a>
            )}
          </div>
        </div>

        {/* Asset Summary Card */}
        {assetSummary && (
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c0d14] border border-slate-200 dark:border-white/[0.06] shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {assetSummary.assetId}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400">
                    {assetSummary.assetType}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase", classificationColor(assetSummary.classification))}>
                    {assetSummary.classification}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {assetSummary.name}
                </h2>
                {assetSummary.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {assetSummary.description}
                  </p>
                )}
              </div>

              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.03] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.06]">
                {assetSummary.organizationName}
              </span>
            </div>

            {/* Cryptographic Identifiers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.04] text-xs">
              {assetSummary.blockchainTxId && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Blockchain Anchor TX:</span>
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-900 dark:text-white">
                    <span className="truncate">{assetSummary.blockchainTxId}</span>
                    <button
                      onClick={() => handleCopy(assetSummary.blockchainTxId!, "txid")}
                      className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {copiedText === "txid" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {assetSummary.ipfsCid && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">IPFS Immutable CID:</span>
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-900 dark:text-white">
                    <span className="truncate">{assetSummary.ipfsCid}</span>
                    <button
                      onClick={() => handleCopy(assetSummary.ipfsCid!, "cid")}
                      className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {copiedText === "cid" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7-Point Verification Checkpoints Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              7-Point Cryptographic Verification Engine
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {pointsList.filter((p) => p.status === "PASSED").length} of 7 Passed
            </span>
          </div>

          <div className="space-y-2">
            {pointsList.map((point) => {
              const isExpanded = expandedPoint === point.id;
              const pointStatus = {
                PASSED: {
                  icon: CheckCircle2,
                  color: "text-emerald-500",
                  badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                },
                WARNING: {
                  icon: AlertTriangle,
                  color: "text-amber-500",
                  badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                },
                FAILED: {
                  icon: XCircle,
                  color: "text-rose-500",
                  badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                },
                SKIPPED: {
                  icon: Clock,
                  color: "text-slate-400",
                  badge: "bg-slate-500/10 text-slate-500 border-slate-500/20",
                },
              }[point.status];

              const PIcon = pointStatus.icon;

              return (
                <div
                  key={point.id}
                  className="rounded-2xl bg-white dark:bg-[#0c0d14] border border-slate-200 dark:border-white/[0.06] overflow-hidden shadow-xs transition-all"
                >
                  <button
                    onClick={() => setExpandedPoint(isExpanded ? null : point.id)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <PIcon className={cn("w-5 h-5 shrink-0", pointStatus.color)} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {point.name}
                          </span>
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold uppercase border", pointStatus.badge)}>
                            {point.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {point.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50/40 dark:bg-black/20 text-xs space-y-2">
                      {point.errorMessage && (
                        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                          {point.errorMessage}
                        </div>
                      )}
                      <div className="font-semibold text-slate-700 dark:text-slate-300">
                        Technical Evidence &amp; Verification Details:
                      </div>
                      <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 dark:bg-black/50 text-[11px] font-mono overflow-x-auto border border-white/[0.06]">
                        {JSON.stringify(point.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-4">
          SHIELD Verifiable Trust Infrastructure • Immutable Algorand Proof Protocol
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 text-center space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Verification QR Code
              </h3>
              <button
                onClick={() => setQrModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scan this QR code with any mobile camera to instantly verify this asset on the SHIELD network.
            </p>

            {qrDataUrl && (
              <div className="p-4 bg-white rounded-2xl inline-block shadow-xs border border-slate-200">
                <img src={qrDataUrl} alt="Asset Verification QR Code" className="w-48 h-48 mx-auto" />
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-left">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Public Verification URL</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-mono text-blue-600 dark:text-blue-400 truncate">
                  {getVerificationUrl(assetSummary?.assetId || assetId)}
                </p>
                <button
                  onClick={() => copyWithToast(getVerificationUrl(assetSummary?.assetId || assetId), "Verification URL")}
                  className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-600 dark:text-slate-300 shrink-0"
                  title="Copy link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={qrDataUrl}
                download={`shield-qr-${assetSummary?.assetId || assetId}.png`}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors w-full justify-center"
              >
                <Download className="w-3.5 h-3.5" />
                Download QR Code Image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
