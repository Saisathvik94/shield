"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ShieldIcon,
  Building2,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { acceptInvitation } from "@/lib/actions/invite-actions";
import { cn } from "@/lib/utils";

interface InviteData {
  id: string;
  token: string;
  email: string;
  role: string;
  organizationName: string;
  departmentName?: string;
  sectionName?: string;
  expiresAt: string;
  expired: boolean;
}

export function InviteClient({
  invitation,
  currentUserEmail,
}: {
  invitation: InviteData;
  currentUserEmail: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptInvitation(invitation.token);
      if (result.status === "success") {
        toast.success(`You've joined ${invitation.organizationName}!`);
        router.push(`/dashboard`);
        router.refresh();
      } else if (result.status === "needs_login") {
        router.push(
          `/login?callbackUrl=/invite/${invitation.token}`
        );
      } else {
        toast.error(result.message);
      }
    });
  }

  if (invitation.expired) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-1">
            Invitation expired
          </h2>
          <p className="text-sm text-gray-400">
            This invitation link has expired. Ask an admin to resend it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-500/25 mb-3">
          <ShieldIcon className="w-6 h-6 text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-semibold text-white">You&apos;ve been invited</h1>
      </div>

      <div className="bg-[#111118] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-5">
        {/* Org card */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 to-violet-600/30 border border-white/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <p className="text-white font-semibold">{invitation.organizationName}</p>
            <p className="text-xs text-gray-400 mt-0.5">Organization</p>
          </div>
        </div>

        {/* Role + scope */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2">
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Role
            </span>
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
              {invitation.role}
            </span>
          </div>

          {invitation.departmentName && (
            <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2">
              <span className="text-xs text-gray-400">Department</span>
              <span className="text-xs text-white">{invitation.departmentName}</span>
            </div>
          )}

          {invitation.sectionName && (
            <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2">
              <span className="text-xs text-gray-400">Section</span>
              <span className="text-xs text-white">{invitation.sectionName}</span>
            </div>
          )}
        </div>

        {currentUserEmail &&
          currentUserEmail.toLowerCase() !== invitation.email.toLowerCase() && (
            <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-300">
                This invitation was sent to{" "}
                <span className="font-semibold">{invitation.email}</span>, but
                you&apos;re signed in as{" "}
                <span className="font-semibold">{currentUserEmail}</span>. You
                can still accept it - the membership will be linked to your
                current account.
              </p>
            </div>
          )}

        <button
          onClick={handleAccept}
          disabled={isPending}
          className={cn(
            "flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3",
            "font-medium text-sm transition-all",
            "bg-gradient-to-r from-blue-600 to-violet-600 text-white",
            "hover:from-blue-500 hover:to-violet-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "shadow-lg shadow-blue-500/20"
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Accepting…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Accept Invitation
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-500">
          Expires {new Date(invitation.expiresAt).toLocaleDateString("en-GB")}
        </p>
      </div>
    </div>
  );
}
