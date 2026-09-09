import { getAlgodClient } from "./client";
import { algorandConfig } from "./config";
import { AlgorandStatusResponse } from "@/types";

export class BlockchainService {
  /**
   * Checks connectivity to the configured Algorand node.
   * Phase 0 provides network connectivity check without executing wallet or contract operations.
   */
  static async checkConnection(): Promise<AlgorandStatusResponse> {
    try {
      const client = getAlgodClient();

      // Query node status with a 5-second timeout guard
      const statusPromise = client.status().do();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Algorand node connection timed out (5s)")), 5000)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (await Promise.race([statusPromise, timeoutPromise])) as Record<string, any>;

      const latestRound = status["last-round"] ?? status.lastRound ?? 0;
      const timeSinceLastRound = status["time-since-last-round"] ?? status.timeSinceLastRound ?? 0;
      const genesisId = status["genesis-id"] ?? status.genesisId ?? "";

      return {
        connected: true,
        network: algorandConfig.network,
        server: algorandConfig.server,
        latestRound: Number(latestRound),
        timeSinceLastRound: Number(timeSinceLastRound),
        genesisId: String(genesisId),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect to Algorand node";
      return {
        connected: false,
        network: algorandConfig.network,
        server: algorandConfig.server,
        error: message,
      };
    }
  }
}
