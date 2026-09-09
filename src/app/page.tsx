import { auth } from "@/lib/auth";
import Link from "next/link";
import {
  ShieldIcon,
  Fingerprint,
  Building2,
  Package,
  ScrollText,
  ArrowRight,
  CheckCircle2,
  Link2,
  QrCode,
  Lock,
  Cpu,
  FileCheck,
} from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* ─── Nav ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.06] sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600">
              <ShieldIcon className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-semibold text-white tracking-tight">SHIELD</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#stack" className="hover:text-white transition-colors">Tech Stack</a>
          </nav>

          <div className="flex items-center gap-3">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/20"
              >
                Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/20"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          SIH 2026 · Problem Statement SIH26125 · BEL
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
          Blockchain-Backed{" "}
          <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            Secure Identity
          </span>
          <br />
          &amp; Asset Management
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          SHIELD gives every user one cryptographic identity tied to their Algorand wallet.
          Manage organizations, control access, register assets, and anchor every critical
          action immutably on-chain.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/25 text-sm"
          >
            <ShieldIcon className="w-4 h-4" strokeWidth={1.5} />
            Connect Wallet &amp; Start
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.10] text-gray-300 hover:text-white hover:bg-white/[0.05] transition-all text-sm"
          >
            See how it works <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 pt-10 border-t border-white/[0.06]">
          {[
            { value: "Algorand", label: "Trust layer" },
            { value: "IPFS", label: "File storage" },
            { value: "16 tables", label: "PostgreSQL schema" },
            { value: "No passwords", label: "Wallet-only auth" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">Everything in one platform</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm">
            From cryptographic identity to physical asset verification - SHIELD handles the full lifecycle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">How SHIELD works</h2>
          <p className="text-gray-400 text-sm">The complete flow from wallet to verified asset.</p>
        </div>

        <div className="flex flex-col gap-0">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-5">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0 z-10">
                  {i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-white/[0.06] my-1" />
                )}
              </div>

              {/* Content */}
              <div className={`pb-10 flex-1 min-w-0 ${i === STEPS.length - 1 ? "" : ""}`}>
                <h3 className="text-white font-semibold text-base mb-1">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                {step.tag && (
                  <span className="inline-flex items-center mt-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                    {step.tag}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Tech Stack ──────────────────────────────────────────────────── */}
      <section id="stack" className="max-w-6xl mx-auto px-6 py-20 border-t border-white/[0.06]">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">Built with modern infrastructure</h2>
          <p className="text-gray-400 text-sm">Production-grade stack, zero compromise on security.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STACK.map((s) => (
            <div
              key={s.name}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-center"
            >
              <span className="text-2xl">{s.icon}</span>
              <p className="text-xs font-semibold text-white">{s.name}</p>
              <p className="text-[10px] text-gray-500">{s.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="rounded-2xl bg-gradient-to-br from-blue-600/10 to-violet-600/10 border border-blue-500/20 p-12">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-500/25 mx-auto mb-5">
            <ShieldIcon className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">
            Ready to secure your organization?
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto text-sm">
            Connect your Pera Wallet and create your SHIELD identity in under a minute. No passwords. No custody. Full control.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/25"
          >
            <ShieldIcon className="w-4 h-4" strokeWidth={1.5} />
            Connect Wallet &amp; Get Started
          </Link>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <ShieldIcon className="w-3 h-3 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-sm text-gray-500">SHIELD - SIH26125</span>
          </div>
          <div className="text-xs text-gray-600 text-center">
            Bharat Electronics Limited (BEL) · Blockchain &amp; Cybersecurity · Smart India Hackathon 2026
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <Link href="/verify/demo" className="hover:text-gray-400 transition-colors">Verify asset</Link>
            <Link href="/login" className="hover:text-gray-400 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <Fingerprint className="w-5 h-5 text-violet-400" />,
    title: "Cryptographic Identity",
    description:
      "One Pera Wallet = one global identity. Every user gets a Decentralized Identifier (DID) anchored on Algorand. No passwords, no custody.",
    accent: "violet",
  },
  {
    icon: <Building2 className="w-5 h-5 text-blue-400" />,
    title: "Multi-Tenant Organizations",
    description:
      "Create or join multiple organizations, each with its own departments, sections, teams, members, and roles. Full hierarchy support.",
    accent: "blue",
  },
  {
    icon: <Lock className="w-5 h-5 text-amber-400" />,
    title: "Scoped Access Control",
    description:
      "OWNER → ADMIN → MANAGER → AUDITOR → USER. Roles are scoped per organization and per department - not just globally.",
    accent: "amber",
  },
  {
    icon: <Package className="w-5 h-5 text-emerald-400" />,
    title: "Digital Asset Passport",
    description:
      "Register digital and physical assets with classification levels (PUBLIC → CRITICAL), owner, custodian, location, and physical identifier.",
    accent: "emerald",
  },
  {
    icon: <Link2 className="w-5 h-5 text-cyan-400" />,
    title: "Algorand Tokenisation",
    description:
      "Every asset can be tokenised as an Algorand Standard Asset (ASA). Transfers are enforced via clawback - SHIELD maintains control.",
    accent: "cyan",
  },
  {
    icon: <FileCheck className="w-5 h-5 text-blue-400" />,
    title: "IPFS Document Storage",
    description:
      "Attach files to any asset. SHA-256 hash computed automatically. Re-upload any file later to verify it hasn't been tampered with.",
    accent: "blue",
  },
  {
    icon: <ScrollText className="w-5 h-5 text-indigo-400" />,
    title: "Immutable Audit Trail",
    description:
      "21 event types tracked. Any critical event can be anchored on Algorand with a SHA-256 proof. One-click anchor from the audit page.",
    accent: "indigo",
  },
  {
    icon: <QrCode className="w-5 h-5 text-emerald-400" />,
    title: "Public QR Verification",
    description:
      "Scan the QR code on a physical asset → opens a public verification page that checks ownership live against the Algorand Indexer.",
    accent: "emerald",
  },
  {
    icon: <Cpu className="w-5 h-5 text-violet-400" />,
    title: "Multi-Step Transfer Flow",
    description:
      "Request → Manager approves → ASA clawback transfer on-chain. Full request/approve/reject workflow with on-chain proof at every step.",
    accent: "violet",
  },
];

const STEPS = [
  {
    title: "Connect your Pera Wallet",
    description:
      "Open SHIELD and connect your Algorand Pera Wallet. If you're new, enter your name and email - your global identity is created in seconds.",
    tag: "Algorand wallet signature verified",
  },
  {
    title: "Create or join an organization",
    description:
      "Create your own organization (you become OWNER) or accept an invite link from an admin to join an existing one with a specific role.",
    tag: "ORG_CREATED anchored on Algorand",
  },
  {
    title: "Build your structure",
    description:
      "Add departments, sections, and teams. Assign department and section heads. Invite members with targeted role + placement.",
    tag: null,
  },
  {
    title: "Register and classify assets",
    description:
      "Register any digital or physical asset with a human ID like RADAR-001. Choose classification: PUBLIC, INTERNAL, CONFIDENTIAL, SECRET, or CRITICAL.",
    tag: "CRITICAL assets auto-anchored on Algorand",
  },
  {
    title: "Tokenise on Algorand",
    description:
      "One click tokenises the asset as an Algorand Standard Asset (ASA) - 1 non-fungible unit, treasury holds clawback for compliance.",
    tag: "ASA created on Algorand TestNet",
  },
  {
    title: "Attach documents via IPFS",
    description:
      "Drag and drop any file onto the asset passport. It's pinned to IPFS via Pinata. SHA-256 stored for tamper detection.",
    tag: "IPFS CID + SHA-256 stored",
  },
  {
    title: "Transfer with approval",
    description:
      "Request a transfer to any org member. A manager or admin approves or rejects. On approval, the ASA is clawback-transferred on-chain.",
    tag: "On-chain clawback transfer",
  },
  {
    title: "Verify with QR code",
    description:
      "Scan the QR code on the physical asset. The public page checks the SHIELD registry, blockchain proofs, and live Algorand Indexer simultaneously.",
    tag: "5-check live verification",
  },
];

const STACK = [
  { name: "Next.js 16", role: "App framework", icon: "▲" },
  { name: "Algorand", role: "Trust layer", icon: "⬡" },
  { name: "IPFS / Pinata", role: "File storage", icon: "📌" },
  { name: "Neon DB", role: "PostgreSQL", icon: "🐘" },
  { name: "Drizzle ORM", role: "Database ORM", icon: "🗃️" },
  { name: "Pera Wallet", role: "Identity", icon: "🔐" },
];

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-white/[0.10] transition-all">
      <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
      <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
