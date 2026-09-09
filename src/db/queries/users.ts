import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, walletIdentities } from "@/db/schema";
import type { NewUser } from "@/db/schema";

export async function getUserById(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
    with: { walletIdentities: true },
  });
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
    with: { walletIdentities: true },
  });
}

export async function getUserByWalletAddress(walletAddress: string) {
  const wallet = await db.query.walletIdentities.findFirst({
    where: eq(walletIdentities.walletAddress, walletAddress),
    with: { user: true },
  });
  return wallet?.user ?? null;
}

export async function createUser(data: NewUser) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function updateUser(
  id: string,
  data: Partial<Pick<NewUser, "name" | "image">>
) {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user;
}

export async function linkWallet(
  userId: string,
  walletAddress: string,
  walletType = "pera"
) {
  const [wallet] = await db
    .insert(walletIdentities)
    .values({
      userId,
      walletAddress,
      walletType,
      isPrimary: true,
      verifiedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();
  return wallet;
}

export async function getUserWithOrgs(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      walletIdentities: true,
      memberships: {
        where: (m, { eq }) => eq(m.status, "ACTIVE"),
        with: {
          organization: true,
        },
      },
    },
  });
}
