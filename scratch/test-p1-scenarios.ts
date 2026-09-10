import algosdk from "algosdk";
import { db } from "@/db";
import {
  users,
  organizations,
  organizationMemberships,
  walletIdentities,
  assets,
  credentials,
  documentVersions,
  approvalPolicies,
  approvalRequests,
  approvalSignatures,
  riskAssessments,
  auditEvents,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { computeActionDigest, formatSignChallenge } from "@/lib/crypto/action-digest";
import { verifyApproverSignature } from "@/lib/crypto/signature-verifier";
import { resolveApprovalPolicy } from "@/lib/approval/policy-evaluator";
import {
  createApprovalRequest,
  signApprovalRequest,
  rejectApprovalRequest,
  cancelApprovalRequest,
  getApprovalRequestDetails,
} from "@/lib/approval/approval-manager";
import { evaluateAssetRisk } from "@/lib/risk/risk-engine";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
  }
}

async function runP1Tests() {
  console.log("\n============================================================");
  console.log("  SHIELD - P1 AUTOMATED VERIFICATION & SECURITY TEST SUITE  ");
  console.log("  Cryptographic Quorum + Deterministic Risk & Trust Engine  ");
  console.log("============================================================\n");

  // Generate test cryptographic identities
  const user1Account = algosdk.generateAccount(); // Owner
  const user2Account = algosdk.generateAccount(); // Admin
  const user3Account = algosdk.generateAccount(); // Manager
  const outsiderAccount = algosdk.generateAccount(); // Attacker / Outsider

  const user1Address = user1Account.addr.toString();
  const user2Address = user2Account.addr.toString();
  const user3Address = user3Account.addr.toString();
  const outsiderAddress = outsiderAccount.addr.toString();

  const testOrgId = crypto.randomUUID();
  const testAssetId = crypto.randomUUID();
  const outsiderOrgId = crypto.randomUUID();

  const user1Id = crypto.randomUUID();
  const user2Id = crypto.randomUUID();
  const user3Id = crypto.randomUUID();
  const outsiderId = crypto.randomUUID();

  try {
    // -----------------------------------------------------------------------
    // SETUP: Test Organization & Users
    // -----------------------------------------------------------------------
    console.log("📦 1. Setting up test organizations and cryptographic identities...");

    await db.insert(organizations).values([
      { id: testOrgId, name: "P1 Cyber Defense Corp", slug: `p1-defense-${Date.now()}` },
      { id: outsiderOrgId, name: "Rival Corp", slug: `rival-corp-${Date.now()}` },
    ]);

    await db.insert(users).values([
      { id: user1Id, name: "Alice Owner", email: `alice-${Date.now()}@shield.test`, did: `did:shield:user:${user1Id}` },
      { id: user2Id, name: "Bob Admin", email: `bob-${Date.now()}@shield.test`, did: `did:shield:user:${user2Id}` },
      { id: user3Id, name: "Charlie Manager", email: `charlie-${Date.now()}@shield.test`, did: `did:shield:user:${user3Id}` },
      { id: outsiderId, name: "Eve Outsider", email: `eve-${Date.now()}@shield.test`, did: `did:shield:user:${outsiderId}` },
    ]);

    await db.insert(walletIdentities).values([
      { userId: user1Id, walletAddress: user1Address, isPrimary: true },
      { userId: user2Id, walletAddress: user2Address, isPrimary: true },
      { userId: user3Id, walletAddress: user3Address, isPrimary: true },
      { userId: outsiderId, walletAddress: outsiderAddress, isPrimary: true },
    ]);

    await db.insert(organizationMemberships).values([
      { organizationId: testOrgId, userId: user1Id, role: "OWNER", status: "ACTIVE" },
      { organizationId: testOrgId, userId: user2Id, role: "ADMIN", status: "ACTIVE" },
      { organizationId: testOrgId, userId: user3Id, role: "MANAGER", status: "ACTIVE" },
      { organizationId: outsiderOrgId, userId: outsiderId, role: "USER", status: "ACTIVE" },
    ]);

    // Create a Critical Test Asset
    await db.insert(assets).values({
      id: testAssetId,
      organizationId: testOrgId,
      assetId: `DEFENSE-RADAR-${Date.now().toString().slice(-4)}`,
      name: "Tactical Radar Grid Alpha",
      classification: "SECRET",
      status: "ASSIGNED",
      custodianId: user1Id,
      ownerId: user1Id,
    });

    console.log("  ✨ Test identities and organization created successfully.\n");

    // -----------------------------------------------------------------------
    // TEST SUITE 1: Canonical RFC 8785 Digest & Challenge
    // -----------------------------------------------------------------------
    console.log("🔐 SUITE 1: RFC 8785 Canonical Action Digest & Signature Challenge");

    const digest1 = computeActionDigest({
      action: "ASSET_TRANSFER",
      approvalRequestId: "urn:uuid:test-1",
      assetId: testAssetId,
      assetVersion: 1,
      organizationId: testOrgId,
      requestedBy: user1Id,
      currentState: "ASSIGNED",
      expiresAt: "2026-12-31T00:00:00.000Z",
    });

    const digest2 = computeActionDigest({
      // Swapped key order in JS object to test canonicalization
      expiresAt: "2026-12-31T00:00:00.000Z",
      currentState: "ASSIGNED",
      requestedBy: user1Id,
      organizationId: testOrgId,
      assetVersion: 1,
      assetId: testAssetId,
      approvalRequestId: "urn:uuid:test-1",
      action: "ASSET_TRANSFER",
    });

    assert(
      typeof digest1.actionDigest === "string" && digest1.actionDigest.length === 64,
      "Canonical digest produces valid 256-bit cryptographic SHA-256 digest"
    );
    assert(
      digest1.actionDigest === digest2.actionDigest,
      "Deterministic RFC 8785 canonicalization matches regardless of property order"
    );

    const challenge = formatSignChallenge(digest1.actionDigest);

    assert(
      challenge.startsWith("SHIELD-APPROVAL:") && challenge.includes(digest1.actionDigest),
      "Sign challenge formatted with domain separation preamble and exact digest"
    );

    // -----------------------------------------------------------------------
    // TEST SUITE 2: Policy Evaluator & Resolution
    // -----------------------------------------------------------------------
    console.log("\n📋 SUITE 2: Approval Policy Resolution & Role Eligibility");

    // Create custom policy for SECRET assets
    await db.insert(approvalPolicies).values({
      organizationId: testOrgId,
      name: "Secret Asset Transfer Quorum",
      action: "ASSET_TRANSFER",
      assetClassification: "SECRET",
      requiredApprovals: 2,
      eligibleRoles: JSON.stringify(["OWNER", "ADMIN", "MANAGER"]),
      approvalExpiryHours: 24,
      allowSelfApproval: false,
      isActive: true,
    });

    const resolved = await resolveApprovalPolicy({
      organizationId: testOrgId,
      action: "ASSET_TRANSFER",
      assetId: testAssetId,
      assetClassification: "SECRET",
    });

    assert(resolved.requiredApprovals === 2, "Policy evaluator resolves custom M-of-N quorum (2 signatures required)");
    assert(resolved.allowSelfApproval === false, "Policy enforces strict no-self-approval");
    assert(resolved.eligibleRoles.includes("ADMIN"), "Policy includes ADMIN in eligible roles");

    // -----------------------------------------------------------------------
    // TEST SUITE 3: M-of-N Quorum Approval Workflow & Algorand Signatures
    // -----------------------------------------------------------------------
    console.log("\n🖋️ SUITE 3: M-of-N Quorum Approval Workflow & Algorand Signatures");

    // 1. User 1 creates approval request
    const request = await createApprovalRequest({
      organizationId: testOrgId,
      assetId: testAssetId,
      action: "ASSET_TRANSFER",
      requestedById: user1Id,
      requestedCustodianId: user3Id,
      customParams: { reason: "Routine rotation of operational custody" },
    });

    assert(request.status === "PENDING", "Approval request created in PENDING state");
    assert(request.requiredApprovals === 2, "Approval request requires 2 signatures for quorum");

    // 2. Requester tries to sign (should fail due to allowSelfApproval = false)
    const signDataBytes = new TextEncoder().encode(request.actionDigest);
    const user1SigBytes = algosdk.signBytes(signDataBytes, user1Account.sk);
    const user1SigHex = Buffer.from(user1SigBytes).toString("hex");

    let selfSignFailed = false;
    try {
      await signApprovalRequest({
        approvalRequestId: request.id,
        walletAddress: user1Address,
        signatureHex: user1SigHex,
        actionDigest: request.actionDigest,
        userId: user1Id,
      });
    } catch (e: any) {
      selfSignFailed = true;
      assert(
        e.message.toLowerCase().includes("self-approval") || e.message.toLowerCase().includes("cannot approve own"),
        "Anti-Self-Approval: Requester cannot approve their own critical action",
        e.message
      );
    }
    assert(selfSignFailed, "Self-approval was successfully blocked by signature verifier");

    // 3. Outsider tries to sign (should fail)
    const outsiderSigBytes = algosdk.signBytes(signDataBytes, outsiderAccount.sk);
    const outsiderSigHex = Buffer.from(outsiderSigBytes).toString("hex");

    let outsiderSignFailed = false;
    try {
      await signApprovalRequest({
        approvalRequestId: request.id,
        walletAddress: outsiderAddress,
        signatureHex: outsiderSigHex,
        actionDigest: request.actionDigest,
        userId: outsiderId,
      });
    } catch (e: any) {
      outsiderSignFailed = true;
      assert(
        e.message.toLowerCase().includes("not an active member") || e.message.toLowerCase().includes("denied"),
        "BOLA Isolation: Outsider from different org cannot sign approval",
        e.message
      );
    }
    assert(outsiderSignFailed, "Outsider signature was successfully rejected");

    // 4. User 2 (Admin) signs first valid signature (1/2)
    const user2SigBytes = algosdk.signBytes(signDataBytes, user2Account.sk);
    const user2SigHex = Buffer.from(user2SigBytes).toString("hex");

    const sign1Result = await signApprovalRequest({
      approvalRequestId: request.id,
      walletAddress: user2Address,
      signatureHex: user2SigHex,
      actionDigest: request.actionDigest,
      userId: user2Id,
    });

    assert(sign1Result.status === "PENDING", "After 1/2 signatures, status remains PENDING");
    assert(sign1Result.currentApprovals === 1, "Recorded 1 approval signature");
    assert(sign1Result.quorumMet === false, "Quorum not yet reached at 1/2");

    // 5. User 2 tries to sign again (anti-duplicate/replay protection)
    let duplicateSignFailed = false;
    try {
      await signApprovalRequest({
        approvalRequestId: request.id,
        walletAddress: user2Address,
        signatureHex: user2SigHex,
        actionDigest: request.actionDigest,
        userId: user2Id,
      });
    } catch (e: any) {
      duplicateSignFailed = true;
      assert(
        e.message.toLowerCase().includes("already submitted") || e.message.toLowerCase().includes("already signed"),
        "Anti-Replay: Duplicate signature from same approver rejected",
        e.message
      );
    }
    assert(duplicateSignFailed, "Duplicate signature was prevented");

    // 6. User 3 (Manager) signs second valid signature (2/2) -> Quorum reached!
    const user3SigBytes = algosdk.signBytes(signDataBytes, user3Account.sk);
    const user3SigHex = Buffer.from(user3SigBytes).toString("hex");

    const sign2Result = await signApprovalRequest({
      approvalRequestId: request.id,
      walletAddress: user3Address,
      signatureHex: user3SigHex,
      actionDigest: request.actionDigest,
      userId: user3Id,
    });

    assert(sign2Result.status === "EXECUTED", "After 2/2 signatures, status atomically transitions to EXECUTED");
    assert(sign2Result.quorumMet === true, "Quorum reached (2/2)");
    assert(sign2Result.finalized === true, "Request finalized and executed");

    // Verify Asset Custody was updated to User 3 and status set to TRANSFERRED
    const updatedAsset = await db.query.assets.findFirst({
      where: eq(assets.id, testAssetId),
    });
    assert(updatedAsset?.custodianId === user3Id, "Custody atomically transferred to target custodian upon quorum");
    assert(updatedAsset?.status === "TRANSFERRED", "Asset status updated to TRANSFERRED");

    // -----------------------------------------------------------------------
    // TEST SUITE 4: Stale State Invalidation Protection
    // -----------------------------------------------------------------------
    console.log("\n🛡️ SUITE 4: Stale State Invalidation & Race Condition Protection");

    // Create new approval request for document update
    const staleTestAssetId = crypto.randomUUID();
    await db.insert(assets).values({
      id: staleTestAssetId,
      organizationId: testOrgId,
      assetId: `STALE-TEST-${Date.now().toString().slice(-4)}`,
      name: "Missile Telemetry System",
      classification: "SECRET",
      status: "ASSIGNED",
      custodianId: user1Id,
    });

    const docReq = await createApprovalRequest({
      organizationId: testOrgId,
      assetId: staleTestAssetId,
      action: "DOCUMENT_UPDATE",
      requestedById: user1Id,
    });

    // Simulate concurrent out-of-band mutation: asset gets RETIRED before approval is signed
    await db
      .update(assets)
      .set({ status: "RETIRED", updatedAt: new Date() })
      .where(eq(assets.id, staleTestAssetId));

    // Admin tries to sign the stale request
    const docSignBytes = new TextEncoder().encode(docReq.actionDigest);
    const docSigBytes = algosdk.signBytes(docSignBytes, user2Account.sk);
    const docSigHex = Buffer.from(docSigBytes).toString("hex");

    let staleDetected = false;
    try {
      await signApprovalRequest({
        approvalRequestId: docReq.id,
        walletAddress: user2Address,
        signatureHex: docSigHex,
        actionDigest: docReq.actionDigest,
        userId: user2Id,
      });
    } catch (e: any) {
      staleDetected = true;
      assert(
        e.message.toLowerCase().includes("stale approval") || e.message.toLowerCase().includes("invalidated"),
        "Stale Protection: Signing blocked due to concurrent underlying asset modification",
        e.message
      );
    }
    assert(staleDetected, "Stale approval signature was blocked");

    // Verify request was marked INVALIDATED
    const invalidatedReq = await db.query.approvalRequests.findFirst({
      where: eq(approvalRequests.id, docReq.id),
    });
    assert(invalidatedReq?.status === "INVALIDATED", "Stale approval request automatically marked as INVALIDATED");

    // -----------------------------------------------------------------------
    // TEST SUITE 5: Deterministic Risk & Trust Engine Scoring
    // -----------------------------------------------------------------------
    console.log("\n🧠 SUITE 5: Deterministic Risk & Trust Engine Evaluation");

    // 1. Evaluate clean asset
    const cleanAssetId = crypto.randomUUID();
    await db.insert(assets).values({
      id: cleanAssetId,
      organizationId: testOrgId,
      assetId: `CLEAN-ASSET-${Date.now().toString().slice(-4)}`,
      name: "Standard Ground Vehicle",
      classification: "INTERNAL",
      status: "ASSIGNED",
      custodianId: user2Id,
    });

    const cleanRisk = await evaluateAssetRisk({
      assetId: cleanAssetId,
      organizationId: testOrgId,
      action: "ASSET_ACCESS",
      persist: true,
    });

    assert(cleanRisk.riskScore < 50, `Clean asset receives low/moderate risk score (${cleanRisk.riskScore}/100)`);
    assert(cleanRisk.trustScore === 100 - cleanRisk.riskScore, "Trust score = 100 - Risk score");

    // 2. Evaluate asset with REVOKED credential on custodian -> should BLOCK
    const compromisedAssetId = crypto.randomUUID();
    await db.insert(assets).values({
      id: compromisedAssetId,
      organizationId: testOrgId,
      assetId: `COMPROMISED-${Date.now().toString().slice(-4)}`,
      name: "Command Center Uplink",
      classification: "SECRET",
      status: "ASSIGNED",
      custodianId: user1Id,
    });

    // Issue and revoke credential for user1
    await db.insert(credentials).values({
      organizationId: testOrgId,
      type: "ROLE_ASSIGNMENT",
      issuerDid: `did:shield:org:${testOrgId}`,
      subjectDid: `did:shield:user:${user1Id}`,
      claims: JSON.stringify({ role: "OPERATOR" }),
      credentialHash: `0x${Date.now().toString(16)}revoked`,
      status: "REVOKED",
      revocationReason: "Security clearance revoked due to anomaly",
    });

    const compRisk = await evaluateAssetRisk({
      assetId: compromisedAssetId,
      organizationId: testOrgId,
      action: "ASSET_TRANSFER",
      targetCustodianId: user2Id,
      persist: true,
    });

    assert(compRisk.riskScore >= 75, `Compromised asset with revoked credential scores high risk (${compRisk.riskScore}/100)`);
    assert(compRisk.decision === "BLOCK", "Risk Engine strictly BLOCKs mutations on identity with revoked credential");
    assert(
      compRisk.blockReasons.some((r) => r.toLowerCase().includes("revoked")),
      "Explainable block reason cites revoked verifiable credential"
    );

    // -----------------------------------------------------------------------
    // TEST SUITE 6: Rejection & Cancellation Lifecycle
    // -----------------------------------------------------------------------
    console.log("\n🛑 SUITE 6: Rejection & Cancellation Lifecycles");

    const rejectReq = await createApprovalRequest({
      organizationId: testOrgId,
      assetId: cleanAssetId,
      action: "ASSET_TRANSFER",
      requestedById: user1Id,
      requestedCustodianId: user2Id,
    });

    const rejected = await rejectApprovalRequest({
      approvalRequestId: rejectReq.id,
      userId: user2Id,
      reason: "Unauthorized transfer window",
    });

    assert(rejected.status === "REJECTED", "Approval request marked as REJECTED");
    assert(rejected.rejectionReason === "Unauthorized transfer window", "Rejection reason recorded in request record");

    const cancelReq = await createApprovalRequest({
      organizationId: testOrgId,
      assetId: cleanAssetId,
      action: "ASSET_REVOKE",
      requestedById: user1Id,
    });

    const cancelled = await cancelApprovalRequest({
      approvalRequestId: cancelReq.id,
      userId: user1Id,
    });

    assert(cancelled.status === "CANCELLED", "Requester successfully cancels approval request");

    // -----------------------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------------------
    console.log("\n============================================================");
    console.log(`  P1 VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log(`  Failures: ${failedTests}`);
    console.log("============================================================\n");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("FATAL ERROR during P1 test execution:", error);
    process.exit(1);
  }
}

runP1Tests();
