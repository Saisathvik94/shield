"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Shield,
  Building2,
  Users,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
} from "lucide-react";
import { acceptInvitation } from "@/lib/actions/invite-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { roleColor, cn } from "@/lib/utils";

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
        router.push(`/login?callbackUrl=/invite/${invitation.token}`);
      } else {
        toast.error(result.message);
      }
    });
  }

  if (invitation.expired) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-[#0f1017] border border-rose-500/30 rounded-2xl p-6 text-center space-y-4 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-rose-500 dark:text-rose-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Invitation Expired</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This institutional invitation link has expired. Please request an administrator to issue a new invite.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Return to SHIELD Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header Branding */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Organization Invitation</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          You have been invited to join an institutional security workspace.
        </p>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl bg-white dark:bg-[#0f1017] border border-slate-200 dark:border-white/[0.08] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5">
        {/* Org Banner */}
        <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{invitation.organizationName}</p>
            <p className="text-[11px] text-slate-500">Institutional Workspace</p>
          </div>
        </div>

        {/* Role & Scope Details */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Assigned Role
            </span>
            <Badge className={cn("text-xs font-semibold", roleColor(invitation.role))}>
              {invitation.role}
            </Badge>
          </div>

          {invitation.departmentName && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Department
              </span>
              <span className="text-slate-900 dark:text-white font-medium">{invitation.departmentName}</span>
            </div>
          )}

          {invitation.sectionName && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
              <span className="text-slate-600 dark:text-slate-400">Section</span>
              <span className="text-slate-900 dark:text-white font-medium">{invitation.sectionName}</span>
            </div>
          )}
        </div>

        {/* Account Note if logged in with different email */}
        {currentUserEmail &&
          currentUserEmail.toLowerCase() !== invitation.email.toLowerCase() && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed text-[11px]">
                Invited email: <span className="font-semibold text-slate-900 dark:text-white">{invitation.email}</span>. You are logged in as <span className="font-semibold text-slate-900 dark:text-white">{currentUserEmail}</span>. Accepting will associate this membership with your active wallet.
              </p>
            </div>
          )}

        <Button
          type="button"
          variant="primary"
          onClick={handleAccept}
          loading={isPending}
          icon={<CheckCircle2 className="w-4 h-4" />}
          className="w-full py-3 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20"
        >
          {isPending ? "Joining Workspace..." : "Accept Invitation & Enter"}
        </Button>
      </div>
    </div>
  );
}
