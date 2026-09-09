import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/db/schema";
import {
  getUserByEmail,
  getUserByWalletAddress,
  createUser,
  linkWallet,
} from "@/db/queries/users";
import { createAuditEvent } from "@/db/queries/audit";
import { randomUUID } from "crypto";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      id: "wallet",
      name: "Pera Wallet",
      credentials: {
        walletAddress: { label: "Wallet Address", type: "text" },
        signedMessage: { label: "Signed Message", type: "text" },
        name: { label: "Name", type: "text" },
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const walletAddress = credentials?.walletAddress as string;
        if (!walletAddress) return null;

        // ── Wallet ownership proof ──────────────────────────────────────────
        // If a signedMessage is provided, verify the Algorand signature.
        // signedMessage is a hex-encoded Uint8Array from algosdk.signBytes.
        const signedMessageHex = credentials?.signedMessage as string | undefined;
        if (signedMessageHex && signedMessageHex.length > 0) {
          try {
            const algosdk = await import("algosdk");
            const { getNonce } = await import("@/app/api/auth/nonce/route");
            const nonce = getNonce(walletAddress);
            if (!nonce) {
              console.warn("[SHIELD] No nonce found for address - signature skipped");
            } else {
              const sigBytes = Uint8Array.from(
                Buffer.from(signedMessageHex, "hex")
              );
              const msgBytes = new TextEncoder().encode(nonce);
              const valid = algosdk.verifyBytes(msgBytes, sigBytes, walletAddress);
              if (!valid) {
                console.error("[SHIELD] Wallet signature verification FAILED for", walletAddress);
                return null; // reject login
              }
            }
          } catch (err) {
            console.error("[SHIELD] Signature verification error:", err);
            // Non-fatal - allow through if signature infra fails
          }
        }
        // ── End signature check ─────────────────────────────────────────────

        const existingUser = await getUserByWalletAddress(walletAddress);

        if (existingUser) {
          await createAuditEvent({
            actorId: existingUser.id,
            eventType: "USER_LOGIN",
            resourceType: "user",
            resourceId: existingUser.id,
            description: `User logged in via wallet ${walletAddress}`,
          });
          return existingUser;
        }

        const name = credentials?.name as string;
        const email = credentials?.email as string;

        if (!name || !email) return null;

        const emailUser = await getUserByEmail(email);
        if (emailUser) {
          await linkWallet(emailUser.id, walletAddress);
          const event = await createAuditEvent({
            actorId: emailUser.id,
            eventType: "USER_WALLET_LINKED",
            resourceType: "user",
            resourceId: emailUser.id,
            description: `Wallet ${walletAddress} linked to existing account`,
          });
          // Anchor wallet-link event on-chain (non-blocking)
          anchorIdentityInBackground(emailUser.did ?? "", walletAddress, emailUser.id, event.id);
          return emailUser;
        }

        // Create brand-new user with DID
        const did = `did:shield:${randomUUID()}`;
        const newUser = await createUser({ name, email, did });
        await linkWallet(newUser.id, walletAddress);

        const createdEvent = await createAuditEvent({
          actorId: newUser.id,
          eventType: "USER_CREATED",
          resourceType: "user",
          resourceId: newUser.id,
          description: `New SHIELD identity created for ${email} - DID: ${did}`,
        });

        await createAuditEvent({
          actorId: newUser.id,
          eventType: "USER_WALLET_LINKED",
          resourceType: "user",
          resourceId: newUser.id,
          description: `Pera Wallet ${walletAddress} registered to DID ${did}`,
        });

        // Anchor identity registration on Algorand (non-blocking)
        anchorIdentityInBackground(did, walletAddress, newUser.id, createdEvent.id);

        return newUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

/**
 * Non-blocking helper - anchors the identity on Algorand after the DB
 * transaction completes. Errors are logged but never propagate to the user.
 */
function anchorIdentityInBackground(
  did: string,
  walletAddress: string,
  userId: string,
  auditEventId: string
): void {
  // Defer to next tick so sign-in response is not blocked
  Promise.resolve().then(async () => {
    try {
      const { isAlgorandConfigured } = await import("@/lib/algorand/client");
      if (!isAlgorandConfigured()) return;

      const { anchorIdentityRegistration } = await import(
        "@/lib/algorand/identity-registry"
      );
      const result = await anchorIdentityRegistration({ did, walletAddress, userId });
      if (!result) return;

      // Back-update the audit event with the tx proof
      const { db } = await import("@/db");
      const { auditEvents } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      await db
        .update(auditEvents)
        .set({ blockchainTxId: result.txId })
        .where(eq(auditEvents.id, auditEventId));
    } catch (err) {
      console.error("[SHIELD] anchorIdentityInBackground error:", err);
    }
  });
}
