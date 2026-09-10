"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ShieldIcon,
  Wallet,
  Loader2,
  ArrowRight,
  CheckCircle2,
  QrCode,
  Package,
} from "lucide-react";
import { useWallet } from "@/lib/wallet/wallet-context";
import { loginWithWallet, registerWithWallet } from "@/lib/actions/auth-actions";
import { shortAddress, cn } from "@/lib/utils";

type Step = "connect" | "register" | "signing_in";

interface Props {
  callbackUrl?: string;
}

export function LoginClient({ callbackUrl }: Props) {
  const router = useRouter();
  const { address, connecting, connect, disconnect } = useWallet();

  const [step, setStep] = useState<Step>("connect");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});
  const [isPending, startTransition] = useTransition();

  // Detect if they came from a /verify QR scan
  const fromVerify =
    callbackUrl?.startsWith("/verify/") ?? false;
  const verifyAssetId = fromVerify
    ? decodeURIComponent(callbackUrl!.replace("/verify/", ""))
    : null;

  // Where to redirect after login
  const destination = callbackUrl ?? "/dashboard";

  async function handleConnectWallet() {
    const addr = await connect();
    if (!addr) return;

    startTransition(async () => {
      // Fetch one-time nonce and sign it
      let signedMessageHex = "";
      try {
        const res = await fetch(`/api/auth/nonce?address=${encodeURIComponent(addr)}`);
        if (res.ok) {
          const { nonce } = (await res.json()) as { nonce: string };
          const { getPeraWallet } = await import("@/lib/wallet/pera-client");
          const pera = await getPeraWallet();
          const msgBytes = new TextEncoder().encode(nonce);
          const signed = await pera.signData(
            [{ data: msgBytes, message: `Sign to verify wallet ownership for SHIELD.\n\n${nonce}` }],
            addr
          );
          signedMessageHex = Buffer.from(signed[0]).toString("hex");
        }
      } catch (err) {
        console.warn("[SHIELD] Signature step failed (non-fatal):", err);
      }

      const result = await loginWithWallet(addr, signedMessageHex);
      if (result.status === "success") {
        setStep("signing_in");
        router.push(destination);
        router.refresh();
      } else if (result.status === "needs_signup") {
        // Wallet not known - show signup form
        setStep("register");
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const errors: typeof fieldErrors = {};
    if (!name.trim() || name.trim().length < 2)
      errors.name = "Must be at least 2 characters.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Enter a valid email address.";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    if (!address) {
      toast.error("Wallet disconnected. Please reconnect.");
      setStep("connect");
      return;
    }

    startTransition(async () => {
      const result = await registerWithWallet(address, name, email);
      if (result.status === "success") {
        setStep("signing_in");
        toast.success("Identity created! Welcome to SHIELD.");
        router.push(destination);
        router.refresh();
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });
  }

  const isLoading = connecting || isPending;

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-500/25 mb-4">
          <ShieldIcon className="w-7 h-7 text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">SHIELD</h1>
        <p className="text-sm text-gray-400 mt-1">Secure Identity &amp; Access Platform</p>
      </div>

      {/* Context banner - shown when arriving from a QR scan */}
      {fromVerify && step !== "signing_in" && (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
          <QrCode className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-violet-200">
              You scanned a SHIELD asset QR code
            </p>
            <p className="text-xs text-violet-400/80 mt-0.5">
              Asset{" "}
              <span className="font-mono font-bold text-violet-300">
                {verifyAssetId}
              </span>{" "}
              is managed on this platform.
              {step === "register"
                ? " Create your identity to access the full dashboard."
                : " Sign in or create a free account to get started."}
            </p>
          </div>
        </div>
      )}

      {/* New account notice - shown when wallet is unknown */}
      {step === "register" && !fromVerify && (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
          <Package className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-200">
              No account found for this wallet
            </p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              This wallet address isn&apos;t linked to a SHIELD identity yet.
              Fill in your details below to create one - it only takes a moment.
            </p>
          </div>
        </div>
      )}

      <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-6 shadow-2xl">
        {step === "connect" && (
          <ConnectStep
            address={address}
            isLoading={isLoading}
            fromVerify={fromVerify}
            onConnect={handleConnectWallet}
            onDisconnect={disconnect}
          />
        )}

        {step === "register" && address && (
          <RegisterStep
            address={address}
            name={name}
            email={email}
            fieldErrors={fieldErrors}
            isLoading={isPending}
            fromVerify={fromVerify}
            verifyAssetId={verifyAssetId}
            onNameChange={setName}
            onEmailChange={setEmail}
            onSubmit={handleRegister}
            onBack={() => { disconnect(); setStep("connect"); }}
          />
        )}

        {step === "signing_in" && (
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
            <p className="text-white font-medium">
              {fromVerify ? "Identity verified! Redirecting…" : "Signing you in…"}
            </p>
            <p className="text-sm text-gray-400">
              {fromVerify
                ? `Taking you to asset ${verifyAssetId}`
                : "Redirecting to your dashboard"}
            </p>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 mt-6">
        Your identity is anchored to your Algorand wallet.
        <br />
        No passwords. No custody.
      </p>
    </div>
  );
}

// ─── Connect step ─────────────────────────────────────────────────────────────

function ConnectStep({
  address,
  isLoading,
  fromVerify,
  onConnect,
  onDisconnect,
}: {
  address: string | null;
  isLoading: boolean;
  fromVerify: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white">
          {fromVerify ? "Connect to verify ownership" : "Welcome back"}
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {fromVerify
            ? "Connect your Pera Wallet to sign in or create a SHIELD identity."
            : "Connect your Pera Wallet to access your SHIELD identity."}
        </p>
      </div>

      {address && (
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Connected wallet</p>
            <p className="text-sm text-white font-mono truncate">{shortAddress(address)}</p>
          </div>
        </div>
      )}

      <button
        onClick={address ? onDisconnect : onConnect}
        disabled={isLoading}
        className={cn(
          "flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 font-medium text-sm transition-all",
          "bg-gradient-to-r from-blue-600 to-violet-600 text-white",
          "hover:from-blue-500 hover:to-violet-500",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "shadow-lg shadow-blue-500/20"
        )}
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</>
        ) : address ? (
          <><ArrowRight className="w-4 h-4" /> Continue with {shortAddress(address)}</>
        ) : (
          <><Wallet className="w-4 h-4" /> Connect Pera Wallet</>
        )}
      </button>

      {address && (
        <button
          onClick={onDisconnect}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors text-center"
        >
          Use a different wallet
        </button>
      )}

      <div className="border-t border-white/[0.06] pt-4">
        <p className="text-xs text-gray-500 text-center">
          {fromVerify
            ? "New to SHIELD? We'll create your identity automatically after you connect."
            : "New to SHIELD? Connect your wallet - we'll guide you through identity creation."}
        </p>
      </div>
    </div>
  );
}

// ─── Register step ────────────────────────────────────────────────────────────

function RegisterStep({
  address,
  name,
  email,
  fieldErrors,
  isLoading,
  fromVerify,
  verifyAssetId,
  onNameChange,
  onEmailChange,
  onSubmit,
  onBack,
}: {
  address: string;
  name: string;
  email: string;
  fieldErrors: { name?: string; email?: string };
  isLoading: boolean;
  fromVerify: boolean;
  verifyAssetId: string | null;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Create your identity</h2>
        <p className="text-sm text-gray-400 mt-1">
          {fromVerify
            ? `Your global SHIELD identity - one wallet, all organizations. After creation you'll be taken to asset ${verifyAssetId}.`
            : "Your global SHIELD identity - one wallet, all organizations."}
        </p>
      </div>

      {/* Wallet badge */}
      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 flex items-center gap-2">
        <Wallet className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="text-xs text-blue-300 font-mono">{shortAddress(address)}</span>
      </div>

      <Field
        label="Full name"
        id="name"
        type="text"
        placeholder="Rahul Kumar"
        value={name}
        onChange={onNameChange}
        error={fieldErrors.name}
        autoFocus
      />

      <Field
        label="Email address"
        id="email"
        type="email"
        placeholder="rahul@bel.co.in"
        value={email}
        onChange={onEmailChange}
        error={fieldErrors.email}
      />

      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          "flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3",
          "font-medium text-sm transition-all",
          "bg-gradient-to-r from-blue-600 to-violet-600 text-white",
          "hover:from-blue-500 hover:to-violet-500",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "shadow-lg shadow-blue-500/20"
        )}
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Creating identity…</>
        ) : (
          <><ShieldIcon className="w-4 h-4" /> Create SHIELD Identity</>
        )}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors text-center"
      >
        ← Back to wallet connect
      </button>
    </form>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label, id, type, placeholder, value, onChange, error, autoFocus,
}: {
  label: string; id: string; type: string; placeholder: string;
  value: string; onChange: (v: string) => void; error?: string; autoFocus?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-gray-300">{label}</label>
      <input
        id={id} type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus}
        className={cn(
          "w-full rounded-lg bg-white/[0.05] border px-3 py-2.5 text-sm text-white",
          "placeholder:text-gray-500 outline-none transition-colors",
          "focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20",
          error ? "border-red-500/50" : "border-white/[0.08]"
        )}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
