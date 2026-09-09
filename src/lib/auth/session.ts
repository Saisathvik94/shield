import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";
import { NextResponse } from "next/server";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError("Authentication required.");
  }
  return user;
}

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: error.message, details: error.details },
      { status: error.statusCode }
    );
  }

  // Check for Prisma unique constraint violation (P2002)
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  ) {
    return NextResponse.json(
      { success: false, error: "A record with this unique field already exists." },
      { status: 409 }
    );
  }

  // Safe generic 500 error — do not leak stack traces or internal DB details
  console.error("Unhandled API Error:", error);
  return NextResponse.json(
    { success: false, error: "Internal Server Error. Please try again later." },
    { status: 500 }
  );
}
