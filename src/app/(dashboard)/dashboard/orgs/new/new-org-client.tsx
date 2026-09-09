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
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-white/[0.08] flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-300" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">
            Create organization
          </h1>
          <p className="text-sm text-gray-400">
            Set up a new SHIELD workspace for your team.
          </p>
        </div>
      </div>

      <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <Input
              label="Organization name"
              name="name"
              placeholder="BEL Research"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
            {slug && (
              <p className="text-xs text-gray-500 mt-1.5">
                URL slug:{" "}
                <span className="font-mono text-gray-400">{slug}</span>
              </p>
            )}
          </div>

          <Textarea
            label="Description"
            name="description"
            placeholder="Bharat Electronics Limited - Radar Research Division"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            label="Website (optional)"
            name="website"
            type="url"
            placeholder="https://bel.co.in"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />

          {/* Info box */}
          <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 p-3.5 text-xs text-gray-400 leading-relaxed">
            You will automatically become the <strong className="text-white">Owner</strong> of
            this organization. You can then invite members, set up departments,
            and register assets.
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isPending}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "bg-gradient-to-r from-blue-600 to-violet-600 text-white",
                "hover:from-blue-500 hover:to-violet-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-lg shadow-blue-500/20"
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
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
