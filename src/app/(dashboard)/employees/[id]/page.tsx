"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/context/organization-context";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface EmployeeDetail {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  designation: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED";
  organizationId: string;
  departmentId: string | null;
  sectionId: string | null;
  teamId: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  organization: { id: string; name: string; slug: string };
  department: { id: string; name: string; code: string } | null;
  section: { id: string; name: string; code: string } | null;
  team: { id: string; name: string; code: string } | null;
  user: { id: string; email: string; name: string | null } | null;
}

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

interface TeamOption {
  id: string;
  name: string;
  code: string;
  sectionId: string;
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;
  const { activeOrgId } = useOrganization();

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Hierarchy Data
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [allSections, setAllSections] = useState<SectionOption[]>([]);
  const [allTeams, setAllTeams] = useState<TeamOption[]>([]);

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    employeeCode: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    designation: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED",
    departmentId: "",
    sectionId: "",
    teamId: "",
  });

  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      if (!activeOrgId || !employeeId) {
        setLoading(false);
        return;
      }
      try {
        const [empRes, deptRes, secRes, teamRes] = await Promise.all([
          fetch(`/api/employees/${employeeId}?organizationId=${activeOrgId}`),
          fetch(`/api/departments?organizationId=${activeOrgId}`),
          fetch(`/api/sections?organizationId=${activeOrgId}`),
          fetch(`/api/teams?organizationId=${activeOrgId}`),
        ]);

        if (empRes.ok && !ignore) {
          const empJson = await empRes.json();
          const emp: EmployeeDetail = empJson.data;
          setEmployee(emp);
          setEditForm({
            employeeCode: emp.employeeCode,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            phone: emp.phone || "",
            designation: emp.designation || "",
            status: emp.status,
            departmentId: emp.departmentId || "",
            sectionId: emp.sectionId || "",
            teamId: emp.teamId || "",
          });
        }
        if (deptRes.ok && !ignore) {
          const dJson = await deptRes.json();
          setDepartments(dJson.data || []);
        }
        if (secRes.ok && !ignore) {
          const sJson = await secRes.json();
          setAllSections(sJson.data || []);
        }
        if (teamRes.ok && !ignore) {
          const tJson = await teamRes.json();
          setAllTeams(tJson.data || []);
        }
      } catch (err) {
        console.error("Failed to load employee profile", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [activeOrgId, employeeId]);

  // Dependent dropdown options
  const availableSections = editForm.departmentId
    ? allSections.filter((s) => s.departmentId === editForm.departmentId)
    : [];

  const availableTeams = editForm.sectionId
    ? allTeams.filter((t) => t.sectionId === editForm.sectionId)
    : [];

  const handleDepartmentChange = (deptId: string) => {
    setEditForm((prev) => ({
      ...prev,
      departmentId: deptId,
      sectionId: "",
      teamId: "",
    }));
  };

  const handleSectionChange = (secId: string) => {
    setEditForm((prev) => ({
      ...prev,
      sectionId: secId,
      teamId: "",
    }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId || !employeeId) return;

    setEditError(null);
    setSaving(true);

    try {
      const payload = {
        organizationId: activeOrgId,
        employeeCode: editForm.employeeCode.trim().toUpperCase(),
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim().toLowerCase(),
        phone: editForm.phone.trim() || null,
        designation: editForm.designation.trim() || null,
        status: editForm.status,
        departmentId: editForm.departmentId || null,
        sectionId: editForm.sectionId || null,
        teamId: editForm.teamId || null,
      };

      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setEditError(json.error || "Failed to update employee.");
        return;
      }

      setEmployee(json.data);
      setIsEditing(false);
      setActionMsg({ type: "success", text: "Employee record updated successfully!" });
      setTimeout(() => setActionMsg(null), 3000);
    } catch {
      setEditError("Network error while updating employee.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeOrgId || !employee) return;
    if (!confirm(`Are you sure you want to permanently delete ${employee.firstName} ${employee.lastName} (${employee.employeeCode})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/employees/${employee.id}?organizationId=${activeOrgId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/employees");
      } else {
        const json = await res.json();
        setActionMsg({ type: "error", text: json.error || "Failed to delete employee." });
      }
    } catch {
      setActionMsg({ type: "error", text: "Network error during deletion." });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-8 w-64" />
        <LoadingSkeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-semibold text-white">Employee Not Found</h2>
        <p className="mt-1 text-sm text-zinc-400">
          The requested employee record does not exist in this organization.
        </p>
        <Link
          href="/employees"
          className="mt-4 inline-block rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Return to Employees
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Link href="/employees" className="hover:text-zinc-200 transition">
              Employees
            </Link>
            <span>/</span>
            <span className="text-zinc-200">{employee.employeeCode}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {employee.firstName} {employee.lastName}
            </h1>
            <Badge
              variant={
                employee.status === "ACTIVE"
                  ? "success"
                  : employee.status === "SUSPENDED"
                  ? "warning"
                  : "danger"
              }
            >
              {employee.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Designation: <span className="text-zinc-200 font-medium">{employee.designation || "Unspecified"}</span> • ID: <code className="font-mono text-cyan-400">{employee.id}</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-500 transition"
            >
              Edit Profile
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition"
            >
              Cancel Edit
            </button>
          )}

          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition"
          >
            Delete
          </button>
        </div>
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

      {!isEditing ? (
        <div className="space-y-6">
          {/* Details Overview Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Contact & Identification
              </span>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="text-zinc-400 text-xs">Employee Code:</span>{" "}
                  <span className="font-mono text-cyan-400 font-medium">{employee.employeeCode}</span>
                </div>
                <div>
                  <span className="text-zinc-400 text-xs">Email:</span>{" "}
                  <span className="text-white">{employee.email}</span>
                </div>
                <div>
                  <span className="text-zinc-400 text-xs">Phone:</span>{" "}
                  <span className="text-zinc-300">{employee.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 text-xs">Designation:</span>{" "}
                  <span className="text-zinc-300">{employee.designation || "—"}</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                System Metadata
              </span>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="text-zinc-400 text-xs">Organization:</span>{" "}
                  <span className="text-white font-medium">{employee.organization.name}</span>
                </div>
                <div>
                  <span className="text-zinc-400 text-xs">User Account:</span>{" "}
                  {employee.user ? (
                    <span className="text-emerald-400 font-medium">
                      Linked ({employee.user.email})
                    </span>
                  ) : (
                    <span className="text-zinc-400">No login account linked</span>
                  )}
                </div>
                <div>
                  <span className="text-zinc-400 text-xs">Created:</span>{" "}
                  <span className="text-zinc-300">
                    {new Date(employee.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Organizational Hierarchy Assignment Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-sm space-y-4">
            <h3 className="text-base font-semibold text-white border-b border-zinc-800 pb-3">
              Hierarchy Assignment Tree
            </h3>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
                  🏢
                </div>
                <div>
                  <span className="text-xs text-zinc-400 font-semibold uppercase block">
                    Department (Level 1)
                  </span>
                  <span className="text-sm font-medium text-white">
                    {employee.department ? `${employee.department.name} (${employee.department.code})` : "Unassigned"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4 pl-6 border-l border-zinc-800 ml-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
                  📁
                </div>
                <div>
                  <span className="text-xs text-zinc-400 font-semibold uppercase block">
                    Section (Level 2)
                  </span>
                  <span className="text-sm font-medium text-white">
                    {employee.section ? `${employee.section.name} (${employee.section.code})` : "Unassigned"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4 pl-12 border-l border-zinc-800 ml-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                  👥
                </div>
                <div>
                  <span className="text-xs text-cyan-400 font-semibold uppercase block">
                    Team (Level 3)
                  </span>
                  <span className="text-sm font-medium text-white">
                    {employee.team ? `${employee.team.name} (${employee.team.code})` : "Unassigned"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Form */
        <form onSubmit={handleUpdate} className="space-y-6">
          {editError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {editError}
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-sm space-y-4">
            <h2 className="text-base font-semibold text-white border-b border-zinc-800 pb-3">
              Edit Personal Info
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Employee Code
                </label>
                <input
                  type="text"
                  required
                  value={editForm.employeeCode}
                  onChange={(e) =>
                    setEditForm({ ...editForm, employeeCode: e.target.value.toUpperCase() })
                  }
                  className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white font-mono uppercase outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Designation
                </label>
                <input
                  type="text"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Employment Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    status: e.target.value as "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED",
                  })
                }
                className="mt-1.5 w-full md:w-1/3 rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="TERMINATED">TERMINATED</option>
              </select>
            </div>
          </div>

          {/* Organizational Hierarchy Assignment */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-sm space-y-4">
            <div className="border-b border-zinc-800 pb-3">
              <h2 className="text-base font-semibold text-white">
                Hierarchy Assignment
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Update Department → Section → Team assignment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Department */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  1. Department
                </label>
                <select
                  value={editForm.departmentId}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
                >
                  <option value="">— Unassigned Department —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  2. Section
                </label>
                <select
                  value={editForm.sectionId}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  disabled={!editForm.departmentId || availableSections.length === 0}
                  className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 disabled:opacity-40"
                >
                  <option value="">
                    {!editForm.departmentId
                      ? "— Select Department First —"
                      : availableSections.length === 0
                      ? "— No Sections in Department —"
                      : "— Unassigned Section —"}
                  </option>
                  {availableSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Team */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  3. Team
                </label>
                <select
                  value={editForm.teamId}
                  onChange={(e) => setEditForm({ ...editForm, teamId: e.target.value })}
                  disabled={!editForm.sectionId || availableTeams.length === 0}
                  className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 disabled:opacity-40"
                >
                  <option value="">
                    {!editForm.sectionId
                      ? "— Select Section First —"
                      : availableTeams.length === 0
                      ? "— No Teams in Section —"
                      : "— Unassigned Team —"}
                  </option>
                  {availableTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-500 disabled:opacity-50 transition"
            >
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
