"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, ArrowLeft, Loader2 } from "lucide-react";
import { createOrg } from "@/lib/actions/org-actions";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function NewOrgClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createOrg(formData);
      if (result.status === "success") {
        toast.success("Organization created!");
        router.push(`/dashboard/orgs/${result.orgId}`);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to workspaces
      </button>

      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Create organization
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set up a new SHIELD institutional workspace for your team.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0f1017] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-sm dark:shadow-none">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <Input
              label="Organization name"
              name="name"
              placeholder="e.g. Bharat Defense Systems"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
            {slug && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                URL identifier:{" "}
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{slug}</span>
              </p>
            )}
          </div>

          <Textarea
            label="Description"
            name="description"
            placeholder="Brief summary of this organization's security mandate and scope."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            label="Website (optional)"
            name="website"
            type="url"
            placeholder="https://organization.gov"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />

          {/* Info box */}
          <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            You will automatically become the <strong className="text-slate-900 dark:text-white">Owner</strong> of
            this organization. You can then issue invitations, create department hierarchies,
            and tokenize digital &amp; physical assets on-chain.
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isPending}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all",
                "bg-blue-600 text-white hover:bg-blue-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-md shadow-blue-500/20"
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating workspace...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  Create organization
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
