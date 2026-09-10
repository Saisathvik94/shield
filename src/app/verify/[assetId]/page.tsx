import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { verifyAssetFull7Point } from "@/lib/verification/asset-verifier";
import { VerificationClient } from "./verification-client";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ assetId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { assetId } = await params;
  return {
    title: `Verify ${decodeURIComponent(assetId)} - SHIELD Trust Engine`,
    description: `7-Point Cryptographic Verification for asset ${decodeURIComponent(assetId)} on the SHIELD Verifiable Trust Infrastructure.`,
  };
}

export default async function VerifyPage({ params }: Props) {
  const { assetId: rawId } = await params;
  const assetId = decodeURIComponent(rawId);

  const session = await auth();
  const isAuthenticated = Boolean(session?.user);

  const verificationResult = await verifyAssetFull7Point(assetId, {
    viewerUserId: session?.user?.id ?? null,
    logAudit: true,
  });

  if (verificationResult.overallStatus === "NOT_FOUND" || !verificationResult.assetSummary) {
    notFound();
  }

  return (
    <VerificationClient
      assetId={assetId}
      verificationResult={verificationResult}
      isAuthenticated={isAuthenticated}
    />
  );
}
