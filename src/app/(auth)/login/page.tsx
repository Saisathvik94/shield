import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginClient } from "./login-client";

interface Props {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth();
  if (session?.user) {
    const { callbackUrl } = await searchParams;
    redirect(callbackUrl ?? "/dashboard");
  }

  const { callbackUrl } = await searchParams;

  return <LoginClient callbackUrl={callbackUrl} />;
}
