import { db } from "@/db";
import { invitations, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { InviteClient } from "./invite-client";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.token, token),
    with: {
      organization: true,
      department: true,
      section: true,
    } as never, // with relations not typed for all cols
  });

  if (!invitation || invitation.status !== "PENDING") {
    notFound();
  }

  const expired = new Date(invitation.expiresAt) < new Date();
  const session = await auth();

  return (
    <InviteClient
      invitation={{
        id: invitation.id,
        token,
        email: invitation.email,
        role: invitation.role,
        organizationName: (invitation as unknown as { organization: { name: string } }).organization?.name ?? "Unknown Organization",
        departmentName: (invitation as unknown as { department?: { name: string } }).department?.name,
        sectionName: (invitation as unknown as { section?: { name: string } }).section?.name,
        expiresAt: invitation.expiresAt.toISOString(),
        expired,
      }}
      currentUserEmail={session?.user?.email ?? null}
    />
  );
}
