"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/context/organization-context";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function NewEmployeePage() {
  const router = useRouter();
  const { activeOrgId, activeOrg } = useOrganization();

  // Hierarchy Data
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [allSections, setAllSections] = useState<SectionOption[]>([]);
  const [allTeams, setAllTeams] = useState<TeamOption[]>([]);

  // Form State
  const [formData, setFormData] = useState({
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

  const [loadingHierarchy, setLoadingHierarchy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      if (!activeOrgId) {
        setLoadingHierarchy(false);
        return;
      }
      try {
        const [deptRes, secRes, teamRes] = await Promise.all([
          fetch(`/api/departments?organizationId=${activeOrgId}`),
          fetch(`/api/sections?organizationId=${activeOrgId}`),
          fetch(`/api/teams?organizationId=${activeOrgId}`),
        ]);

        if (deptRes.ok && !ignore) {
          const json = await deptRes.json();
          setDepartments(json.data || []);
        }
        if (secRes.ok && !ignore) {
          const json = await secRes.json();
          setAllSections(json.data || []);
        }
        if (teamRes.ok && !ignore) {
          const json = await teamRes.json();
          setAllTeams(json.data || []);
        }
      } catch (err) {
        console.error("Failed to load hierarchy options", err);
      } finally {
        if (!ignore) {
          setLoadingHierarchy(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [activeOrgId]);

  // Derived filtered dropdowns
  const availableSections = formData.departmentId
    ? allSections.filter((s) => s.departmentId === formData.departmentId)
    : [];

  const availableTeams = formData.sectionId
    ? allTeams.filter((t) => t.sectionId === formData.sectionId)
    : [];

  const handleDepartmentChange = (deptId: string) => {
    setFormData((prev) => ({
      ...prev,
      departmentId: deptId,
      sectionId: "",
      teamId: "",
    }));
  };

  const handleSectionChange = (secId: string) => {
    setFormData((prev) => ({
      ...prev,
      sectionId: secId,
      teamId: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) {
      setError("No active organization selected.");
      return;
    }

    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const payload = {
        organizationId: activeOrgId,
        employeeCode: formData.employeeCode.trim().toUpperCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        designation: formData.designation.trim() || undefined,
        status: formData.status,
        departmentId: formData.departmentId || undefined,
        sectionId: formData.sectionId || undefined,
        teamId: formData.teamId || undefined,
      };

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.details) {
          setFieldErrors(json.details);
        }
        setError(json.error || "Failed to create employee record.");
        return;
      }

      router.push("/employees");
      router.refresh();
    } catch {
      setError("Network or server error during employee creation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Link href="/employees" className="hover:text-zinc-200 transition">
              Employees
            </Link>
            <span>/</span>
            <span className="text-zinc-200">New Employee</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Register New Employee
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Tenant: <span className="font-semibold text-cyan-400">{activeOrg?.name}</span>
          </p>
        </div>

        <Link
          href="/employees"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition"
        >
          Back to Directory
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center gap-3">
          <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Personal Info */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-sm space-y-4">
          <h2 className="text-base font-semibold text-white border-b border-zinc-800 pb-3">
            Personal & Identification Info
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Employee Code *
              </label>
              <input
                type="text"
                required
                value={formData.employeeCode}
                onChange={(e) =>
                  setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })
                }
                placeholder="e.g. EMP-1042"
                className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white font-mono uppercase outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              {fieldErrors.employeeCode && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.employeeCode[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Sarah"
                className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              {fieldErrors.firstName && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.firstName[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Connor"
                className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              {fieldErrors.lastName && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.lastName[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="sarah@enterprise.com"
                className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 019-2834"
                className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Designation / Title
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Lead Cryptographic Engineer"
                className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Employment Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
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
              Organizational Hierarchy Assignment
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Dependent multi-tenant selection. Assign Department → Section → Team (all optional).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Department */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                1. Department
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                disabled={loadingHierarchy}
                className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 disabled:opacity-50"
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
                value={formData.sectionId}
                onChange={(e) => handleSectionChange(e.target.value)}
                disabled={!formData.departmentId || availableSections.length === 0}
                className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 disabled:opacity-40"
              >
                <option value="">
                  {!formData.departmentId
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
                value={formData.teamId}
                onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                disabled={!formData.sectionId || availableTeams.length === 0}
                className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 disabled:opacity-40"
              >
                <option value="">
                  {!formData.sectionId
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <Link
            href="/employees"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-500 disabled:opacity-50 transition flex items-center gap-2"
          >
            {submitting ? "Registering Employee..." : "Create Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}
