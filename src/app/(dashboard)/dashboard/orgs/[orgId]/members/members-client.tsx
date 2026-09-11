"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Wallet,
  Search,
  Mail,
  Copy,
  CheckCircle2,
  MoreHorizontal,
  UserMinus,
  ShieldCheck,
  Clock,
  Send,
  Trash2,
  Building2,
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  KeyRound,
} from "lucide-react";
import { sendInvitation } from "@/lib/actions/invite-actions";
import {
  changeMemberRole,
  removeMember,
  revokeInvitation,
} from "@/lib/actions/member-actions";
import {
  bulkOnboardDepartmentMembersAction,
  type BulkMemberRow,
} from "@/lib/actions/bulk-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/dashboard/copy-button";
import { roleColor, relativeTime, shortAddress, cn, copyWithToast, getAppBaseUrl } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: string | null;
  user: { id: string; name: string; email: string; wallet: string | null };
  departmentId?: string | null;
  department: string | null;
  section: string | null;
}

interface Department {
  id: string;
  name: string;
  description?: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  invitedByName: string | null;
  departmentName: string | null;
  sectionName: string | null;
}

interface Props {
  orgId: string;
  orgName: string;
  currentUserId: string;
  currentUserRole: string;
  canManage: boolean;
  members: Member[];
  departments: Department[];
  pendingInvites: PendingInvite[];
}

const ALL_ROLES = [
  { role: "USER", label: "User / Member", desc: "Basic access to view assigned assets and request approvals" },
  { role: "AUDITOR", label: "Auditor", desc: "Read-only access to inspect all assets, audit proofs, and records" },
  { role: "MANAGER", label: "Manager", desc: "Can manage department assets, approve transfers, and view team logs" },
  { role: "ADMIN", label: "Administrator", desc: "Full authority over assets, member invites, structure, and anchors" },
] as const;

// ─── Main component ───────────────────────────────────────────────────────────

export function MembersClient({
  orgId,
  orgName,
  currentUserId,
  currentUserRole,
  canManage,
  members,
  departments,
  pendingInvites,
}: Props) {
  const [tab, setTab] = useState<"hierarchy" | "members" | "invitations">("hierarchy");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkModalDept, setBulkModalDept] = useState<Department | null>(null);

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.user.name.toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.department && m.department.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === "ALL" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const unboundWalletsCount = members.filter((m) => !m.user.wallet).length;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in-0 duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Members &amp; Department Hierarchy
            </h1>
            <Badge variant="neutral" className="text-xs">
              {members.length} Total Members
            </Badge>
            {unboundWalletsCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">
                <KeyRound className="w-3 h-3" />
                {unboundWalletsCount} Pending Wallet Binding
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage organizational departments, bulk-onboard personnel via CSV, and inspect sovereign DID wallet bindings for <strong className="text-slate-900 dark:text-slate-200">{orgName}</strong>.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2.5">
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="primary" icon={<UserPlus className="w-4 h-4" />}>
                  Invite Individual
                </Button>
              </DialogTrigger>
              <DialogContent
                title="Invite New Member"
                description={`Issue a single cryptographic invitation link to join ${orgName}.`}
              >
                <InviteForm
                  orgId={orgId}
                  departments={departments}
                  onDone={() => setInviteOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Segmented Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab("hierarchy")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              tab === "hierarchy"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Departments &amp; Hierarchy ({departments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("members")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              tab === "members"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Members ({members.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("invitations")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              tab === "invitations"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Invitations</span>
            {pendingInvites.length > 0 && (
              <span className="ml-1 bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full border border-amber-200 dark:border-amber-500/30">
                {pendingInvites.length}
              </span>
            )}
          </button>
        </div>

        {tab === "members" && (
          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.06] text-xs text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500/40 shadow-xs"
            >
              <option value="ALL">All Roles ({members.length})</option>
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="AUDITOR">Auditor</option>
              <option value="USER">User / Member</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: Department Hierarchy View */}
      {tab === "hierarchy" && (
        <div className="space-y-6">
          {/* Info Banner on Non-Custodial Onboarding & Bulk Provisioning */}
          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20 text-slate-700 dark:text-slate-300 flex items-start gap-3 text-xs leading-relaxed">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-blue-950 dark:text-blue-200 block mb-0.5">
                Bulk Employee Provisioning &amp; Auto-Binding
              </span>
              Admins can upload employee names &amp; emails directly to any department via CSV. Pre-provisioned members start with <span className="font-medium text-amber-600 dark:text-amber-400">Wallet Binding Pending</span>. When the employee connects their wallet at signup with their email, SHIELD will bind their wallet to this account automatically, skipping manual invite tokens.
            </div>
          </div>

          {departments.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <EmptyState
                  icon={Building2}
                  title="No Departments Configured"
                  description="Add departments in Organization Settings to structure your hierarchy and bulk-upload department members."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {departments.map((dept) => {
                const deptMembers = members.filter(
                  (m) =>
                    m.departmentId === dept.id ||
                    m.department?.toLowerCase() === dept.name.toLowerCase()
                );
                return (
                  <DepartmentCard
                    key={dept.id}
                    department={dept}
                    members={deptMembers}
                    orgId={orgId}
                    canManage={canManage}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onOpenBulkModal={() => setBulkModalDept(dept)}
                  />
                );
              })}

              {/* Unassigned / Organization-wide Members */}
              {(() => {
                const unassignedMembers = members.filter(
                  (m) =>
                    !m.departmentId &&
                    !departments.some(
                      (d) => d.name.toLowerCase() === m.department?.toLowerCase()
                    )
                );
                if (unassignedMembers.length === 0) return null;
                return (
                  <Card className="border-dashed border-slate-300 dark:border-white/[0.1]">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/[0.04]">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            Unassigned / General Personnel ({unassignedMembers.length})
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            Members with organization-wide access not bound to a specific department
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                        {unassignedMembers.map((m) => (
                          <MemberRow
                            key={m.id}
                            member={m}
                            orgId={orgId}
                            canManage={canManage}
                            currentUserId={currentUserId}
                            currentUserRole={currentUserRole}
                          />
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Flat Members List */}
      {tab === "members" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search members by name, email, department, or wallet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-[#0f1017] border border-slate-200 dark:border-white/[0.07] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Members List Card */}
          <Card>
            <CardContent className="p-0">
              {filteredMembers.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Users}
                    title={search || roleFilter !== "ALL" ? "No Matching Members" : "No Members Found"}
                    description={
                      search || roleFilter !== "ALL"
                        ? "Try adjusting your search criteria or clearing active filters."
                        : "Invite personnel to build your organization hierarchy."
                    }
                  />
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {filteredMembers.map((m) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      orgId={orgId}
                      canManage={canManage}
                      currentUserId={currentUserId}
                      currentUserRole={currentUserRole}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Invitations Tab */}
      {tab === "invitations" && (
        <InvitationsTab
          orgId={orgId}
          pendingInvites={pendingInvites}
          canManage={canManage}
        />
      )}

      {/* Bulk Upload CSV Modal */}
      {bulkModalDept && (
        <BulkUploadModal
          department={bulkModalDept}
          organizationId={orgId}
          onClose={() => setBulkModalDept(null)}
        />
      )}
    </div>
  );
}

// ─── Department Card Component ────────────────────────────────────────────────

function DepartmentCard({
  department,
  members,
  orgId,
  canManage,
  currentUserId,
  currentUserRole,
  onOpenBulkModal,
}: {
  department: Department;
  members: Member[];
  orgId: string;
  canManage: boolean;
  currentUserId: string;
  currentUserRole: string;
  onOpenBulkModal: () => void;
}) {
  const pendingWallets = members.filter((m) => !m.user.wallet).length;

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-white/[0.08] shadow-xs">
      <CardHeader className="bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.05] py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-300 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                  {department.name}
                </CardTitle>
                <Badge variant="neutral" className="text-xs">
                  {members.length} {members.length === 1 ? "Member" : "Members"}
                </Badge>
                {pendingWallets > 0 && (
                  <Badge variant="warning" className="text-[10px] hidden md:inline-flex">
                    {pendingWallets} Unbound
                  </Badge>
                )}
              </div>
              {department.description ? (
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {department.description}
                </CardDescription>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Department-scoped assets, approvals, and personnel
                </p>
              )}
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenBulkModal}
                icon={<Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                className="text-xs font-medium"
              >
                Bulk Upload (CSV)
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {members.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              No employees currently assigned to {department.name}.
            </p>
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenBulkModal}
                icon={<Upload className="w-3.5 h-3.5" />}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
              >
                Upload Employee CSV for {department.name}
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                orgId={orgId}
                canManage={canManage}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Member Row Component ──────────────────────────────────────────────────────

function MemberRow({
  member,
  orgId,
  canManage,
  currentUserId,
  currentUserRole,
}: {
  member: Member;
  orgId: string;
  canManage: boolean;
  currentUserId: string;
  currentUserRole: string;
}) {
  const router = useRouter();
  const [rolePending, startRoleTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  const isSelf = member.userId === currentUserId;
  const ROLE_RANK: Record<string, number> = {
    USER: 0,
    AUDITOR: 1,
    MANAGER: 2,
    ADMIN: 3,
    OWNER: 4,
  };
  const canModify =
    canManage &&
    !isSelf &&
    (currentUserRole === "OWNER" ||
      ROLE_RANK[member.role] < ROLE_RANK[currentUserRole]);

  function handleRoleChange(newRole: string) {
    startRoleTransition(async () => {
      const result = await changeMemberRole(
        member.id,
        orgId,
        newRole as "OWNER" | "ADMIN" | "MANAGER" | "AUDITOR" | "USER"
      );
      if (result.status === "success") {
        toast.success(`Role updated to ${newRole}`);
        router.refresh();
      } else {
        toast.error(result.message);
      }
      setMenuOpen(false);
    });
  }

  function handleRemove() {
    if (!confirm(`Are you sure you want to remove ${member.user.name} from this organization?`)) {
      return;
    }
    startRemoveTransition(async () => {
      const result = await removeMember(member.id, orgId);
      if (result.status === "success") {
        toast.success(`${member.user.name} removed from organization`);
        router.refresh();
      } else {
        toast.error(result.message);
      }
      setMenuOpen(false);
    });
  }

  const isWalletBound = Boolean(member.user.wallet);

  return (
    <li className="flex items-center gap-4 px-5 py-3.5 relative hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-white/[0.08] flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-200 shrink-0">
        {member.user.name?.slice(0, 1)?.toUpperCase() ?? "?"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {member.user.name}
          </p>
          {isSelf && (
            <span className="text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-1.5 py-0.2 rounded font-medium">
              You
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.user.email}</p>

        {/* Wallet status: Bound vs Wallet Binding Pending */}
        <div className="mt-1 flex items-center gap-2">
          {isWalletBound ? (
            <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
              <Wallet className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{shortAddress(member.user.wallet!, 5)}</span>
              <CopyButton text={member.user.wallet!} label="Wallet Address" />
            </div>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-500/20"
              title="Pre-provisioned sovereign DID. Algorand wallet address will bind upon employee's initial login."
            >
              <Clock className="w-2.5 h-2.5 shrink-0" />
              Wallet Binding Pending
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-semibold border", roleColor(member.role))}>
          {member.role}
        </span>
        {member.department && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            {member.department}
            {member.section ? ` · ${member.section}` : ""}
          </span>
        )}
        {member.joinedAt && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Joined {relativeTime(member.joinedAt)}
          </span>
        )}
      </div>

      {/* Actions Menu */}
      {canModify && (
        <div className="relative ml-2 shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
            title="Member actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-8 z-30 w-56 bg-white dark:bg-[#141520] border border-slate-200 dark:border-white/[0.1] rounded-xl shadow-2xl p-1.5 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                <p className="text-[10px] font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                  Update Role Scope
                </p>
                {ALL_ROLES.filter(
                  (r) =>
                    r.role !== member.role &&
                    (currentUserRole === "OWNER" ||
                      ROLE_RANK[r.role] < ROLE_RANK[currentUserRole])
                ).map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => handleRoleChange(item.role)}
                    disabled={rolePending}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors text-left"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Set as {item.role}</span>
                  </button>
                ))}
                <div className="border-t border-slate-100 dark:border-white/[0.06] mt-1 pt-1">
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={removePending}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors text-left"
                  >
                    <UserMinus className="w-3.5 h-3.5 shrink-0" />
                    <span>Remove Member</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}

// ─── Bulk Upload Modal Component ──────────────────────────────────────────────

function BulkUploadModal({
  department,
  organizationId,
  onClose,
}: {
  department: Department;
  organizationId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<BulkMemberRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [mode, setMode] = useState<"paste" | "upload">("paste");

  const sampleCsv = `name,email
Alice Johnson,alice@corp.com
Bob Smith,bob@corp.com
Carol Davis,carol@corp.com
David Zhang,david@corp.com`;

  function parseCsvContent(text: string) {
    const lines = text.trim().split("\n");
    if (lines.length <= 1) {
      setParsedRows([]);
      setParseErrors([]);
      return;
    }

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
    const emailIdx = headers.indexOf("email");
    const nameIdx = headers.indexOf("name");

    if (emailIdx === -1) {
      setParseErrors(["CSV header must contain an 'email' column."]);
      setParsedRows([]);
      return;
    }

    const rows: BulkMemberRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
      const email = cols[emailIdx]?.toLowerCase();
      const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : email?.split("@")[0] || "Member";

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Row ${i}: Invalid or missing email "${cols[emailIdx]}"`);
        continue;
      }

      rows.push({
        name,
        email,
      });
    }

    setParsedRows(rows);
    setParseErrors(errors);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCsvContent(text);
    };
    reader.readAsText(file);
  }

  function handleTextChange(val: string) {
    setCsvText(val);
    parseCsvContent(val);
  }

  function handleLoadSample() {
    setCsvText(sampleCsv);
    parseCsvContent(sampleCsv);
  }

  function handleSubmit() {
    if (parsedRows.length === 0) {
      toast.error("No valid members to onboard.");
      return;
    }

    startTransition(async () => {
      const res = await bulkOnboardDepartmentMembersAction(
        organizationId,
        department.id,
        parsedRows
      );

      if (res.success) {
        toast.success(
          `Successfully onboarded ${res.addedCount + res.updatedCount} members to ${department.name}!`
        );
        router.refresh();
        onClose();
      } else {
        toast.error(res.errors?.[0] || "Failed to bulk onboard members.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#10111a] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Bulk Onboard to {department.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pre-create employee accounts with pending wallet binding
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Architecture info */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] flex items-start gap-2.5 leading-relaxed text-slate-600 dark:text-slate-400">
            <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 dark:text-slate-200 font-semibold">
                Auto-Binding on Signup:
              </strong>{" "}
              Accounts are created with <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">Wallet Binding Pending</span>. When the employee connects with their Pera Wallet and enters their email at signup, SHIELD binds their wallet to this account automatically, skipping manual invite tokens.
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setMode("paste")}
                className={cn(
                  "px-3 py-1 rounded-md font-medium transition-colors",
                  mode === "paste"
                    ? "bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Paste CSV Data
              </button>
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={cn(
                  "px-3 py-1 rounded-md font-medium transition-colors",
                  mode === "upload"
                    ? "bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Upload File (.csv)
              </button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLoadSample}
              icon={<Sparkles className="w-3 h-3 text-blue-500" />}
              className="text-[11px] text-blue-600 dark:text-blue-400"
            >
              Load Sample Data
            </Button>
          </div>

          {mode === "paste" ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                CSV Input (Headers: name, email)
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={sampleCsv}
                className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-[#0c0d14] border border-slate-200 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-blue-500/50"
              />
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 dark:border-white/[0.1] rounded-2xl p-8 text-center hover:border-blue-500/50 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                Choose a CSV file to upload
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Must include header row with at least &quot;email&quot; and &quot;name&quot;
              </p>
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-colors">
                  Select CSV File
                </span>
              </label>
            </div>
          )}

          {/* Validation & Preview */}
          {parseErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300">
              <p className="font-semibold flex items-center gap-1.5 mb-1 text-xs">
                <AlertCircle className="w-3.5 h-3.5" /> CSV Parsing Notices
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {parseErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Ready to Onboard ({parsedRows.length} members)
                </span>
                <span className="text-[11px] text-slate-400">
                  Target: {department.name}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-white/[0.08] rounded-xl">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/[0.06]">
                      <th className="p-2 font-medium">Name</th>
                      <th className="p-2 font-medium">Email</th>
                      <th className="p-2 font-medium">Department</th>
                      <th className="p-2 font-medium">Wallet Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="p-2 font-medium text-slate-900 dark:text-white">{r.name}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-400 font-mono">{r.email}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-300">
                          {department.name}
                        </td>
                        <td className="p-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-500/20">
                            <Clock className="w-2.5 h-2.5" />
                            Pending Binding
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={parsedRows.length === 0}
            loading={isSubmitting}
            icon={<Upload className="w-3.5 h-3.5" />}
          >
            Onboard {parsedRows.length} Employees to {department.name}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Invitations Tab Component ─────────────────────────────────────────────────

function InvitationsTab({
  orgId,
  pendingInvites,
  canManage,
}: {
  orgId: string;
  pendingInvites: PendingInvite[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [revokePending, startRevoke] = useTransition();

  function handleRevoke(inviteId: string, email: string) {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) {
      return;
    }
    startRevoke(async () => {
      const result = await revokeInvitation(inviteId, orgId);
      if (result.status === "success") {
        toast.success("Invitation revoked successfully");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  if (pendingInvites.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <EmptyState
            icon={Mail}
            title="No Pending Invitations"
            description="There are currently no active invitation tokens waiting to be accepted."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          Pending Invitations ({pendingInvites.length})
        </CardTitle>
        <CardDescription>
          Active single-use invitation tokens generated for prospective team members
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-slate-100 dark:divide-white/[0.04]">
          {pendingInvites.map((inv) => (
            <InviteRow
              key={inv.id}
              invite={inv}
              canManage={canManage}
              onRevoke={() => handleRevoke(inv.id, inv.email)}
              revokePending={revokePending}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function InviteRow({
  invite,
  canManage,
  onRevoke,
  revokePending,
}: {
  invite: PendingInvite;
  canManage: boolean;
  onRevoke: () => void;
  revokePending: boolean;
}) {
  const inviteUrl = `${getAppBaseUrl()}/invite/${invite.token}`;

  function handleCopy() {
    copyWithToast(inviteUrl, "Invitation URL");
  }

  return (
    <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{invite.email}</p>
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border", roleColor(invite.role))}>
            {invite.role}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {invite.departmentName ? `Department: ${invite.departmentName} · ` : ""}
          Expires {new Date(invite.expiresAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          icon={<Copy className="w-3.5 h-3.5" />}
        >
          Copy Link
        </Button>

        {canManage && (
          <Button
            variant="danger"
            size="sm"
            onClick={onRevoke}
            loading={revokePending}
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Revoke
          </Button>
        )}
      </div>
    </li>
  );
}

// ─── Progressive Invite Form ──────────────────────────────────────────────────

function InviteForm({
  orgId,
  departments,
  onDone,
}: {
  orgId: string;
  departments: Department[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("USER");
  const [departmentId, setDepartmentId] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    startTransition(async () => {
      const result = await sendInvitation({
        organizationId: orgId,
        email: email.trim(),
        role: role as "ADMIN" | "MANAGER" | "AUDITOR" | "USER",
        departmentId: departmentId || undefined,
      });

      if (result.status === "success") {
        toast.success(`Invitation created for ${email}`);
        if (result.token) {
          const inviteUrl = `${getAppBaseUrl()}/invite/${result.token}`;
          copyWithToast(inviteUrl, "Invitation link");
        }
        router.refresh();
        onDone();
      } else if (result.status === "error") {
        toast.error(result.message);
      } else {
        toast.error("Authentication required to send invitations.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
          Recipient Email Address
        </label>
        <Input
          type="email"
          required
          placeholder="colleague@organization.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
          Access Authority Role
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_ROLES.map((r) => (
            <button
              key={r.role}
              type="button"
              onClick={() => setRole(r.role)}
              className={cn(
                "p-2.5 rounded-xl border text-left transition-all",
                role === r.role
                  ? "bg-blue-50 dark:bg-blue-600/15 border-blue-300 dark:border-blue-500/40 text-blue-950 dark:text-white shadow-xs"
                  : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">{r.label}</span>
                {role === r.role && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{r.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {departments.length > 0 && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
            Assigned Department (Optional)
          </label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm text-slate-900 dark:text-white rounded-xl p-2.5 outline-none focus:border-blue-500/50"
          >
            <option value="">- Unassigned Department -</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={isPending}
          icon={<Send className="w-3.5 h-3.5" />}
        >
          Generate Invitation
        </Button>
      </div>
    </form>
  );
}
