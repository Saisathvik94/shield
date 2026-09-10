"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getPeraWallet, resetPeraWallet } from "./pera-client";
import type { SignerTransaction } from "@perawallet/connect";

export interface SignDataInput {
  data: Uint8Array;
  message: string;
}

interface WalletContextValue {
  /** Currently connected Algorand address, or null */
  address: string | null;
  /** True while a connect / reconnect is in flight */
  connecting: boolean;
  /** True once the wallet has been initialised (reconnect attempted) */
  ready: boolean;
  /** True if address is present */
  isConnected: boolean;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  signData?: (data: SignDataInput[], signerAddress: string) => Promise<Uint8Array[]>;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  connecting: false,
  ready: false,
  isConnected: false,
  connect: async () => null,
  disconnect: async () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [ready, setReady] = useState(false);

  // On mount, try to reconnect any previously connected wallet
  useEffect(() => {
    let cancelled = false;

    async function reconnect() {
      try {
        const pera = await getPeraWallet();
        const accounts = await pera.reconnectSession();
        if (!cancelled && accounts.length > 0) {
          setAddress(accounts[0]);
          // Wire up disconnect listener
          pera.connector?.on("disconnect", () => {
            if (!cancelled) {
              setAddress(null);
              resetPeraWallet();
            }
          });
        }
      } catch {
        // No previous session - that's fine
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    reconnect();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    setConnecting(true);
    try {
      const pera = await getPeraWallet();
      const accounts = await pera.connect();
      const addr = accounts[0] ?? null;
      setAddress(addr);

      // Wire up disconnect listener
      pera.connector?.on("disconnect", () => {
        setAddress(null);
        resetPeraWallet();
      });

      return addr;
    } catch (err: unknown) {
      // User closed the modal - not an error
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("cancelled") && !msg.includes("closed")) {
        console.error("[SHIELD] Wallet connect error:", err);
      }
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const pera = await getPeraWallet();
      await pera.disconnect();
    } catch {
      // ignore
    } finally {
      setAddress(null);
      resetPeraWallet();
    }
  }, []);

  const signData = useCallback(
    async (data: SignDataInput[], signerAddress: string): Promise<Uint8Array[]> => {
      const pera = await getPeraWallet();
      return pera.signData(data as any, signerAddress);
    },
    []
  );

  const isConnected = !!address;

  return (
    <WalletContext.Provider
      value={{
        address,
        connecting,
        ready,
        isConnected,
        connect,
        disconnect,
        signData,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
