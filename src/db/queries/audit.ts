import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { auditEvents } from "@/db/schema";
import type { NewAuditEvent } from "@/db/schema";

export async function createAuditEvent(data: NewAuditEvent) {
  const [event] = await db.insert(auditEvents).values(data).returning();
  return event;
}

export async function getOrgAuditEvents(
  organizationId: string,
  limit = 50
) {
  return db.query.auditEvents.findMany({
    where: eq(auditEvents.organizationId, organizationId),
    orderBy: [desc(auditEvents.createdAt)],
    limit,
    with: { actor: true },
  });
}

export async function getUserAuditEvents(actorId: string, limit = 50) {
  return db.query.auditEvents.findMany({
    where: eq(auditEvents.actorId, actorId),
    orderBy: [desc(auditEvents.createdAt)],
    limit,
  });
}
