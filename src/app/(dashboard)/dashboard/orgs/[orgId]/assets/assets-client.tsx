"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Search,
  ArrowRight,
  ShieldCheck,
  X,
} from "lucide-react";
import { createAsset } from "@/lib/actions/asset-actions";
import { uploadAssetDocument } from "@/lib/ipfs/ipfs-actions";
import { tokeniseAsset } from "@/lib/algorand/algorand-actions";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { NewAsset } from "@/db/schema";

const ASSET_TYPES: NonNullable<NewAsset["assetType"]>[] = [
  "DOCUMENT",
  "CERTIFICATE",
  "LICENSE",
  "EQUIPMENT",
  "HARDWARE",
  "INTELLECTUAL_PROPERTY",
  "DATASET",
  "CONTRACT",
  "PHYSICAL_DEVICE",
  "DIGITAL_ENTITLEMENT",
  "OTHER",
];

const CLASSIFICATIONS = [
  { value: "CRITICAL", label: "Critical", desc: "Highest sensitivity. Multi-level approval and auto on-chain anchor." },
  { value: "SECRET", label: "Secret", desc: "Restricted to authorized personnel and strict custodians." },
  { value: "CONFIDENTIAL", label: "Confidential", desc: "Internal organizational confidentiality requirements." },
  { value: "INTERNAL", label: "Internal", desc: "Standard internal access for verified organization members." },
  { value: "PUBLIC", label: "Public", desc: "Publicly verifiable asset specification or certificate." },
] as const;

interface Asset {
  id: string;
  assetId: string;
  name: string;
  description: string | null;
  assetType: string;
  classification: string;
  status: string;
  location: string | null;
  algorandAssetId: string | null;
  ipfsCid: string | null;
  createdAt: string;
  owner: { name: string; email: string } | null;
  custodian: { name: string; email: string } | null;
  department: string | null;
}

interface Props {
  orgId: string;
  orgName: string;
  assets: Asset[];
  departments: { id: string; name: string }[];
  members: { id: string; name: string; email: string }[];
  canManage: boolean;
}

export function AssetsClient({
  orgId,
  orgName,
  assets,
  departments,
  canManage,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Registration Form state
  const [form, setForm] = useState({
    assetId: "",
    name: "",
    description: "",
    assetType: "EQUIPMENT" as NonNullable<NewAsset["assetType"]>,
    classification: "INTERNAL" as NonNullable<NewAsset["classification"]>,
    departmentId: "",
    location: "",
    physicalIdentifier: "",
  });
  const [files] = useState<File[]>([]);
  const [tokeniseOnCreate, setTokeniseOnCreate] = useState(true);

  const filtered = assets.filter((a) => {
    const matchSearch =
      a.assetId.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.owner?.name && a.owner.name.toLowerCase().includes(search.toLowerCase()));
    const matchClass = filterClass === "ALL" || a.classification === filterClass;
    return matchSearch && matchClass;
  });

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createAsset(orgId, {
        assetId: form.assetId.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description || undefined,
        assetType: form.assetType,
        classification: form.classification,
        departmentId: form.departmentId || undefined,
        location: form.location || undefined,
        physicalIdentifier: form.physicalIdentifier || undefined,
      });

      if (result.status === "success") {
        let uploadFailures = 0;
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          const uploadResult = await uploadAssetDocument(formData, orgId, result.assetId);
          if (uploadResult.status === "error") uploadFailures += 1;
        }

        let tokeniseMessage = "";
        if (tokeniseOnCreate) {
          const tokeniseResult = await tokeniseAsset(result.assetId);
          tokeniseMessage =
            tokeniseResult.status === "success"
              ? " and tokenised on Algorand"
              : " (tokenisation pending)";
        }

        toast.success(`Asset "${form.assetId}" registered${tokeniseMessage}!`);
        if (uploadFailures > 0) {
          toast.warning(`${uploadFailures} file upload(s) failed.`);
        }
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in-0 duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Protected Digital Assets
            </h1>
            <Badge variant="neutral" className="text-xs">
              {assets.length} Registered
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Cryptographic asset passports, tokenisation, and immutable ownership records in <strong className="text-slate-900 dark:text-slate-200">{orgName}</strong>.
          </p>
        </div>

        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
                Register New Asset
              </Button>
            </DialogTrigger>
            <DialogContent
              title="Register Protected Asset"
              description="Register an enterprise digital or physical asset with sovereign cryptographic integrity."
              className="max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <form onSubmit={handleCreate} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                      Asset Identifier (Unique Code)
                    </label>
                    <Input
                      required
                      placeholder="e.g. DOC-ENG-2041"
                      value={form.assetId}
                      onChange={(e) => handleChange("assetId", e.target.value.toUpperCase())}
                      className="font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                      Asset Type
                    </label>
                    <select
                      value={form.assetType}
                      onChange={(e) => handleChange("assetType", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm text-slate-900 dark:text-white rounded-xl p-2.5 outline-none focus:border-blue-500/50"
                    >
                      {ASSET_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                    Asset Title / Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. Radar System Specifications v2.4"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                    Security Classification Level
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {CLASSIFICATIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => handleChange("classification", c.value)}
                        className={cn(
                          "p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all",
                          form.classification === c.value
                            ? "bg-blue-50 dark:bg-blue-600/15 border-blue-300 dark:border-blue-500/40 text-slate-900 dark:text-white shadow-xs"
                            : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                        )}
                      >
                        <StatusBadge classification={c.value} size="sm" />
                        <span className="text-xs text-slate-700 dark:text-slate-300 leading-tight flex-1">{c.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                    Description &amp; Operational Context
                  </label>
                  <Textarea
                    placeholder="Briefly state sensitivity, intended usage, and security constraints..."
                    value={form.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={2}
                  />
                </div>

                {departments.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                      Assigned Department
                    </label>
                    <select
                      value={form.departmentId}
                      onChange={(e) => handleChange("departmentId", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#12131d] border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm text-slate-900 dark:text-white rounded-xl p-2.5 outline-none focus:border-blue-500/50"
                    >
                      <option value="">— Organization General —</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tokenise & IPFS option */}
                <div className="p-3 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/15 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tokeniseOnCreate}
                      onChange={(e) => setTokeniseOnCreate(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-white/10 text-blue-600 focus:ring-blue-500/50"
                    />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Tokenise on Algorand Blockchain (ASA Creation)
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pl-5">
                    Automatically anchors an immutable ASA token with clawback compliance for sovereign transfer control.
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isPending}
                    icon={<ShieldCheck className="w-3.5 h-3.5" />}
                  >
                    Register Asset Passport
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters Bar (§13) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Classification Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          {["ALL", "CRITICAL", "SECRET", "CONFIDENTIAL", "INTERNAL", "PUBLIC"].map((lvl) => {
            const count = lvl === "ALL" ? assets.length : assets.filter((a) => a.classification === lvl).length;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setFilterClass(lvl)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 select-none",
                  filterClass === lvl
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.06]"
                )}
              >
                {lvl === "ALL" ? "All Classifications" : lvl}
                <span className="ml-1.5 text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, name, or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-white dark:bg-[#0f1017] border border-slate-200 dark:border-white/[0.07] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500/50 shadow-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Asset Catalog Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Package}
                title={search || filterClass !== "ALL" ? "No Matching Assets Found" : "No Assets Registered"}
                description={
                  search || filterClass !== "ALL"
                    ? "Try clearing the search query or adjusting active classification filters."
                    : "Register your first critical document, hardware, or IP asset to establish blockchain-backed ownership."
                }
                actionText={canManage && filterClass === "ALL" && !search ? "Register Asset" : undefined}
                onAction={() => setOpen(true)}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3.5 px-5">Asset Identifier</th>
                    <th className="py-3.5 px-5">Title &amp; Type</th>
                    <th className="py-3.5 px-5">Classification</th>
                    <th className="py-3.5 px-5">Custody / Owner</th>
                    <th className="py-3.5 px-5">Blockchain Trust</th>
                    <th className="py-3.5 px-5 text-right">Passport</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {filtered.map((asset) => (
                    <tr
                      key={asset.id}
                      onClick={() => router.push(`/dashboard/orgs/${orgId}/assets/${asset.id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-5 font-mono text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                        {asset.assetId}
                      </td>
                      <td className="py-4 px-5">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                          {asset.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {asset.assetType.replace(/_/g, " ")}
                          {asset.department ? ` · ${asset.department}` : ""}
                        </p>
                      </td>
                      <td className="py-4 px-5">
                        <StatusBadge classification={asset.classification} size="sm" />
                      </td>
                      <td className="py-4 px-5 text-xs text-slate-700 dark:text-slate-300">
                        {asset.owner?.name ? (
                          <span className="font-medium text-slate-900 dark:text-slate-200">{asset.owner.name}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Unassigned</span>
                        )}
                        {asset.location && (
                          <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
                            📍 {asset.location}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        {asset.algorandAssetId ? (
                          <Badge variant="success" className="gap-1 font-mono text-[10px]">
                            <ShieldCheck className="w-3 h-3" /> ASA #{asset.algorandAssetId}
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px]">
                            Off-Chain
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                          Passport <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
