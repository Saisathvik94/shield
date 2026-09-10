"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Shield,
  Wallet,
  Loader2,
  ArrowRight,
  CheckCircle2,
  QrCode,
  Package,
  User,
  Mail,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useWallet } from "@/lib/wallet/wallet-context";
import { loginWithWallet, registerWithWallet } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
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
  const fromVerify = callbackUrl?.startsWith("/verify/") ?? false;
  const verifyAssetId = fromVerify
    ? decodeURIComponent(callbackUrl!.replace("/verify/", ""))
    : null;

  const destination = callbackUrl ?? "/dashboard";

  async function handleConnectWallet() {
    const addr = await connect();
    if (!addr) return;

    startTransition(async () => {
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
        console.warn("[SHIELD] Signature step note (non-fatal):", err);
      }

      const result = await loginWithWallet(addr, signedMessageHex);
      if (result.status === "success") {
        setStep("signing_in");
        toast.success("Wallet authenticated successfully.");
        router.push(destination);
        router.refresh();
      } else if (result.status === "needs_signup") {
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
      errors.name = "Name must be at least 2 characters.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Please enter a valid email address.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

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
    <div className="w-full max-w-md space-y-6">
      {/* Header Branding */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">SHIELD Trust Console</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Sovereign identity and institutional digital asset security
        </p>
      </div>

      {/* QR Verify Referral Notice if applicable */}
      {fromVerify && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center gap-3">
          <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Asset Verification Intent</p>
            <p className="text-[11px] text-blue-700 dark:text-blue-300/80 truncate">
              Verifying asset: <span className="font-mono font-bold text-slate-900 dark:text-white">{verifyAssetId}</span>
            </p>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="rounded-2xl bg-white dark:bg-[#0f1017] border border-slate-200 dark:border-white/[0.08] p-6 sm:p-7 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5">
        {step === "connect" && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Passwordless Wallet Authentication</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Connect your Algorand Pera Wallet to sign in cryptographically.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              onClick={handleConnectWallet}
              loading={isLoading}
              icon={<Wallet className="w-4 h-4" />}
              className="w-full py-3 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20"
            >
              {isLoading ? "Authenticating Session..." : "Connect Pera Wallet"}
            </Button>

            <div className="pt-2 text-center space-y-1">
              <p className="text-[11px] text-slate-500 dark:text-slate-500">
                Algorand TestNet · No password stored on server
              </p>
            </div>
          </div>
        )}

        {step === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Create Sovereign Identity</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Bind your Algorand wallet address to your organization credentials.
              </p>
            </div>

            {/* Wallet Address Chip */}
            {address && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Connected Wallet
                </span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{shortAddress(address)}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Full Name
              </label>
              <input
                autoFocus
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.10] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400">{fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Institutional Email
              </label>
              <input
                type="email"
                placeholder="jane.doe@institution.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.10] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400">{fieldErrors.email}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              icon={<Shield className="w-4 h-4" />}
              className="w-full py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white mt-2 shadow-md shadow-blue-500/20"
            >
              Complete Registration &amp; Sign In
            </Button>
          </form>
        )}

        {step === "signing_in" && (
          <div className="text-center py-6 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-900 dark:text-white">Opening secure session...</p>
          </div>
        )}
      </div>
    </div>
  );
}
