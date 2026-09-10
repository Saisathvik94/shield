export type ApprovalAction =
  | "ASSET_TRANSFER"
  | "ASSET_ASSIGN"
  | "ASSET_REVOKE"
  | "ASSET_RETIRE"
  | "DOCUMENT_UPDATE"
  | "CREDENTIAL_ISSUE"
  | "CREDENTIAL_REVOKE";

export type ApprovalStatus =
  | "PENDING"
  | "QUORUM_REACHED"
  | "EXECUTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "INVALIDATED";

export interface ResolvedPolicy {
  policyId?: string | null;
  name: string;
  requiredApprovals: number;
  eligibleRoles: string[];
  eligibleUserIds?: string[];
  approvalExpiryHours: number;
  allowSelfApproval: boolean;
  isCustom: boolean;
}

export interface ApprovalRequestDetail {
  id: string;
  organizationId: string;
  assetId?: string | null;
  action: ApprovalAction;
  policyId?: string | null;
  requestedById: string;
  targetSubjectId?: string | null;
  currentAssetState?: string | null;
  currentCustodianId?: string | null;
  requestedCustodianId?: string | null;
  assetVersion: number;
  actionPayload: string;
  actionDigest: string;
  requiredApprovals: number;
  status: ApprovalStatus;
  rejectionReason?: string | null;
  rejectedById?: string | null;
  blockchainTxId?: string | null;
  expiresAt: string;
  finalizedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: { id: string; name: string } | null;
  asset?: { id: string; assetId: string; name: string; classification: string; status: string } | null;
  requestedBy?: { id: string; name: string; email: string } | null;
  currentCustodian?: { id: string; name: string; email: string } | null;
  requestedCustodian?: { id: string; name: string; email: string } | null;
  rejectedBy?: { id: string; name: string } | null;
  signatures: {
    id: string;
    approverId: string;
    approverDid: string;
    approverWallet: string;
    signature: string;
    actionDigest: string;
    signedAt: string;
    approver?: { id: string; name: string; email: string } | null;
  }[];
}
