import React from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { OrganizationProvider } from "@/context/organization-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrganizationProvider>
      <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <Header />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </OrganizationProvider>
  );
}
