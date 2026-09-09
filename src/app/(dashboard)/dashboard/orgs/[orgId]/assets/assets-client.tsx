"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Search,
  Shield,
  MapPin,
  User,
  Loader2,
  Filter,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { createAsset } from "@/lib/actions/asset-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { classificationColor, relativeTime, cn } from "@/lib/utils";
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

const CLASSIFICATIONS: NonNullable<NewAsset["classification"]>[] = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "SECRET",
  "CRITICAL",
];

const STATUS_COLORS: Record<string, string> = {
  CREATED: "text-gray-400 bg-gray-400/10",
  REGISTERED: "text-blue-400 bg-blue-400/10",
  ASSIGNED: "text-indigo-400 bg-indigo-400/10",
  ACTIVE: "text-green-400 bg-green-400/10",
  TRANSFER_REQUESTED: "text-yellow-400 bg-yellow-400/10",
  TRANSFERRED: "text-cyan-400 bg-cyan-400/10",
  REVOKED: "text-red-400 bg-red-400/10",
  RETIRED: "text-gray-500 bg-gray-500/10",
};

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
  const [filterClass, setFilterClass] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
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

  const filtered = assets.filter((a) => {
    const matchSearch =
      a.assetId.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase());
    const matchClass =
      !filterClass || a.classification === filterClass;
    return matchSearch && matchClass;
  });

  function handleChange(
    field: keyof typeof form,
    value: string
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createAsset(orgId, {
        assetId: form.assetId,
        name: form.name,
        description: form.description || undefined,
        assetType: form.assetType,
        classification: form.classification,
        departmentId: form.departmentId || undefined,
        location: form.location || undefined,
        physicalIdentifier: form.physicalIdentifier || undefined,
      });

      if (result.status === "success") {
        toast.success(`Asset ${form.assetId} registered`);
        setOpen(false);
        setForm({
          assetId: "",
          name: "",
          description: "",
          assetType: "EQUIPMENT",
          classification: "INTERNAL",
          departmentId: "",
          location: "",
          physicalIdentifier: "",
        });
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Assets</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {assets.length} registered asset{assets.length !== 1 ? "s" : ""} in {orgName}
          </p>
        </div>

        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
                Register asset
              </Button>
            </DialogTrigger>
            <DialogContent
              title="Register asset"
              description="Add a new digital or physical asset to your organization's registry."
            >
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Asset ID"
                    placeholder="RADAR-001"
                    value={form.assetId}
                    onChange={(e) => handleChange("assetId", e.target.value.toUpperCase())}
                    hint="Unique identifier, e.g. RADAR-001"
                    required
                    autoFocus
                  />
                  <Input
                    label="Asset name"
                    placeholder="Radar System Unit 1"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-300">Asset type</label>
                  <select
                    value={form.assetType}
                    onChange={(e) => handleChange("assetType", e.target.value)}
                    className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/60"
                  >
                    {ASSET_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-300">Classification</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {CLASSIFICATIONS.map((c) => {
                      const cls = classificationColor(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleChange("classification", c)}
                          className={cn(
                            "px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-all",
                            form.classification === c
                              ? `${cls.className} border-current/30`
                              : "border-white/[0.08] text-gray-500 hover:border-white/20 hover:text-gray-300"
                          )}
                        >
                          {cls.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {departments.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-300">Department (optional)</label>
                    <select
                      value={form.departmentId}
                      onChange={(e) => handleChange("departmentId", e.target.value)}
                      className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/60"
                    >
                      <option value="">- None -</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <Input
                  label="Location (optional)"
                  placeholder="Lab 3, Building A"
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                />

                <Input
                  label="Physical identifier (optional)"
                  placeholder="QR / NFC / serial number"
                  value={form.physicalIdentifier}
                  onChange={(e) => handleChange("physicalIdentifier", e.target.value)}
                  hint="Barcode, QR code ID, or NFC tag number for physical assets"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isPending}
                    icon={<Shield className="w-4 h-4" />}
                    disabled={!form.assetId.trim() || !form.name.trim()}
                  >
                    Register
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            placeholder="Search by ID or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#111118] border border-white/[0.06] rounded-lg text-sm text-white placeholder:text-gray-500 outline-none focus:border-blue-500/40 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="bg-[#111118] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-blue-500/40"
          >
            <option value="">All classifications</option>
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Package className="w-12 h-12 text-gray-700 mb-3" />
          <p className="text-sm text-gray-400 font-medium">
            {search || filterClass ? "No assets match your filters." : "No assets registered yet."}
          </p>
          {canManage && !search && !filterClass && (
            <p className="text-xs text-gray-500 mt-1">
              Register your first asset using the button above.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((asset) => {
            const cls = classificationColor(asset.classification);
            const statusCls = STATUS_COLORS[asset.status] ?? "text-gray-400 bg-gray-400/10";
            return (
              <div
                key={asset.id}
                className="bg-[#111118] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-white/[0.08] flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-violet-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white font-mono">
                        {asset.assetId}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                          cls.className
                        )}
                      >
                        {cls.label}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium",
                          statusCls
                        )}
                      >
                        {asset.status.replace(/_/g, " ")}
                      </span>
                      {asset.algorandAssetId && (
                        <Badge variant="success" className="text-[10px]">
                          On-chain
                        </Badge>
                      )}
                      {asset.ipfsCid && (
                        <Badge variant="info" className="text-[10px]">
                          IPFS
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-200 mt-0.5">{asset.name}</p>
                    {asset.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {asset.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 mt-2.5 text-xs text-gray-500">
                      {asset.owner && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Owner: {asset.owner.name}
                        </span>
                      )}
                      {asset.department && (
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {asset.department}
                        </span>
                      )}
                      {asset.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {asset.location}
                        </span>
                      )}
                      <span>{asset.assetType.replace(/_/g, " ")}</span>
                      <span>Registered {relativeTime(asset.createdAt)}</span>
                      <Link
                        href={`/dashboard/orgs/${orgId}/assets/${asset.id}`}
                        className="ml-auto flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View passport <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
