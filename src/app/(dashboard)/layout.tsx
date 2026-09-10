import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrganizationsByUser } from "@/db/queries/organizations";
import { Sidebar } from "@/components/dashboard/sidebar";

// Extract the active org ID from the URL via a helper
// The URL is /dashboard/orgs/[orgId]/...
function getActiveOrgId(referer?: string): string | undefined {
  // We can't read the current URL in the layout directly, so we'll pass all
  // orgs and let the sidebar pick the active one from usePathname on the client
  void referer;
  return undefined;
}

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
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
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
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
