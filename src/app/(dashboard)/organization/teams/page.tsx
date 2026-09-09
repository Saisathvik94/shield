"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/context/organization-context";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { TableLoadingSkeleton } from "@/components/ui/loading-skeleton";

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface SectionOption {
  id: string;
  name: string;
  code: string;
  departmentId: string;
}

interface TeamItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  sectionId: string;
  section: {
    id: string;
    name: string;
    code: string;
    department: {
      id: string;
      name: string;
      code: string;
    };
  };
  _count: {
    employees: number;
  };
}

export default function TeamsPage() {
  const { activeOrgId } = useOrganization();
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDeptId, setCreateDeptId] = useState("");
  const [createData, setCreateData] = useState({ sectionId: "", name: "", code: "", description: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null);
  const [editData, setEditData] = useState({ name: "", code: "", description: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const [deptRes, secRes, teamRes] = await Promise.all([
        fetch(`/api/departments?organizationId=${activeOrgId}`),
        fetch(`/api/sections?organizationId=${activeOrgId}`),
        fetch(
          `/api/teams?organizationId=${activeOrgId}${
            selectedSectionFilter ? `&sectionId=${selectedSectionFilter}` : ""
          }`
        ),
      ]);

      if (deptRes.ok) {
        const deptJson = await deptRes.json();
        setDepartments(deptJson.data || []);
      }
      if (secRes.ok) {
        const secJson = await secRes.json();
        setSections(secJson.data || []);
      }
      if (teamRes.ok) {
        const teamJson = await teamRes.json();
        setTeams(teamJson.data || []);
      }
    } catch (err) {
      console.error("Failed to load teams data", err);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId, selectedSectionFilter]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!activeOrgId) {
        setLoading(false);
        return;
      }
      try {
        const [deptRes, secRes, teamRes] = await Promise.all([
          fetch(`/api/departments?organizationId=${activeOrgId}`),
          fetch(`/api/sections?organizationId=${activeOrgId}`),
          fetch(
            `/api/teams?organizationId=${activeOrgId}${
              selectedSectionFilter ? `&sectionId=${selectedSectionFilter}` : ""
            }`
          ),
        ]);

        if (deptRes.ok && !ignore) {
          const deptJson = await deptRes.json();
          setDepartments(deptJson.data || []);
        }
        if (secRes.ok && !ignore) {
          const secJson = await secRes.json();
          setSections(secJson.data || []);
        }
        if (teamRes.ok && !ignore) {
          const teamJson = await teamRes.json();
          setTeams(teamJson.data || []);
        }
      } catch (err) {
        console.error("Failed to load teams data", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [activeOrgId, selectedSectionFilter]);

  // Filter sections available for chosen department during creation
  const filteredCreateSections = createDeptId
    ? sections.filter((s) => s.departmentId === createDeptId)
    : sections;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;
    setCreateError(null);
    setCreateLoading(true);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrgId,
          sectionId: createData.sectionId,
          name: createData.name.trim(),
          code: createData.code.trim().toUpperCase(),
          description: createData.description.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setCreateError(json.error || "Failed to create team.");
        return;
      }

      setIsCreateOpen(false);
      setCreateData({ sectionId: "", name: "", code: "", description: "" });
      await loadData();
      setActionMsg({ type: "success", text: "Team created successfully!" });
      setTimeout(() => setActionMsg(null), 3000);
    } catch {
      setCreateError("Network error while creating team.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !editingTeam) return;
    setEditError(null);
    setEditLoading(true);

    try {
      const res = await fetch(`/api/teams/${editingTeam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrgId,
          name: editData.name.trim(),
          code: editData.code.trim().toUpperCase(),
          description: editData.description.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setEditError(json.error || "Failed to update team.");
        return;
      }

      setEditingTeam(null);
      await loadData();
      setActionMsg({ type: "success", text: "Team updated successfully!" });
      setTimeout(() => setActionMsg(null), 3000);
    } catch {
      setEditError("Network error while updating team.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (team: TeamItem) => {
    if (!activeOrgId) return;
    if (!confirm(`Are you sure you want to delete team '${team.name}' (${team.code})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/${team.id}?organizationId=${activeOrgId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        setActionMsg({ type: "error", text: json.error || "Failed to delete team." });
        setTimeout(() => setActionMsg(null), 5000);
        return;
      }

      await loadData();
      setActionMsg({ type: "success", text: "Team deleted successfully!" });
      setTimeout(() => setActionMsg(null), 3000);
    } catch {
      setActionMsg({ type: "error", text: "Network error while deleting team." });
      setTimeout(() => setActionMsg(null), 5000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Teams</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Level 3 working groups and agile squads scoped within sections
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const firstDept = departments[0]?.id || "";
            setCreateDeptId(firstDept);
            const firstSec = sections.find((s) => s.departmentId === firstDept)?.id || sections[0]?.id || "";
            setCreateData({
              sectionId: firstSec,
              name: "",
              code: "",
              description: "",
            });
            setIsCreateOpen(true);
          }}
          disabled={sections.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-500 disabled:opacity-50 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Team
        </button>
      </div>

      {actionMsg && (
        <div
          className={`rounded-lg border p-3.5 text-sm ${
            actionMsg.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {actionMsg.type === "success" ? "✓ " : "⚠ "}
          {actionMsg.text}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Filter by Section:
        </label>
        <select
          value={selectedSectionFilter}
          onChange={(e) => setSelectedSectionFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
        >
          <option value="">All Sections</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableLoadingSkeleton rows={4} cols={5} />
          </div>
        ) : teams.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Teams Found"
              description={
                sections.length === 0
                  ? "You must create a section before defining teams."
                  : "No teams found under the selected section. Create a new team (e.g. Red Team Ops, Auth Engineering)."
              }
              actionText={sections.length > 0 ? "Create Team" : undefined}
              onAction={() => {
                const firstDept = departments[0]?.id || "";
                setCreateDeptId(firstDept);
                const firstSec = sections.find((s) => s.departmentId === firstDept)?.id || sections[0]?.id || "";
                setCreateData({ sectionId: firstSec, name: "", code: "", description: "" });
                setIsCreateOpen(true);
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs font-semibold uppercase text-zinc-400 bg-zinc-900/80">
                <tr>
                  <th className="py-3.5 px-6">Team Name</th>
                  <th className="py-3.5 px-6">Code</th>
                  <th className="py-3.5 px-6">Parent Section</th>
                  <th className="py-3.5 px-6">Department</th>
                  <th className="py-3.5 px-6">Employees</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                {teams.map((team) => (
                  <tr key={team.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-4 px-6 font-medium text-white">{team.name}</td>
                    <td className="py-4 px-6 font-mono text-xs text-cyan-400">
                      <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5">
                        {team.code}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-300">
                      {team.section.name} ({team.section.code})
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-400">
                      {team.section.department.name} ({team.section.department.code})
                    </td>
                    <td className="py-4 px-6 text-sm">{team._count.employees}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTeam(team);
                            setEditData({
                              name: team.name,
                              code: team.code,
                              description: team.description || "",
                            });
                          }}
                          className="rounded px-2.5 py-1 text-xs font-medium border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(team)}
                          className="rounded px-2.5 py-1 text-xs font-medium border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Team"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Filter by Department
            </label>
            <select
              value={createDeptId}
              onChange={(e) => {
                const deptId = e.target.value;
                setCreateDeptId(deptId);
                const nextSec = sections.find((s) => s.departmentId === deptId)?.id || "";
                setCreateData({ ...createData, sectionId: nextSec });
              }}
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Parent Section
            </label>
            <select
              required
              value={createData.sectionId}
              onChange={(e) => setCreateData({ ...createData, sectionId: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              {filteredCreateSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Team Name
            </label>
            <input
              type="text"
              required
              value={createData.name}
              onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
              placeholder="e.g. Zero-Trust Identity Squad"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Team Code
            </label>
            <input
              type="text"
              required
              value={createData.code}
              onChange={(e) => setCreateData({ ...createData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. ZT-ID"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white font-mono uppercase outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              Unique team code within its section.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={createData.description}
              onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
              placeholder="Team mission..."
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading || !createData.sectionId}
              className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-500 disabled:opacity-50 transition"
            >
              {createLoading ? "Creating..." : "Create Team"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingTeam}
        onClose={() => setEditingTeam(null)}
        title="Edit Team"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {editError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {editError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Team Name
            </label>
            <input
              type="text"
              required
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Team Code
            </label>
            <input
              type="text"
              required
              value={editData.code}
              onChange={(e) => setEditData({ ...editData, code: e.target.value.toUpperCase() })}
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white font-mono uppercase outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Description
            </label>
            <textarea
              rows={3}
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setEditingTeam(null)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editLoading}
              className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-500 disabled:opacity-50 transition"
            >
              {editLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
