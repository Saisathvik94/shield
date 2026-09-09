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
  Users,
  Crown,
} from "lucide-react";
import { updateOrg } from "@/lib/actions/org-actions";
import {
  createDepartmentAction,
  createSectionAction,
  createTeamAction,
  setDepartmentHeadAction,
  setSectionHeadAction,
} from "./structure-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { relativeTime, cn } from "@/lib/utils";

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

interface TeamData { id: string; name: string; }

interface SectionData {
  id: string;
  name: string;
  headId: string | null;
  teams: TeamData[];
}

interface DeptData {
  id: string;
  name: string;
  description: string | null;
  headId: string | null;
  sections: SectionData[];
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
  members,
  isAdmin,
}: {
  org: OrgData;
  departments: DeptData[];
  members: MemberOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description ?? "");
  const [website, setWebsite] = useState(org.website ?? "");

  // New dept
  const [deptName, setDeptName] = useState("");
  const [addingDept, setAddingDept] = useState(false);
  const [deptPending, startDeptTx] = useTransition();

  // Expand state
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggleExpand(id: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function handleOrgUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateOrg(org.id, new FormData(e.currentTarget));
      if (result.status === "success") { toast.success("Organization updated."); router.refresh(); }
      else toast.error(result.message);
    });
  }

  function handleAddDept(e: React.FormEvent) {
    e.preventDefault();
    if (!deptName.trim()) return;
    startDeptTx(async () => {
      const r = await createDepartmentAction(org.id, deptName);
      if (r.status === "success") { toast.success(`Department "${deptName}" created`); setDeptName(""); setAddingDept(false); router.refresh(); }
      else toast.error(r.message);
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
              <Input label="Organization name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Textarea label="Description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Input label="Website" name="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
              <div className="flex justify-end">
                <Button type="submit" variant="primary" loading={isPending}>Save changes</Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              <Row label="Name" value={org.name} />
              {org.description && <Row label="Description" value={org.description} />}
              {org.website && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Website</span>
                  <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
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
            {org.algorandAppId && <Row label="Algorand App ID" value={org.algorandAppId} mono />}
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Created</span>
              <span className="text-gray-300">{relativeTime(org.createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Org structure */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-400" />
              Organization Structure
            </CardTitle>
            {isAdmin && (
              <Button size="sm" variant="secondary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddingDept(true)}>
                Add department
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {departments.length === 0 && !addingDept ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No departments yet.{isAdmin && <button onClick={() => setAddingDept(true)} className="ml-1 text-blue-400 hover:underline">Add one</button>}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {departments.map((dept) => (
                <DeptItem
                  key={dept.id}
                  dept={dept}
                  orgId={org.id}
                  members={members}
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
                autoFocus value={deptName} onChange={(e) => setDeptName(e.target.value)}
                placeholder="Department name"
                className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-blue-500/50"
              />
              <Button type="submit" size="sm" variant="primary" loading={deptPending} disabled={!deptName.trim()}>Add</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingDept(false); setDeptName(""); }}>Cancel</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Department item ──────────────────────────────────────────────────────────

function DeptItem({
  dept, orgId, members, isAdmin, expanded, onToggle,
}: {
  dept: DeptData; orgId: string; members: MemberOption[];
  isAdmin: boolean; expanded: boolean; onToggle: () => void;
}) {
  const router = useRouter();
  const [addingSection, setAddingSection] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [sectionPending, startSectionTx] = useTransition();
  const [headPending, startHeadTx] = useTransition();

  function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionName.trim()) return;
    startSectionTx(async () => {
      const r = await createSectionAction(dept.id, orgId, sectionName);
      if (r.status === "success") { toast.success(`Section "${sectionName}" created`); setSectionName(""); setAddingSection(false); router.refresh(); }
      else toast.error(r.message);
    });
  }

  function handleSetHead(userId: string) {
    startHeadTx(async () => {
      const r = await setDepartmentHeadAction(dept.id, orgId, userId);
      if (r.status === "success") { toast.success("Department head updated"); router.refresh(); }
      else toast.error(r.message);
    });
  }

  const headName = dept.headId ? members.find((m) => m.id === dept.headId)?.name : null;

  return (
    <li className="border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
        <span className="text-sm font-medium text-white flex-1">{dept.name}</span>
        {headName && (
          <span className="text-[10px] text-gray-500 flex items-center gap-1 mr-2">
            <Crown className="w-3 h-3 text-amber-400" />{headName}
          </span>
        )}
        <Badge variant="default">{dept.sections.length} section{dept.sections.length !== 1 ? "s" : ""}</Badge>
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t border-white/[0.04] pt-3 flex flex-col gap-3">
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
                <option value="">- Unassigned -</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}

          {/* Sections */}
          <div className="flex flex-col gap-1.5">
            {dept.sections.map((section) => (
              <SectionItem
                key={section.id}
                section={section}
                deptId={dept.id}
                orgId={orgId}
                members={members}
                isAdmin={isAdmin}
              />
            ))}
          </div>

          {isAdmin && (
            addingSection ? (
              <form onSubmit={handleAddSection} className="flex items-center gap-2 pl-4">
                <input
                  autoFocus value={sectionName} onChange={(e) => setSectionName(e.target.value)}
                  placeholder="Section name"
                  className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-blue-500/50"
                />
                <Button type="submit" size="sm" variant="primary" loading={sectionPending} disabled={!sectionName.trim()}>Add</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingSection(false); setSectionName(""); }}>Cancel</Button>
              </form>
            ) : (
              <button
                onClick={() => setAddingSection(true)}
                className="flex items-center gap-1.5 pl-4 text-xs text-gray-500 hover:text-blue-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add section
              </button>
            )
          )}
        </div>
      )}
    </li>
  );
}

// ─── Section item ─────────────────────────────────────────────────────────────

function SectionItem({
  section, deptId, orgId, members, isAdmin,
}: {
  section: SectionData; deptId: string; orgId: string;
  members: MemberOption[]; isAdmin: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [addingTeam, setAddingTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamPending, startTeamTx] = useTransition();
  const [headPending, startHeadTx] = useTransition();

  function handleAddTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    startTeamTx(async () => {
      const r = await createTeamAction(section.id, deptId, orgId, teamName);
      if (r.status === "success") { toast.success(`Team "${teamName}" created`); setTeamName(""); setAddingTeam(false); router.refresh(); }
      else toast.error(r.message);
    });
  }

  function handleSetHead(userId: string) {
    startHeadTx(async () => {
      const r = await setSectionHeadAction(section.id, orgId, userId);
      if (r.status === "success") { toast.success("Section head updated"); router.refresh(); }
      else toast.error(r.message);
    });
  }

  const headName = section.headId ? members.find((m) => m.id === section.headId)?.name : null;

  return (
    <div className="border border-white/[0.05] rounded-lg overflow-hidden ml-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-600 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
        <span className="text-sm text-gray-300 flex-1">{section.name}</span>
        {headName && (
          <span className="text-[10px] text-gray-500 flex items-center gap-1 mr-2">
            <Crown className="w-3 h-3 text-amber-400/60" />{headName}
          </span>
        )}
        {section.teams.length > 0 && (
          <Badge variant="default">{section.teams.length} team{section.teams.length !== 1 ? "s" : ""}</Badge>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2.5 border-t border-white/[0.04] pt-2.5 flex flex-col gap-2">
          {/* Section head */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Crown className="w-3 h-3 text-amber-400/60 shrink-0" />
              <span className="text-[10px] text-gray-500 shrink-0">Head:</span>
              <select
                value={section.headId ?? ""}
                onChange={(e) => handleSetHead(e.target.value)}
                disabled={headPending}
                className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-blue-500/50"
              >
                <option value="">- Unassigned -</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}

          {/* Teams */}
          {section.teams.map((team) => (
            <div key={team.id} className="flex items-center gap-2 pl-2 py-1">
              <Users className="w-3 h-3 text-gray-600 shrink-0" />
              <span className="text-xs text-gray-400">{team.name}</span>
            </div>
          ))}

          {isAdmin && (
            addingTeam ? (
              <form onSubmit={handleAddTeam} className="flex items-center gap-2 pl-2">
                <input
                  autoFocus value={teamName} onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Team name"
                  className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white placeholder:text-gray-500 outline-none focus:border-blue-500/50"
                />
                <Button type="submit" size="sm" variant="primary" loading={teamPending} disabled={!teamName.trim()}>Add</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingTeam(false); setTeamName(""); }}>Cancel</Button>
              </form>
            ) : (
              <button
                onClick={() => setAddingTeam(true)}
                className="flex items-center gap-1.5 pl-2 text-[10px] text-gray-500 hover:text-blue-400 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add team
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean; }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className={cn("text-gray-300 truncate", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}
