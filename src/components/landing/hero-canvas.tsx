"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users2,
  Activity,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  KeyRound,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "quorum" | "risk" | "verifier";

export function HeroProductCanvas() {
  const [activeTab, setActiveTab] = useState<TabKey>("quorum");

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl border border-slate-200/90 dark:border-white/[0.1] bg-white/70 dark:bg-[#0f1017]/80 backdrop-blur-xl shadow-2xl shadow-slate-200/50 dark:shadow-black/60 overflow-hidden transition-all duration-200">
      {/* Window Titlebar (Apple Style) */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#141520]/80">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            shield.console // live-governance-engine
          </span>
        </div>

        {/* Tab Switcher (Notion Style) */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/60 dark:bg-white/[0.06] text-xs font-medium">
          <button
            onClick={() => setActiveTab("quorum")}
            className={cn(
              "px-3 py-1 rounded-lg transition-all flex items-center gap-1.5",
              activeTab === "quorum"
                ? "bg-white dark:bg-[#1f2030] text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Users2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>M-of-N Quorum (P1)</span>
          </button>

          <button
            onClick={() => setActiveTab("risk")}
            className={cn(
              "px-3 py-1 rounded-lg transition-all flex items-center gap-1.5",
              activeTab === "risk"
                ? "bg-white dark:bg-[#1f2030] text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Risk Engine (P1)</span>
          </button>

          <button
            onClick={() => setActiveTab("verifier")}
            className={cn(
              "px-3 py-1 rounded-lg transition-all flex items-center gap-1.5",
              activeTab === "verifier"
                ? "bg-white dark:bg-[#1f2030] text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>7-Point Verifier</span>
          </button>
        </div>
      </div>

      {/* Canvas Body */}
      <div className="p-6 sm:p-8">
        {activeTab === "quorum" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Header / Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20">
                    SECRET ASSET
                  </span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    AST-DEFENSE-RADAR-001
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> QUORUM EXECUTED
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Custody Transfer Authorization Request
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Target Custodian: <span className="font-medium text-slate-800 dark:text-slate-200">Dr. Elena Rostova (Chief Scientist)</span> · Initiated by Operations Lead
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-600/10 border border-blue-200/80 dark:border-blue-500/20 text-right">
                <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300">Quorum Progress</p>
                <p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">2 / 2 Signatures</p>
                <div className="w-28 h-1.5 bg-blue-200 dark:bg-blue-950 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full w-full" />
                </div>
              </div>
            </div>

            {/* Quorum Signers & Canonical Digest */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Signers Column */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#13141f] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Verified Algorand Signers
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">2 OF 2 VALID</span>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                        AD
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Admin / Security Lead</p>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                          ALGO...49F2 · Ed25519
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      Verified ✓
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">
                        OW
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Executive Owner</p>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                          ALGO...91B0 · Ed25519
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      Verified ✓
                    </span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Digest Column */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#13141f] border border-slate-200/80 dark:border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    RFC 8785 Canonical Action Digest
                  </span>
                  <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">SHA-256</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto space-y-1">
                  <p className="text-slate-500 text-[10px]">// Domain Separated Sign Preamble</p>
                  <p className="text-blue-300 font-semibold truncate">
                    SHIELD-APPROVAL:a78f8e21bc90d34e...
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    State Hash: 8b1a3e... · Invalidation Protected
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span>Algorand Settlement Round:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">#38,912,404</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "risk" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Risk Gauge & Explainable Decision */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-5 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex flex-col items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-sm">
                  <span className="text-xl font-black font-mono">95</span>
                  <span className="text-[9px] uppercase font-bold tracking-wider">Trust Score</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Deterministic Risk &amp; Trust Evaluation
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      DECISION: ALLOW
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Evaluated against 5 real-time cryptographic signals (Zero heuristic black-boxes).
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Risk Index: <strong className="text-slate-900 dark:text-white font-mono">5 / 100 (LOW)</strong>
                </span>
              </div>
            </div>

            {/* 5 Real-Time Signal Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <span>1. File Hash Check</span>
                  <span className="text-emerald-600 dark:text-emerald-400">MATCH ✓</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  SHA-256 matches on-chain genesis hash byte-for-byte.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <span>2. W3C Credential Status</span>
                  <span className="text-emerald-600 dark:text-emerald-400">ACTIVE ✓</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Security Clearance VC verified &amp; non-revoked.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <span>3. Algorand Anchor Round</span>
                  <span className="text-emerald-600 dark:text-emerald-400">CONFIRMED ✓</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Confirmed on Algorand TestNet with state note proof.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <span>4. 24h Audit Velocity</span>
                  <span className="text-emerald-600 dark:text-emerald-400">NORMAL (0 Anomaly)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  No brute force or permission violation spikes detected.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-1 sm:col-span-2 lg:col-span-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <span>5. Explainable Mitigations</span>
                  <span className="text-blue-600 dark:text-blue-400">P1 READY</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Asset classification requires M-of-N quorum only when mutations (transfers/revocations) occur.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "verifier" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Verifier Overview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
                    PUBLIC VERIFICATION PORTAL
                  </span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    did:shield:asset:IDEA-VALID-001
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  7-Point Cryptographic Integrity Verifier
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Zero-Knowledge Client-Side WebCrypto check directly against the Algorand blockchain.
                </p>
              </div>

              <Link
                href="/verify/IDEA-VALID-001"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-500/20 self-start sm:self-auto"
              >
                <span>Try Live Verifier</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Checklist of 7 points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: "Point 1: Registry Verification", desc: "Asset record and organization hierarchy verified in SHIELD registry." },
                { title: "Point 2: Blockchain Anchor Check", desc: "Algorand TestNet transaction round and genesis note confirmed." },
                { title: "Point 3: ASA Consensus", desc: "Algorand Standard Asset token parity validated." },
                { title: "Point 4: IPFS Metadata Parity", desc: "Decentralized content-addressed CID matches live storage." },
                { title: "Point 5: Lifecycle Validation", desc: "Asset is in active state without administrative revocations." },
                { title: "Point 6: Custody Consistency", desc: "Current holder matched against W3C DID of custodian." },
                { title: "Point 7: Document Byte Integrity", desc: "Client-side SHA-256 checksum proves zero tamper byte changes." },
              ].map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06]"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{point.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{point.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Banner */}
      <div className="px-6 py-3.5 bg-slate-100/80 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-mono text-[11px]">Algorand TestNet Round #38,912,404 · Pinata IPFS Cluster Connected</span>
        </div>
        <Link
          href="/login"
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
        >
          <span>Connect Pera Wallet to start</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
