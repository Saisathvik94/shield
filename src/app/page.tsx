import { auth } from "@/lib/auth";
import Link from "next/link";
import {
  Shield,
  Fingerprint,
  Building2,
  Package,
  ScrollText,
  ArrowRight,
  FileCheck2,
  Key,
  Users2,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  Lock,
  Globe,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { HeroProductCanvas } from "@/components/landing/hero-canvas";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0c0d12] text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200 font-sans">
      {/* ─── Notion × Apple Floating Nav ──────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-black/[0.05] dark:border-white/[0.08] bg-white/80 dark:bg-[#0c0d12]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 shadow-md shadow-blue-500/25 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" strokeWidth={2.2} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight">SHIELD</span>
              <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 font-medium">
                v1.2 · Enterprise Trust
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-600 dark:text-slate-400">
            <a href="#canvas" className="hover:text-slate-900 dark:hover:text-white transition-colors">Platform Canvas</a>
            <a href="#quorum" className="hover:text-slate-900 dark:hover:text-white transition-colors">Multi-Party Quorum</a>
            <a href="#risk-engine" className="hover:text-slate-900 dark:hover:text-white transition-colors">Risk Engine</a>
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Capabilities</a>
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">Workflow</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {session?.user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold transition-all shadow-xs"
              >
                <span>Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-500/20"
                >
                  <span>Connect Wallet</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero Section (Apple Typography × Notion Warmth) ─────────── */}
      <section className="relative overflow-hidden pt-16 sm:pt-24 pb-16 px-6">
        {/* Soft Radial Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-blue-500/8 dark:bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          {/* Status Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 text-xs font-medium shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Algorand TestNet &amp; IPFS Live Ecosystem</span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">P1 Quorum Enabled</span>
          </div>

          {/* Heading - EXACT TEXT REQUESTED */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-slate-900 dark:text-white tracking-[-0.03em] leading-[1.08]">
            Blockchain-Backed Secure Identity
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 dark:from-blue-400 dark:via-sky-300 dark:to-indigo-300">
              &amp; Asset Management
            </span>
          </h1>

          {/* Subheading - EXACT TEXT REQUESTED */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
            SHIELD gives every user one cryptographic identity tied to their Algorand wallet. Manage organizations, control access, register assets, and anchor every critical action immutably on-chain.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/25"
            >
              <Shield className="w-4 h-4" />
              <span>Launch SHIELD Console</span>
            </Link>
            <a
              href="/verify/IDEA-VALID-001"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm font-medium transition-all shadow-xs"
            >
              <span>Public 7-Point Verifier</span>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>
          </div>

          {/* Institutional Trust Stats */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-200/80 dark:border-white/[0.08] max-w-3xl mx-auto">
            <div className="p-3 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">100%</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Non-Custodial DID</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">&lt; 3.8s</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Algorand Finality</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">RFC 8785</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Canonical Action Digest</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">Zero</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Stored Passwords</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Interactive Product Canvas (Notion / Apple Device Showcase) ── */}
      <section id="canvas" className="max-w-6xl mx-auto px-6 py-12">
        <HeroProductCanvas />
      </section>

      {/* ─── Architectural Pillars (Bento Grid) ─────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Enterprise Trust Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-[-0.02em]">
            From Passive Detection to Cryptographic Prevention
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-normal">
            Every layer of SHIELD is designed to eliminate single points of failure, admin abuse, and silent data tampering.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Multi-Party Quorum */}
          <div className="p-7 rounded-3xl bg-white dark:bg-[#12131d] border border-slate-200/80 dark:border-white/[0.06] hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all shadow-xs space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-300">
              <Users2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              M-of-N Cryptographic Quorum
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Eliminate unilateral admin takeovers. Critical asset mutations require an M-of-N quorum signed by independent Algorand keys via Pera Wallet.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400">
              <span>Anti-Self-Approval</span>
              <span>·</span>
              <span>Anti-Replay</span>
            </div>
          </div>

          {/* Card 2: Deterministic Risk Engine */}
          <div className="p-7 rounded-3xl bg-white dark:bg-[#12131d] border border-slate-200/80 dark:border-white/[0.06] hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all shadow-xs space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Deterministic Risk &amp; Trust Engine
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              No black-box hallucinations. Evaluates real-time SHA-256 tamper checks, W3C credential revocations, and 24h audit velocity into an explainable 0–100 score.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-indigo-600 dark:text-indigo-400">
              <span>ALLOW / REQUIRE / BLOCK</span>
            </div>
          </div>

          {/* Card 3: W3C Decentralized Identity */}
          <div className="p-7 rounded-3xl bg-white dark:bg-[#12131d] border border-slate-200/80 dark:border-white/[0.06] hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all shadow-xs space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
              <Fingerprint className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Sovereign DID &amp; Passwordless Auth
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Every employee and organization receives a W3C-standard DID (<code className="text-xs font-mono">did:shield:...</code>) authenticated via cryptographic wallet signatures.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
              <span>W3C DID Core 1.0</span>
            </div>
          </div>

          {/* Card 4: Verifiable Credentials */}
          <div className="p-7 rounded-3xl bg-white dark:bg-[#12131d] border border-slate-200/80 dark:border-white/[0.06] hover:border-sky-500/30 dark:hover:border-sky-500/30 transition-all shadow-xs space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-600/20 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-300">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              W3C Verifiable Credentials
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Issue tamper-evident clearances (<code className="text-xs font-mono">SecurityClearanceCredential</code>). Revoking an identity instantly updates the risk engine and blocks mutation.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
              <span>Instant Revocation</span>
            </div>
          </div>

          {/* Card 5: IPFS Decentralized Pinning */}
          <div className="p-7 rounded-3xl bg-white dark:bg-[#12131d] border border-slate-200/80 dark:border-white/[0.06] hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-all shadow-xs space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-600/20 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-300">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              IPFS &amp; Algorand Dual Anchoring
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Documents are content-addressed and pinned to IPFS while transaction rounds and state notes anchor permanently onto Algorand TestNet.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-amber-600 dark:text-amber-400">
              <span>SHA-256 + IPFS CID</span>
            </div>
          </div>

          {/* Card 6: Zero Knowledge 7-Point Verifier */}
          <div className="p-7 rounded-3xl bg-white dark:bg-[#12131d] border border-slate-200/80 dark:border-white/[0.06] hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all shadow-xs space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Public 7-Point Verifier
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Zero-knowledge client-side file drag-and-drop verification. Prove document authenticity without uploading sensitive data to any server.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
              <span>7 Verification Proofs</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works (Notion Step-by-Step Flow) ────────────────────── */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20 border-t border-slate-200/80 dark:border-white/[0.08]">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            End-to-End Governance
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-[-0.02em]">
            How Enterprises Run on SHIELD
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            A frictionless journey connecting sovereign cryptographic keys to organizational operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#12131d] border border-slate-200/80 dark:border-white/[0.06] space-y-2.5 shadow-xs">
            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">01 / AUTH</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Wallet Handshake</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Connect Pera Wallet and sign a time-bounded challenge to verify Ed25519 key ownership.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#12131d] border border-slate-200/80 dark:border-white/[0.06] space-y-2.5 shadow-xs">
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">02 / STRUCTURE</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Org Hierarchy &amp; RBAC</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Join departments and teams with assigned roles (Owner, Admin, Manager, User, Auditor).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#12131d] border border-slate-200/80 dark:border-white/[0.06] space-y-2.5 shadow-xs">
            <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">03 / GOVERNANCE</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">M-of-N Quorums</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Critical asset transfers and revocations are evaluated by the risk engine and multi-signed.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#12131d] border border-slate-200/80 dark:border-white/[0.06] space-y-2.5 shadow-xs">
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">04 / VERIFY</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">7-Point Proofs</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Publicly verify genesis hashes, IPFS attachments, and on-chain Algorand transaction notes.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Apple-Style Clean Call to Action ───────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-slate-900 text-white dark:bg-gradient-to-b dark:from-[#151624] dark:to-[#0f1019] border border-slate-800 dark:border-white/[0.08] p-8 sm:p-14 text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
            <Shield className="w-6 h-6 text-white" strokeWidth={2.2} />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Upgrade Your Enterprise to Verifiable Trust
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Zero passwords, zero unilateral admin risk, and mathematical certainty for your high-value digital and physical assets.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-md shadow-blue-500/25"
            >
              <span>Connect Wallet &amp; Launch Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://testnet.explorer.perawallet.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-all"
            >
              <span>Algorand Explorer</span>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </div>
      </section>

      {/* ─── Notion-Style Minimalist Footer ─────────────────────────────── */}
      <footer className="border-t border-slate-200/80 dark:border-white/[0.08] py-10 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Shield className="w-3 h-3" />
            </div>
            <span className="font-semibold text-slate-900 dark:text-slate-200">SHIELD</span>
            <span>- Verifiable Trust Infrastructure</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Algorand TestNet
            </span>
            <span>·</span>
            <span>Pinata IPFS Gateway</span>
            <span>·</span>
            <span>RFC 8785 Canonical</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
