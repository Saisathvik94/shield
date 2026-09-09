import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
