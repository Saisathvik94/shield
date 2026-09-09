"use server";

import { signIn, signOut } from "@/lib/auth";
import { getUserByWalletAddress } from "@/db/queries/users";
import { AuthError } from "next-auth";

export type WalletLoginResult =
  | { status: "success" }
  | { status: "needs_signup" }
  | { status: "error"; message: string };

/**
 * Called after the client has confirmed a wallet connection.
 * Checks whether the wallet already has a SHIELD identity.
 * - If yes → signs in immediately.
 * - If no  → returns "needs_signup" so the client shows the registration form.
 */
export async function loginWithWallet(
  walletAddress: string,
  signedMessageHex = ""
): Promise<WalletLoginResult> {
  try {
    const existingUser = await getUserByWalletAddress(walletAddress);

    if (existingUser) {
      await signIn("wallet", {
        walletAddress,
        signedMessage: signedMessageHex,
        redirect: false,
      });
      return { status: "success" };
    }

    return { status: "needs_signup" };
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: "error", message: err.message };
    }
    console.error("[SHIELD] loginWithWallet error:", err);
    return { status: "error", message: "Authentication failed. Try again." };
  }
}

/**
 * Creates a new SHIELD identity and signs in.
 * Called when a new user connects their wallet and provides name + email.
 */
export async function registerWithWallet(
  walletAddress: string,
  name: string,
  email: string
): Promise<WalletLoginResult> {
  // Basic validation
  if (!name.trim() || name.trim().length < 2) {
    return { status: "error", message: "Name must be at least 2 characters." };
  }
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }
  if (!walletAddress) {
    return { status: "error", message: "No wallet address provided." };
  }

  try {
    await signIn("wallet", {
      walletAddress,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      redirect: false,
    });
    return { status: "success" };
  } catch (err) {
    if (err instanceof AuthError) {
      return { status: "error", message: err.message };
    }
    console.error("[SHIELD] registerWithWallet error:", err);
    return { status: "error", message: "Registration failed. Try again." };
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
