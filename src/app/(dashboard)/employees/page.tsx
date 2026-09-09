"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/context/organization-context";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableLoadingSkeleton } from "@/components/ui/loading-skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface EmployeeItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  designation: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED";
  department: { id: string; name: string; code: string } | null;
  section: { id: string; name: string; code: string } | null;
  team: { id: string; name: string; code: string } | null;
  user: { id: string; email: string; name: string | null } | null;
  createdAt: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const { activeOrgId } = useOrganization();

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchEmployees = useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        organizationId: activeOrgId,
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search.trim());
      if (statusFilter) params.append("status", statusFilter);
      if (deptFilter) params.append("departmentId", deptFilter);

      const res = await fetch(`/api/employees?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setEmployees(json.data?.items || []);
        setTotalPages(json.data?.totalPages || 1);
        setTotalCount(json.data?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch employees", err);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId, page, search, statusFilter, deptFilter]);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      if (!activeOrgId) {
        setLoading(false);
        return;
      }
      try {
        const deptRes = await fetch(`/api/departments?organizationId=${activeOrgId}`);
        if (deptRes.ok && !ignore) {
          const dJson = await deptRes.json();
          setDepartments(dJson.data || []);
        }

        const params = new URLSearchParams({
          organizationId: activeOrgId,
          page: page.toString(),
          limit: "10",
        });
        if (search) params.append("search", search.trim());
        if (statusFilter) params.append("status", statusFilter);
        if (deptFilter) params.append("departmentId", deptFilter);

        const empRes = await fetch(`/api/employees?${params.toString()}`);
        if (empRes.ok && !ignore) {
          const eJson = await empRes.json();
          setEmployees(eJson.data?.items || []);
          setTotalPages(eJson.data?.totalPages || 1);
          setTotalCount(eJson.data?.total || 0);
        }
      } catch (err) {
        console.error(err);
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
  }, [activeOrgId, page, search, statusFilter, deptFilter]);

  const handleStatusChange = async (
    employeeId: string,
    newStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED"
  ) => {
    if (!activeOrgId) return;
    try {
      const res = await fetch(`/api/employees/${employeeId}/status?organizationId=${activeOrgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: activeOrgId, status: newStatus }),
      });

      if (res.ok) {
        await fetchEmployees();
        setActionMsg({ type: "success", text: `Employee status changed to ${newStatus}` });
        setTimeout(() => setActionMsg(null), 3000);
      }
    } catch {
      setActionMsg({ type: "error", text: "Failed to update employee status." });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "INACTIVE":
        return "neutral";
      case "SUSPENDED":
        return "warning";
      case "TERMINATED":
        return "danger";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Employees Directory
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Total {totalCount} personnel registered in this organization
          </p>
        </div>

        <Link
          href="/employees/new"
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-500 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </Link>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, code, designation..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="TERMINATED">TERMINATED</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableLoadingSkeleton rows={5} cols={6} />
          </div>
        ) : employees.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Employees Found"
              description={
                search || statusFilter || deptFilter
                  ? "No employee records matched your active filter criteria."
                  : "Start populating your organization directory by adding your first employee."
              }
              actionText="Add Employee"
              onAction={() => router.push("/employees/new")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs font-semibold uppercase text-zinc-400 bg-zinc-900/80">
                <tr>
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-6">Code</th>
                  <th className="py-3.5 px-6">Designation</th>
                  <th className="py-3.5 px-6">Hierarchy Assignment</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">User Account</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-4 px-6">
                      <div className="font-medium text-white">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="text-xs text-zinc-400">{emp.email}</div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-cyan-400">
                      <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5">
                        {emp.employeeCode}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-300">
                      {emp.designation || "—"}
                    </td>
                    <td className="py-4 px-6 text-xs">
                      <div className="space-y-1">
                        {emp.department ? (
                          <div className="text-zinc-200">
                            🏢 {emp.department.name}
                          </div>
                        ) : (
                          <span className="text-zinc-400">No Dept</span>
                        )}
                        {emp.section && (
                          <div className="text-zinc-400 pl-3 border-l border-zinc-700 text-[11px]">
                            ↳ {emp.section.name}
                          </div>
                        )}
                        {emp.team && (
                          <div className="text-cyan-400 pl-6 border-l border-cyan-700/50 text-[11px]">
                            ↳ {emp.team.name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge size="sm" variant={getStatusBadgeVariant(emp.status)}>
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-xs">
                      {emp.user ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Linked
                        </span>
                      ) : (
                        <span className="text-zinc-400">Unlinked</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/employees/${emp.id}`}
                          className="rounded px-2.5 py-1 text-xs font-medium border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                        >
                          View / Edit
                        </Link>
                        {emp.status === "ACTIVE" ? (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(emp.id, "INACTIVE")}
                            title="Deactivate employee"
                            className="rounded px-2 py-1 text-xs font-medium border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-amber-400 hover:border-amber-500/30 transition"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(emp.id, "ACTIVE")}
                            title="Activate employee"
                            className="rounded px-2 py-1 text-xs font-medium border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4">
            <span className="text-xs text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
