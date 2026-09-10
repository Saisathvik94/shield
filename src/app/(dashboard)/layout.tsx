import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrganizationsByUser } from "@/db/queries/organizations";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopHeader } from "@/components/dashboard/top-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const orgs = await getOrganizationsByUser(session.user.id);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#090a10] text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar
        orgs={orgs.map((o) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          role: o.role,
        }))}
        userName={session.user.name ?? "User"}
        userEmail={session.user.email ?? ""}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader
          userName={session.user.name ?? "User"}
          userEmail={session.user.email ?? ""}
          activeOrgName={orgs[0]?.name}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#090a10] text-slate-900 dark:text-slate-100 transition-colors">
          {children}
        </main>
      </div>
    </div>
  );
}
