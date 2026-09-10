"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Plus,
  Globe,
  Calendar,
  Crown,
  Users,
  Shield,
  Layers,
  ExternalLink,
} from "lucide-react";
import { updateOrg } from "@/lib/actions/org-actions";
import {
  createDepartmentAction,
  setDepartmentHeadAction,
} from "./structure-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/dashboard/copy-button";
import { relativeTime, roleColor, cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  algorandAppId: string | null;
  createdAt: string;
}

interface DeptMember {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface DeptData {
  id: string;
  name: string;
  description: string | null;
  headId: string | null;
  members: DeptMember[];
}

interface MemberOption {
  id: string;
  name: string;
  email: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrgSettingsClient({
  org,
  departments,
  allMembers,
  isAdmin,
}: {
  org: OrgData;
  departments: DeptData[];
  allMembers: MemberOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description ?? "");
  const [website, setWebsite] = useState(org.website ?? "");
  const [deptName, setDeptName] = useState("");
  const [addingDept, setAddingDept] = useState(false);
  const [deptPending, startDeptTx] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(departments.map((d) => d.id)));

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function handleOrgUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateOrg(org.id, new FormData(e.currentTarget));
      if (result.status === "success") {
        toast.success("Organization profile updated.");
        router.refresh();
      } else toast.error(result.message);
    });
  }

  function handleAddDept(e: React.FormEvent) {
    e.preventDefault();
    if (!deptName.trim()) return;
    startDeptTx(async () => {
      const r = await createDepartmentAction(org.id, deptName);
      if (r.status === "success") {
        toast.success(`Department "${deptName}" created.`);
        setDeptName("");
        setAddingDept(false);
        router.refresh();
      } else toast.error(r.message);
    });
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in-0 duration-150">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Organization Settings</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Manage profile details, structural departments, and blockchain configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: General Info & Departments */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                General Profile
              </CardTitle>
              <CardDescription>Primary organization information visible to members</CardDescription>
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <form onSubmit={handleOrgUpdate} className="space-y-4">
                  <Input
                    label="Organization Name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Textarea
                    label="Description"
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the organization..."
                  />
                  <Input
                    label="Website"
                    name="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                  <div className="flex justify-end pt-2">
                    <Button type="submit" variant="primary" loading={isPending}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 text-xs">
                  <Row label="Name" value={org.name} />
                  {org.description && <Row label="Description" value={org.description} />}
                  {org.website && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Website</span>
                      <a
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        {org.website} <Globe className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Department Hierarchy Manager */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Departments &amp; Structure
                  </CardTitle>
                  <CardDescription>Configure organizational hierarchy and department leadership</CardDescription>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setAddingDept(true)}
                  >
                    Add Department
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAdmin && addingDept && (
                <form
                  onSubmit={handleAddDept}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-blue-300 dark:border-blue-500/30"
                >
                  <input
                    autoFocus
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="Department name (e.g. Engineering, Security, Operations)..."
                    className="flex-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.10] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500/50"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    loading={deptPending}
                    disabled={!deptName.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAddingDept(false);
                      setDeptName("");
                    }}
                  >
                    Cancel
                  </Button>
                </form>
              )}

              {departments.length === 0 && !addingDept ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No departments created yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {departments.map((dept) => (
                    <DeptItem
                      key={dept.id}
                      dept={dept}
                      orgId={org.id}
                      allMembers={allMembers}
                      isAdmin={isAdmin}
                      expanded={expanded.has(dept.id)}
                      onToggle={() => toggleExpand(dept.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Technical Information & Chain Anchors */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Technical Identity
              </CardTitle>
              <CardDescription>System identifiers &amp; contract registry</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider mb-1 font-medium">
                  Workspace Slug
                </span>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
                  <span className="font-mono text-slate-900 dark:text-white text-xs">{org.slug}</span>
                  <CopyButton value={org.slug} />
                </div>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider mb-1 font-medium">
                  Organization Database ID
                </span>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
                  <span className="font-mono text-slate-700 dark:text-slate-300 text-xs truncate max-w-[180px]">{org.id}</span>
                  <CopyButton value={org.id} />
                </div>
              </div>

              {org.algorandAppId && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider mb-1 font-medium">
                    Algorand Smart Contract App ID
                  </span>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      #{org.algorandAppId}
                    </span>
                    <div className="flex items-center gap-1">
                      <CopyButton value={org.algorandAppId} />
                      <a
                        href={`https://testnet.explorer.perawallet.app/application/${org.algorandAppId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Created
                </span>
                <span className="text-slate-600 dark:text-slate-400">{relativeTime(org.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Department Item Component ────────────────────────────────────────────────

function DeptItem({
  dept,
  orgId,
  allMembers,
  isAdmin,
  expanded,
  onToggle,
}: {
  dept: DeptData;
  orgId: string;
  allMembers: MemberOption[];
  isAdmin: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [headPending, startHeadTx] = useTransition();

  const headName = dept.headId
    ? allMembers.find((m) => m.id === dept.headId)?.name
    : null;

  function handleSetHead(userId: string) {
    startHeadTx(async () => {
      const r = await setDepartmentHeadAction(dept.id, orgId, userId);
      if (r.status === "success") {
        toast.success("Department head updated.");
        router.refresh();
      } else toast.error(r.message);
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors select-none"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        )}
        <span className="text-xs font-semibold text-slate-900 dark:text-white flex-1">{dept.name}</span>
        {headName && (
          <span className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1 mr-2 font-medium">
            <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            {headName}
          </span>
        )}
        <Badge variant="default" className="text-[11px]">
          {dept.members.length} member{dept.members.length !== 1 ? "s" : ""}
        </Badge>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-white/[0.04] p-4 bg-white dark:bg-white/[0.01] space-y-3">
          {/* Head assignment */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
                <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                Department Head:
              </span>
              <select
                value={dept.headId ?? ""}
                onChange={(e) => handleSetHead(e.target.value)}
                disabled={headPending}
                className="flex-1 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.10] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500/50"
              >
                <option value="">- Unassigned -</option>
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Members list */}
          {dept.members.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Assigned Members
              </p>
              <div className="space-y-1">
                {dept.members.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.03]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300 shrink-0">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{m.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{m.email}</p>
                      </div>
                    </div>
                    <Badge className={cn("text-[10px]", roleColor(m.role))}>
                      {m.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2">
              No members assigned to this department yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500 shrink-0 text-xs">{label}</span>
      <span className={cn("text-slate-700 dark:text-slate-300 truncate", mono ? "font-mono text-xs" : "text-xs")}>
        {value}
      </span>
    </div>
  );
}
