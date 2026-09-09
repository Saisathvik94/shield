"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  _count?: {
    departments: number;
    employees: number;
  };
}

interface OrganizationContextType {
  organizations: OrganizationItem[];
  activeOrg: OrganizationItem | null;
  activeOrgId: string | null;
  setActiveOrgId: (id: string) => void;
  loading: boolean;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch("/api/organizations");
      if (res.ok) {
        const data = await res.json();
        const list: OrganizationItem[] = data.data || [];
        setOrganizations(list);

        if (list.length > 0) {
          const stored = typeof window !== "undefined" ? localStorage.getItem("shield_active_org_id") : null;
          const match = list.find((o) => o.id === stored) || list[0];
          setActiveOrgIdState(match.id);
        } else {
          setActiveOrgIdState(null);
        }
      }
    } catch (err) {
      console.error("Failed to load organizations", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!session?.user) return;
      try {
        const res = await fetch("/api/organizations");
        if (res.ok && !ignore) {
          const data = await res.json();
          const list: OrganizationItem[] = data.data || [];
          setOrganizations(list);

          if (list.length > 0) {
            const stored = typeof window !== "undefined" ? localStorage.getItem("shield_active_org_id") : null;
            const match = list.find((o) => o.id === stored) || list[0];
            setActiveOrgIdState(match.id);
          } else {
            setActiveOrgIdState(null);
          }
        }
      } catch (err) {
        console.error("Failed to load organizations", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [session]);

  const setActiveOrgId = (id: string) => {
    setActiveOrgIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("shield_active_org_id", id);
    }
  };

  const activeOrg = organizations.find((o) => o.id === activeOrgId) || null;

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        activeOrg,
        activeOrgId,
        setActiveOrgId,
        loading,
        refreshOrganizations: fetchOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
