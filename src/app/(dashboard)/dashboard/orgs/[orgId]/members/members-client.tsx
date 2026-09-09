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
  Link,
  Copy,
  CheckCircle2,
  MoreHorizontal,
  UserMinus,
  ShieldCheck,
  Clock,
  Send,
  Trash2,
} from "lucide-react";
import { sendInvitation } from "@/lib/actions/invite-actions";
import {
  changeMemberRole,
  removeMember,
  revokeInvitation,
} from "@/lib/actions/member-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { roleColor, relativeTime, shortAddress, cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: string | null;
  user: { id: string; name: string; email: string; wallet: string | null };
  department: string | null;
  section: string | null;
}

interface Department {
  id: string;
  name: string;
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

const ALL_ROLES = ["USER", "AUDITOR", "MANAGER", "ADMIN"] as const;

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
  const [tab, setTab] = useState<"members" | "invitations">("members");
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const filteredMembers = members.filter(
    (m) =>
      m.user.name.toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Members</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {members.length} member{members.length !== 1 ? "s" : ""} in {orgName}
            {pendingInvites.length > 0 && (
              <span className="ml-2 text-amber-400">
                · {pendingInvites.length} pending invite
                {pendingInvites.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        {canManage && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button variant="primary" icon={<UserPlus className="w-4 h-4" />}>
                Invite member
              </Button>
            </DialogTrigger>
            <DialogContent
              title="Invite member"
              description={`Create an invitation link to join ${orgName}.`}
            >
              <InviteForm
                orgId={orgId}
                departments={departments}
                onDone={() => setInviteOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white/[0.04] rounded-lg p-1 w-fit">
        <TabButton active={tab === "members"} onClick={() => setTab("members")}>
          <Users className="w-3.5 h-3.5" />
          Members ({members.length})
        </TabButton>
        <TabButton
          active={tab === "invitations"}
          onClick={() => setTab("invitations")}
        >
          <Mail className="w-3.5 h-3.5" />
          Invitations
          {pendingInvites.length > 0 && (
            <span className="ml-1 bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full">
              {pendingInvites.length}
            </span>
          )}
        </TabButton>
      </div>

      {tab === "members" && (
        <>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              placeholder="Search members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#111118] border border-white/[0.06] rounded-lg text-sm text-white placeholder:text-gray-500 outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              {filteredMembers.length === 0 ? (
                <EmptyState
                  icon={<Users className="w-10 h-10 text-gray-700" />}
                  message={search ? "No members match your search." : "No members yet."}
                />
              ) : (
                <ul className="divide-y divide-white/[0.04]">
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
        </>
      )}

      {tab === "invitations" && (
        <InvitationsTab
          orgId={orgId}
          pendingInvites={pendingInvites}
          canManage={canManage}
        />
      )}
    </div>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────

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
    USER: 0, AUDITOR: 1, MANAGER: 2, ADMIN: 3, OWNER: 4,
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
        toast.success(`Role changed to ${newRole}`);
        router.refresh();
      } else {
        toast.error(result.message);
      }
      setMenuOpen(false);
    });
  }

  function handleRemove() {
    if (!confirm(`Remove ${member.user.name} from this organization?`)) return;
    startRemoveTransition(async () => {
      const result = await removeMember(member.id, orgId);
      if (result.status === "success") {
        toast.success(`${member.user.name} removed`);
        router.refresh();
      } else {
        toast.error(result.message);
      }
      setMenuOpen(false);
    });
  }

  return (
    <li className="flex items-center gap-3 px-5 py-3.5 relative">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-white/[0.08] flex items-center justify-center text-sm font-bold text-blue-200 shrink-0">
        {member.user.name?.slice(0, 1)?.toUpperCase() ?? "?"}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">
          {member.user.name}
          {isSelf && <span className="ml-1 text-[10px] text-gray-500">(you)</span>}
        </p>
        <p className="text-xs text-gray-500 truncate">{member.user.email}</p>
        {member.user.wallet && (
          <p className="text-[10px] text-gray-600 font-mono flex items-center gap-1 mt-0.5">
            <Wallet className="w-3 h-3" />
            {shortAddress(member.user.wallet)}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge className={roleColor(member.role)}>{member.role}</Badge>
        {member.department && (
          <span className="text-[10px] text-gray-500">
            {member.department}
            {member.section ? ` → ${member.section}` : ""}
          </span>
        )}
        {member.joinedAt && (
          <span className="text-[10px] text-gray-600">
            Joined {relativeTime(member.joinedAt)}
          </span>
        )}
      </div>

      {/* Actions menu */}
      {canModify && (
        <div className="relative ml-2 shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-8 z-20 w-52 bg-[#1a1a24] border border-white/[0.08] rounded-xl shadow-2xl py-1.5 overflow-hidden">
                <p className="text-[10px] text-gray-500 px-3 py-1 uppercase tracking-wider">
                  Change role
                </p>
                {ALL_ROLES.filter(
                  (r) =>
                    r !== member.role &&
                    (currentUserRole === "OWNER" ||
                      ROLE_RANK[r] < ROLE_RANK[currentUserRole])
                ).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    disabled={rolePending}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    Set as {role}
                  </button>
                ))}
                <div className="border-t border-white/[0.06] mt-1 pt-1">
                  <button
                    onClick={handleRemove}
                    disabled={removePending}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    Remove member
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

// ─── Invitations tab ──────────────────────────────────────────────────────────

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
    if (!confirm(`Revoke invitation for ${email}?`)) return;
    startRevoke(async () => {
      const result = await revokeInvitation(inviteId, orgId);
      if (result.status === "success") {
        toast.success("Invitation revoked");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  if (pendingInvites.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={<Mail className="w-10 h-10 text-gray-700" />}
            message="No pending invitations."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Pending Invitations
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-white/[0.04]">
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
  const [copied, setCopied] = useState(false);
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${invite.token}`
      : `/invite/${invite.token}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Invite link copied!");
    } catch {
      toast.error("Failed to copy link.");
    }
  }

  const expired = new Date(invite.expiresAt) < new Date();

  return (
    <li className="flex items-start gap-3 px-5 py-3.5">
      <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <Mail className="w-4 h-4 text-amber-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{invite.email}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <Badge className={roleColor(invite.role)}>{invite.role}</Badge>
          {invite.departmentName && (
            <span className="text-[10px] text-gray-500">
              {invite.departmentName}
              {invite.sectionName ? ` → ${invite.sectionName}` : ""}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-600 mt-1">
          Invited by {invite.invitedByName ?? "Admin"} ·{" "}
          {expired ? (
            <span className="text-red-400">Expired</span>
          ) : (
            <>Expires {relativeTime(invite.expiresAt)}</>
          )}
        </p>

        {/* Invite link box */}
        <div className="mt-2 flex items-center gap-1.5 bg-white/[0.04] rounded-lg px-2.5 py-1.5">
          <Link className="w-3 h-3 text-gray-500 shrink-0" />
          <span className="text-[10px] font-mono text-gray-400 truncate flex-1">
            /invite/{invite.token.slice(0, 16)}…
          </span>
          <button
            onClick={handleCopy}
            className="text-gray-500 hover:text-white transition-colors shrink-0"
            title="Copy invite link"
          >
            {copied ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {canManage && (
        <button
          onClick={onRevoke}
          disabled={revokePending}
          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 mt-0.5"
          title="Revoke invitation"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </li>
  );
}

// ─── Invite form ──────────────────────────────────────────────────────────────

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
  const [role, setRole] = useState<(typeof ALL_ROLES)[number]>("USER");
  const [deptId, setDeptId] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    startTransition(async () => {
      const result = await sendInvitation({
        organizationId: orgId,
        email: email.trim(),
        role,
        departmentId: deptId || undefined,
      });

      if (result.status === "success") {
        const link = `${window.location.origin}/invite/${result.token}`;
        setGeneratedLink(link);
        router.refresh();
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });
  }

  async function handleCopyLink() {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast.success("Invite link copied!");
  }

  // After link generated - show it
  if (generatedLink) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 p-4">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-300">
              Invitation created
            </p>
            <p className="text-xs text-green-500/80 mt-0.5">
              Share this link with {email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5">
          <span className="text-xs font-mono text-gray-300 truncate flex-1">
            {generatedLink}
          </span>
          <button
            onClick={handleCopyLink}
            className="text-gray-500 hover:text-white transition-colors shrink-0"
          >
            {linkCopied ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Link expires in 7 days. Share it directly through your preferred channel.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setGeneratedLink(null); setEmail(""); }}>
            Invite another
          </Button>
          <Button variant="primary" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Email address"
        type="email"
        placeholder="colleague@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoFocus
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-300">Role</label>
        <div className="grid grid-cols-4 gap-2">
          {ALL_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "px-2 py-1.5 rounded-lg text-xs font-medium border transition-all",
                role === r
                  ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                  : "border-white/[0.08] text-gray-400 hover:border-white/20 hover:text-white"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {departments.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-300">
            Department (optional)
          </label>
          <select
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/60"
          >
            <option value="">- None -</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isPending}
          icon={<Send className="w-4 h-4" />}
          disabled={!email.trim()}
        >
          Create invite link
        </Button>
      </div>
    </form>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
        active
          ? "bg-white/[0.08] text-white"
          : "text-gray-400 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center py-12 text-center gap-3">
      {icon}
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
