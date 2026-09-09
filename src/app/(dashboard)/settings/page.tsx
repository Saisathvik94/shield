"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useOrganization } from "@/context/organization-context";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { activeOrg } = useOrganization();

  return (
    <div className="max-w-4xl space-y-8">
      <div className="border-b border-zinc-800/80 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">System Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          SHIELD Phase 0 Platform Configuration & Identity Environment
        </p>
      </div>

      {/* User Account Details */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-sm space-y-4">
        <h2 className="text-base font-semibold text-white border-b border-zinc-800 pb-3">
          Authenticated Identity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase block">
              User ID
            </span>
            <span className="font-mono text-xs text-cyan-400">
              {session?.user?.id || "—"}
            </span>
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase block">
              Email Address
            </span>
            <span className="text-white font-medium">
              {session?.user?.email || "—"}
            </span>
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase block">
              Display Name
            </span>
            <span className="text-zinc-200">
              {session?.user?.name || "Administrator"}
            </span>
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase block">
              Authentication Provider
            </span>
            <span className="text-zinc-300 font-mono text-xs">
              Auth.js / NextAuth (Credentials Provider)
            </span>
          </div>
        </div>
      </div>

      {/* Active Organization Context */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-sm space-y-4">
        <h2 className="text-base font-semibold text-white border-b border-zinc-800 pb-3">
          Active Multi-Tenant Context
        </h2>
        {activeOrg ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-zinc-400 font-semibold uppercase block">
                Organization Name
              </span>
              <span className="text-white font-medium">{activeOrg.name}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-400 font-semibold uppercase block">
                Tenant Slug
              </span>
              <span className="font-mono text-xs text-cyan-400">{activeOrg.slug}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-400 font-semibold uppercase block">
                Organization ID
              </span>
              <span className="font-mono text-xs text-zinc-300">{activeOrg.id}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-400 font-semibold uppercase block">
                Tenant Status
              </span>
              <Badge
                size="sm"
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
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No active organization selected.</p>
        )}
      </div>

      {/* Distributed Ledger / Algorand Infrastructure */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-sm space-y-4">
        <h2 className="text-base font-semibold text-white border-b border-zinc-800 pb-3">
          Distributed Ledger Environment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase block">
              Network
            </span>
            <span className="font-medium text-white">Algorand TestNet</span>
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase block">
              RPC Node Endpoint
            </span>
            <span className="font-mono text-xs text-cyan-400 truncate block">
              https://testnet-api.algonode.cloud:443
            </span>
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase block">
              SDK Integration
            </span>
            <span className="text-zinc-300 font-mono text-xs">
              algosdk v3.7.0 (Algodv2 Client)
            </span>
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase block">
              Phase 0 Scope
            </span>
            <span className="text-zinc-300 text-xs">
              Connectivity verification & ledger round polling
            </span>
          </div>
        </div>
      </div>

      {/* Phase 0 Architecture Notes */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-sm space-y-3">
        <h2 className="text-base font-semibold text-white border-b border-zinc-800 pb-3">
          Phase 0 Architectural Scope
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          SHIELD Phase 0 establishes core multi-tenant boundaries, hierarchical organizational structures (Organization → Department → Section → Team), employee directory management with database-backed integrity validation, and Algorand network connectivity. Advanced capabilities (DIDs, digital credentials, algorithmic risk engines, digital wallets, NFTs, IPFS storage) are strictly isolated for subsequent deployment phases.
        </p>
      </div>
    </div>
  );
}
