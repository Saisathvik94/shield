"use client";

import React, { useState } from "react";
import { useOrganization } from "@/context/organization-context";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function OrganizationPage() {
  const { organizations, activeOrg, activeOrgId, setActiveOrgId, refreshOrganizations, loading: orgLoading } = useOrganization();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    slug: "",
    description: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "SUSPENDED",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleStartEdit = () => {
    if (!activeOrg) return;
    setEditData({
      name: activeOrg.name,
      slug: activeOrg.slug,
      description: activeOrg.description || "",
      status: activeOrg.status,
    });
    setIsEditing(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createData.name.trim(),
          slug: createData.slug.trim().toLowerCase(),
          description: createData.description.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setCreateError(json.error || "Failed to create organization.");
        return;
      }

      await refreshOrganizations();
      setActiveOrgId(json.data.id);
      setIsCreateOpen(false);
      setCreateData({ name: "", slug: "", description: "" });
      setSuccessMsg("Organization created successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setCreateError("Network error while creating organization.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;

    setEditError(null);
    setEditLoading(true);

    try {
      const res = await fetch(`/api/organizations/${activeOrgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editData.name.trim(),
          slug: editData.slug.trim().toLowerCase(),
          description: editData.description.trim() || null,
          status: editData.status,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setEditError(json.error || "Failed to update organization.");
        return;
      }

      await refreshOrganizations();
      setIsEditing(false);
      setSuccessMsg("Organization details updated successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setEditError("Network error while updating organization.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED") => {
    if (!activeOrgId) return;
    try {
      const res = await fetch(`/api/organizations/${activeOrgId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await refreshOrganizations();
        setSuccessMsg(`Organization status changed to ${newStatus}`);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (orgLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-8 w-64" />
        <LoadingSkeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Organization Management
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Configure enterprise tenant identity and operational status
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
          New Organization
        </button>
      </div>

      {successMsg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-400">
          ✓ {successMsg}
        </div>
      )}

      {activeOrg ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">{activeOrg.name}</h2>
                <Badge
                  variant={
                    activeOrg.status === "ACTIVE"
                      ? "success"
                      : activeOrg.status === "SUSPENDED"
                      ? "warning"
                      : "danger"
                  }
                >
                  {activeOrg.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs font-mono text-cyan-400">
                slug: {activeOrg.slug} • id: {activeOrg.id}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition"
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                  Description
                </span>
                <p className="mt-1 text-sm text-zinc-300">
                  {activeOrg.description || "No description provided for this organization."}
                </p>
              </div>

              <div className="border-t border-zinc-800 pt-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-3">
                  Quick Status Control
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange("ACTIVE")}
                    disabled={activeOrg.status === "ACTIVE"}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition"
                  >
                    Set ACTIVE
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange("SUSPENDED")}
                    disabled={activeOrg.status === "SUSPENDED"}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 transition"
                  >
                    Set SUSPENDED
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange("INACTIVE")}
                    disabled={activeOrg.status === "INACTIVE"}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition"
                  >
                    Set INACTIVE
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              {editError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Organization Name
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
                    Tenant Slug
                  </label>
                  <input
                    type="text"
                    required
                    value={editData.slug}
                    onChange={(e) => setEditData({ ...editData, slug: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white font-mono outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Enterprise security domain, divisions..."
                  className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Tenant Status
                </label>
                <select
                  value={editData.status}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      status: e.target.value as "ACTIVE" | "INACTIVE" | "SUSPENDED",
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-500 disabled:opacity-50 transition"
                >
                  {editLoading ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {/* All Tenants Selector Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
        <h3 className="text-base font-semibold text-white mb-4">All Organizations</h3>
        {organizations.length === 0 ? (
          <p className="text-sm text-zinc-400">No organizations created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs font-semibold uppercase text-zinc-400">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Departments</th>
                  <th className="py-3 px-4">Employees</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {organizations.map((org) => {
                  const isCurrent = org.id === activeOrgId;
                  return (
                    <tr
                      key={org.id}
                      className={`hover:bg-zinc-800/40 transition ${
                        isCurrent ? "bg-cyan-500/5 font-medium" : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-white">{org.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-cyan-400">{org.slug}</td>
                      <td className="py-3 px-4">
                        <Badge
                          size="sm"
                          variant={
                            org.status === "ACTIVE"
                              ? "success"
                              : org.status === "SUSPENDED"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {org.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{org._count?.departments ?? 0}</td>
                      <td className="py-3 px-4">{org._count?.employees ?? 0}</td>
                      <td className="py-3 px-4 text-right">
                        {isCurrent ? (
                          <span className="text-xs text-cyan-400 font-semibold">Active</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveOrgId(org.id)}
                            className="rounded px-2.5 py-1 text-xs font-medium border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                          >
                            Switch To
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Organization"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Organization Name
            </label>
            <input
              type="text"
              required
              value={createData.name}
              onChange={(e) => {
                const name = e.target.value;
                const slug = name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "");
                setCreateData({ ...createData, name, slug });
              }}
              placeholder="e.g. Acme Corp"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Tenant Slug
            </label>
            <input
              type="text"
              required
              value={createData.slug}
              onChange={(e) => setCreateData({ ...createData, slug: e.target.value })}
              placeholder="e.g. acme-corp"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white font-mono outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={createData.description}
              onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
              placeholder="Company domain, mission..."
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
              {createLoading ? "Creating..." : "Create Tenant"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
