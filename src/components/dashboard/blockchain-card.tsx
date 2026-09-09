"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AlgorandStatusResponse } from "@/types";
import { Badge } from "@/components/ui/badge";

export function BlockchainCard() {
  const [status, setStatus] = useState<AlgorandStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/algorand/status");
      if (res.ok) {
        const json = await res.json();
        setStatus(json.data);
      } else {
        setStatus({
          connected: false,
          network: "testnet",
          server: "https://testnet-api.algonode.cloud",
          error: "API endpoint returned an error.",
        });
      }
    } catch {
      setStatus({
        connected: false,
        network: "testnet",
        server: "https://testnet-api.algonode.cloud",
        error: "Network connectivity failed.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/algorand/status");
        if (res.ok && !ignore) {
          const json = await res.json();
          setStatus(json.data);
        } else if (!ignore) {
          setStatus({
            connected: false,
            network: "testnet",
            server: "https://testnet-api.algonode.cloud",
            error: "API endpoint returned an error.",
          });
        }
      } catch {
        if (!ignore) {
          setStatus({
            connected: false,
            network: "testnet",
            server: "https://testnet-api.algonode.cloud",
            error: "Network connectivity failed.",
          });
        }
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
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Algorand Network Status
            </h3>
            <p className="text-xs text-zinc-400">
              Phase 0 Distributed Ledger Connectivity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <Badge variant="neutral" size="sm">
              Checking...
            </Badge>
          ) : status?.connected ? (
            <Badge variant="success" size="sm">
              ● Connected
            </Badge>
          ) : (
            <Badge variant="danger" size="sm">
              ● Disconnected
            </Badge>
          )}

          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="rounded-lg border border-zinc-800 bg-zinc-800/80 p-1.5 text-zinc-400 hover:text-white transition disabled:opacity-50"
            title="Refresh Blockchain Status"
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-zinc-950/60 p-3.5 border border-zinc-800/80">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
            Network
          </span>
          <span className="mt-1 text-sm font-medium text-white block capitalize">
            {status?.network || "TestNet"}
          </span>
        </div>

        <div className="rounded-xl bg-zinc-950/60 p-3.5 border border-zinc-800/80">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
            Latest Block Round
          </span>
          <span className="mt-1 text-sm font-mono font-medium text-cyan-400 block">
            {status?.latestRound ? `#${status.latestRound.toLocaleString()}` : "—"}
          </span>
        </div>

        <div className="rounded-xl bg-zinc-950/60 p-3.5 border border-zinc-800/80">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
            Genesis ID
          </span>
          <span className="mt-1 text-xs font-mono text-zinc-300 block truncate">
            {status?.genesisId || "—"}
          </span>
        </div>

        <div className="rounded-xl bg-zinc-950/60 p-3.5 border border-zinc-800/80">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
            Node Server
          </span>
          <span className="mt-1 text-xs font-mono text-zinc-400 block truncate">
            {status?.server || "—"}
          </span>
        </div>
      </div>

      {status?.error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
          <strong>Node Error:</strong> {status.error}
        </div>
      )}
    </div>
  );
}
