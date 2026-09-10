import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewOrgClient } from "./new-org-client";

export default async function NewOrgPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <NewOrgClient />;
}
