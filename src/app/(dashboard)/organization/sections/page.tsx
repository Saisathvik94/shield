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

interface SectionItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  departmentId: string;
  department: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    teams: number;
    employees: number;
  };
}

export default function SectionsPage() {
  const { activeOrgId } = useOrganization();
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({ departmentId: "", name: "", code: "", description: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);
  const [editData, setEditData] = useState({ name: "", code: "", description: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const [deptRes, secRes] = await Promise.all([
        fetch(`/api/departments?organizationId=${activeOrgId}`),
        fetch(
          `/api/sections?organizationId=${activeOrgId}${
            selectedDeptFilter ? `&departmentId=${selectedDeptFilter}` : ""
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
    } catch (err) {
      console.error("Failed to load sections data", err);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId, selectedDeptFilter]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!activeOrgId) {
        setLoading(false);
        return;
      }
      try {
        const [deptRes, secRes] = await Promise.all([
          fetch(`/api/departments?organizationId=${activeOrgId}`),
          fetch(
            `/api/sections?organizationId=${activeOrgId}${
              selectedDeptFilter ? `&departmentId=${selectedDeptFilter}` : ""
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
      } catch (err) {
        console.error("Failed to load sections data", err);
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
  }, [activeOrgId, selectedDeptFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;
    setCreateError(null);
    setCreateLoading(true);

    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrgId,
          departmentId: createData.departmentId,
          name: createData.name.trim(),
          code: createData.code.trim().toUpperCase(),
          description: createData.description.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setCreateError(json.error || "Failed to create section.");
        return;
      }

      setIsCreateOpen(false);
      setCreateData({ departmentId: "", name: "", code: "", description: "" });
      await loadData();
      setActionMsg({ type: "success", text: "Section created successfully!" });
      setTimeout(() => setActionMsg(null), 3000);
    } catch {
      setCreateError("Network error while creating section.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !editingSection) return;
    setEditError(null);
    setEditLoading(true);

    try {
      const res = await fetch(`/api/sections/${editingSection.id}`, {
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
        setEditError(json.error || "Failed to update section.");
        return;
      }

      setEditingSection(null);
      await loadData();
      setActionMsg({ type: "success", text: "Section updated successfully!" });
      setTimeout(() => setActionMsg(null), 3000);
    } catch {
      setEditError("Network error while updating section.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (section: SectionItem) => {
    if (!activeOrgId) return;
    if (!confirm(`Are you sure you want to delete section '${section.name}' (${section.code})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/sections/${section.id}?organizationId=${activeOrgId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        setActionMsg({ type: "error", text: json.error || "Failed to delete section." });
        setTimeout(() => setActionMsg(null), 5000);
        return;
      }

      await loadData();
      setActionMsg({ type: "success", text: "Section deleted successfully!" });
      setTimeout(() => setActionMsg(null), 3000);
    } catch {
      setActionMsg({ type: "error", text: "Network error while deleting section." });
      setTimeout(() => setActionMsg(null), 5000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sections</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Level 2 functional divisions scoped within parent departments
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateData({
              departmentId: departments[0]?.id || "",
              name: "",
              code: "",
              description: "",
            });
            setIsCreateOpen(true);
          }}
          disabled={departments.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-500 disabled:opacity-50 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Section
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
          Filter by Department:
        </label>
        <select
          value={selectedDeptFilter}
          onChange={(e) => setSelectedDeptFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableLoadingSkeleton rows={4} cols={5} />
          </div>
        ) : sections.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Sections Found"
              description={
                departments.length === 0
                  ? "You must create a department first before creating sections."
                  : "No sections found under the selected department. Create a new section (e.g. Threat Intelligence, Cloud SecOps)."
              }
              actionText={departments.length > 0 ? "Create Section" : undefined}
              onAction={() => setIsCreateOpen(true)}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs font-semibold uppercase text-zinc-400 bg-zinc-900/80">
                <tr>
                  <th className="py-3.5 px-6">Section Name</th>
                  <th className="py-3.5 px-6">Code</th>
                  <th className="py-3.5 px-6">Parent Department</th>
                  <th className="py-3.5 px-6">Teams</th>
                  <th className="py-3.5 px-6">Employees</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                {sections.map((sec) => (
                  <tr key={sec.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-4 px-6 font-medium text-white">{sec.name}</td>
                    <td className="py-4 px-6 font-mono text-xs text-cyan-400">
                      <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5">
                        {sec.code}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-300">
                      {sec.department.name} ({sec.department.code})
                    </td>
                    <td className="py-4 px-6 text-sm">{sec._count.teams}</td>
                    <td className="py-4 px-6 text-sm">{sec._count.employees}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSection(sec);
                            setEditData({
                              name: sec.name,
                              code: sec.code,
                              description: sec.description || "",
                            });
                          }}
                          className="rounded px-2.5 py-1 text-xs font-medium border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sec)}
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
        title="Create Section"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Parent Department
            </label>
            <select
              required
              value={createData.departmentId}
              onChange={(e) => setCreateData({ ...createData, departmentId: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
              Section Name
            </label>
            <input
              type="text"
              required
              value={createData.name}
              onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
              placeholder="e.g. Identity & Access Section"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Section Code
            </label>
            <input
              type="text"
              required
              value={createData.code}
              onChange={(e) => setCreateData({ ...createData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. IAM"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white font-mono uppercase outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              Unique section code within its department.
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
              placeholder="Responsibilities..."
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
              disabled={createLoading}
              className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-500 disabled:opacity-50 transition"
            >
              {createLoading ? "Creating..." : "Create Section"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingSection}
        onClose={() => setEditingSection(null)}
        title="Edit Section"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {editError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {editError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Section Name
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
              Section Code
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
              onClick={() => setEditingSection(null)}
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
