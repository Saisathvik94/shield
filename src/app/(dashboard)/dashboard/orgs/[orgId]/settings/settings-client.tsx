"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Settings,
  Building2,
  ChevronDown,
  ChevronRight,
  Plus,
  Globe,
  Calendar,
  Link2,
  Crown,
  Users,
} from "lucide-react";
import { updateOrg } from "@/lib/actions/org-actions";
import {
  createDepartmentAction,
  setDepartmentHeadAction,
} from "./structure-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// ─── Main component ───────────────────────────────────────────────────────────

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
        toast.success("Organization updated.");
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
        toast.success(`Department "${deptName}" created`);
        setDeptName("");
        setAddingDept(false);
        router.refresh();
      } else toast.error(r.message);
    });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2.5 mb-6">
        <Settings className="w-5 h-5 text-gray-400" />
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
      </div>

      {/* General */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <form onSubmit={handleOrgUpdate} className="flex flex-col gap-4">
              <Input
                label="Organization name"
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
              />
              <Input
                label="Website"
                name="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
              />
              <div className="flex justify-end">
                <Button type="submit" variant="primary" loading={isPending}>
                  Save changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              <Row label="Name" value={org.name} />
              {org.description && <Row label="Description" value={org.description} />}
              {org.website && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Website</span>
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1 text-sm"
                  >
                    {org.website} <Globe className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Information</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 text-sm">
            <Row label="Slug" value={org.slug} mono />
            <Row label="Organization ID" value={org.id} mono />
            {org.algorandAppId && (
              <Row label="Algorand App ID" value={org.algorandAppId} mono />
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1 text-sm">
                <Calendar className="w-3.5 h-3.5" /> Created
              </span>
              <span className="text-gray-300 text-sm">{relativeTime(org.createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Departments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-400" />
              Departments
            </CardTitle>
            {isAdmin && (
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setAddingDept(true)}
              >
                Add department
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {departments.length === 0 && !addingDept ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No departments yet.{" "}
              {isAdmin && (
                <button
                  onClick={() => setAddingDept(true)}
                  className="text-blue-400 hover:underline"
                >
                  Add one
                </button>
              )}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
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
            </ul>
          )}

          {isAdmin && addingDept && (
            <form onSubmit={handleAddDept} className="flex items-center gap-2 mt-3">
              <input
                autoFocus
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Department name"
                className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-blue-500/50"
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
                onClick={() => { setAddingDept(false); setDeptName(""); }}
              >
                Cancel
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Department item ──────────────────────────────────────────────────────────

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
        toast.success("Department head updated");
        router.refresh();
      } else toast.error(r.message);
    });
  }

  return (
    <li className="border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Department header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
        )}
        <span className="text-sm font-medium text-white flex-1">{dept.name}</span>
        {headName && (
          <span className="text-[10px] text-gray-500 flex items-center gap-1 mr-2">
            <Crown className="w-3 h-3 text-amber-400" />
            {headName}
          </span>
        )}
        <Badge variant="default">
          {dept.members.length} member{dept.members.length !== 1 ? "s" : ""}
        </Badge>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.04] px-4 py-3 flex flex-col gap-3">
          {/* Head assignment */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs text-gray-400 shrink-0">Head:</span>
              <select
                value={dept.headId ?? ""}
                onChange={(e) => handleSetHead(e.target.value)}
                disabled={headPending}
                className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-blue-500/50"
              >
                <option value="">— Unassigned —</option>
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Members in this department */}
          {dept.members.length > 0 ? (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium flex items-center gap-1.5 mb-1">
                <Users className="w-3 h-3" /> Members
              </p>
              {dept.members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-blue-200 shrink-0">
                    {m.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{m.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{m.email}</p>
                  </div>
                  <Badge className={cn("text-[10px]", roleColor(m.role))}>
                    {m.role}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-2">
              No members assigned to this department yet.
            </p>
          )}
        </div>
      )}
    </li>
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
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-500 shrink-0 text-sm">{label}</span>
      <span
        className={cn("text-gray-300 truncate", mono ? "font-mono text-xs" : "text-sm")}
      >
        {value}
      </span>
    </div>
  );
}
