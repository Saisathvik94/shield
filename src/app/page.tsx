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
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090a10] text-slate-900 dark:text-slate-200 selection:bg-blue-600 selection:text-white transition-colors duration-150">
      {/* ─── Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#090a10]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 shadow-md shadow-blue-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight">SHIELD</span>
            <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium">
              Enterprise Trust Platform
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Capabilities</a>
            <a href="#architecture" className="hover:text-slate-900 dark:hover:text-white transition-colors">Architecture</a>
            <a href="#security" className="hover:text-slate-900 dark:hover:text-white transition-colors">Trust Model</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {session?.user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-md shadow-blue-500/20"
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-md shadow-blue-500/20"
                >
                  <span>Connect Wallet</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-24 px-6">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-500/10 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 text-xs font-medium shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>Algorand TestNet &amp; IPFS Live Ecosystem</span>
          </div>

          {/* Heading as explicitly requested */}
          <h1 className="text-4xl sm:text-6xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
            Blockchain-Backed Secure Identity
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 dark:from-blue-400 dark:via-sky-300 dark:to-indigo-300">
              &amp; Asset Management
            </span>
          </h1>

          {/* Subheading as explicitly requested */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            SHIELD gives every user one cryptographic identity tied to their Algorand wallet. Manage organizations, control access, register assets, and anchor every critical action immutably on-chain.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/25"
            >
              <Shield className="w-4 h-4" />
              <span>Launch SHIELD Console</span>
            </Link>
            <a
              href="#architecture"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm font-medium transition-all shadow-xs"
            >
              <span>Explore Architecture</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Institutional Trust Metrics */}
          <div className="pt-16 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-200 dark:border-white/[0.08] max-w-3xl mx-auto">
            <div className="p-3 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono">100%</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Non-Custodial DID</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono">&lt; 3.8s</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Algorand Finality</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono">SHA-256</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">IPFS Tamper Proof</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono">Zero</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Stored Passwords</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Capabilities Section ──────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Institutional-Grade Capabilities
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Engineered for high-assurance enterprise defense, multi-department administration, and public verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={Fingerprint}
            title="Decentralized DID & Wallet Auth"
            description="Users authenticate cryptographically using Pera Wallet without passwords. Decentralized Identifiers (DID) bind digital credentials to sovereign keys."
          />
          <FeatureCard
            icon={Package}
            title="NFT-Backed Asset Passports"
            description="Register physical or digital assets into Algorand Standard Assets (ASA). Maintain full provenance, classification levels, and custodian assignments."
          />
          <FeatureCard
            icon={FileCheck2}
            title="IPFS Document Integrity"
            description="Attach sensitive specs, warranties, and certificates via decentralized IPFS pinning. Detect any byte-level tampering using SHA-256 checksums."
          />
          <FeatureCard
            icon={Building2}
            title="Multi-Tenant Organizations"
            description="Manage deep organizational hierarchies across departments, sections, and teams with strict tenant isolation and department heads."
          />
          <FeatureCard
            icon={Key}
            title="Granular RBAC & Custody Transfers"
            description="Multi-tier permissions (Owner, Admin, Manager, Member, Auditor) combined with dual-approval workflows for high-value asset transfers."
          />
          <FeatureCard
            icon={ScrollText}
            title="Immutable Algorand Audit Trail"
            description="Every administrative update, transfer, and document upload anchors a transaction hash on Algorand for permanent compliance verification."
          />
        </div>
      </section>

      {/* ─── Architecture Section ──────────────────────────────────────── */}
      <section id="architecture" className="max-w-5xl mx-auto px-6 py-20 border-t border-slate-200 dark:border-white/[0.08]">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            How SHIELD Secures Operations
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            A frictionless workflow bridging cryptographic consensus with enterprise day-to-day management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StepItem
            step="01"
            title="Wallet Handshake"
            description="Sign a cryptographic nonce via Pera Wallet to establish a secure session."
          />
          <StepItem
            step="02"
            title="Join Organization"
            description="Accept invitation tokens into departmental workspaces with designated RBAC roles."
          />
          <StepItem
            step="03"
            title="Register & Pin Assets"
            description="Tokenize assets into Algorand ASAs and attach SHA-256 verified IPFS files."
          />
          <StepItem
            step="04"
            title="Audit & Public Verify"
            description="Scan QR verification passports or audit immutable on-chain transaction hashes."
          />
        </div>
      </section>

      {/* ─── Call to Action ────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-white dark:bg-gradient-to-b dark:from-[#12131e] dark:to-[#0d0e15] border border-slate-200 dark:border-white/[0.08] p-8 sm:p-12 text-center space-y-6 relative overflow-hidden shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
            <Shield className="w-6 h-6 text-white" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Ready to Upgrade Enterprise Trust?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Experience passwordless wallet authentication, decentralized asset passports, and immutable audit logs today.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-md shadow-blue-500/20"
            >
              <span>Get Started with SHIELD</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-white/[0.08] py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-300">SHIELD</span>
            <span>— Blockchain-Backed Identity &amp; Asset Trust</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-600">
            Powered by Algorand Blockchain · IPFS Decentralized Storage · Next.js
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1017] border border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12] transition-all space-y-3 shadow-xs">
      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StepItem({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#0f1017] border border-slate-200/80 dark:border-white/[0.06] space-y-2 shadow-xs">
      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{step}</span>
      <h3 className="text-xs font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
