"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/context/organization-context";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { TableLoadingSkeleton } from "@/components/ui/loading-skeleton";

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: string;
  _count: {
    sections: number;
    employees: number;
  };
}

export default function DepartmentsPage() {
  const { activeOrgId } = useOrganization();
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({ name: "", code: "", description: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [editData, setEditData] = useState({ name: "", code: "", description: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchDepartments = useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/departments?organizationId=${activeOrgId}`);
      if (res.ok) {
        const json = await res.json();
        setDepartments(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load departments", err);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!activeOrgId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/departments?organizationId=${activeOrgId}`);
        if (res.ok && !ignore) {
          const json = await res.json();
          setDepartments(json.data || []);
        }
      } catch (err) {
        console.error("Failed to load departments", err);
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
  }, [activeOrgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;
    setCreateError(null);
    setCreateLoading(true);

    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrgId,
          name: createData.name.trim(),
          code: createData.code.trim().toUpperCase(),
          description: createData.description.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setCreateError(json.error || "Failed to create department.");
        return;
      }

      setIsCreateOpen(false);
      setCreateData({ name: "", code: "", description: "" });
      await fetchDepartments();
      setActionMsg({ type: "success", text: "Department created successfully!" });
      setTimeout(() => setActionMsg(null), 3000);
    } catch {
      setCreateError("Network error while creating department.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !editingDept) return;
    setEditError(null);
    setEditLoading(true);

    try {
      const res = await fetch(`/api/departments/${editingDept.id}`, {
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
        setEditError(json.error || "Failed to update department.");
        return;
      }

      setEditingDept(null);
      await fetchDepartments();
      setActionMsg({ type: "success", text: "Department updated successfully!" });
      setTimeout(() => setActionMsg(null), 3000);
    } catch {
      setEditError("Network error while updating department.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (dept: DepartmentItem) => {
    if (!activeOrgId) return;
    if (!confirm(`Are you sure you want to delete department '${dept.name}' (${dept.code})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/departments/${dept.id}?organizationId=${activeOrgId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        setActionMsg({ type: "error", text: json.error || "Failed to delete department." });
        setTimeout(() => setActionMsg(null), 5000);
        return;
      }

      await fetchDepartments();
      setActionMsg({ type: "success", text: "Department deleted successfully!" });
      setTimeout(() => setActionMsg(null), 3000);
    } catch {
      setActionMsg({ type: "error", text: "Network error while deleting department." });
      setTimeout(() => setActionMsg(null), 5000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Departments</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Level 1 organizational units within the active tenant
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-500 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Department
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

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableLoadingSkeleton rows={4} cols={5} />
          </div>
        ) : departments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Departments Found"
              description="No departments have been established in this organization yet. Create your first department (e.g. Engineering, Operations, Security)."
              actionText="Create Department"
              onAction={() => setIsCreateOpen(true)}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs font-semibold uppercase text-zinc-400 bg-zinc-900/80">
                <tr>
                  <th className="py-3.5 px-6">Department Name</th>
                  <th className="py-3.5 px-6">Code</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6">Sections</th>
                  <th className="py-3.5 px-6">Employees</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-4 px-6 font-medium text-white">{dept.name}</td>
                    <td className="py-4 px-6 font-mono text-xs text-cyan-400">
                      <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5">
                        {dept.code}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-400 max-w-xs truncate">
                      {dept.description || "—"}
                    </td>
                    <td className="py-4 px-6 text-sm">{dept._count.sections}</td>
                    <td className="py-4 px-6 text-sm">{dept._count.employees}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDept(dept);
                            setEditData({
                              name: dept.name,
                              code: dept.code,
                              description: dept.description || "",
                            });
                          }}
                          className="rounded px-2.5 py-1 text-xs font-medium border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(dept)}
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
        title="Create Department"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Department Name
            </label>
            <input
              type="text"
              required
              value={createData.name}
              onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
              placeholder="e.g. Cybersecurity Engineering"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Department Code
            </label>
            <input
              type="text"
              required
              value={createData.code}
              onChange={(e) => setCreateData({ ...createData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. CYBER"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white font-mono uppercase outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              Unique departmental code within this tenant.
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
              placeholder="Scope and purpose..."
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
              {createLoading ? "Creating..." : "Create Department"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingDept}
        onClose={() => setEditingDept(null)}
        title="Edit Department"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {editError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {editError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Department Name
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
              Department Code
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
              onClick={() => setEditingDept(null)}
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
