export type CredentialType =
  | "ORGANIZATION_MEMBERSHIP"
  | "ROLE_ASSIGNMENT"
  | "ASSET_AUTHORIZATION"
  | "AUDITOR_AUTHORIZATION";

export type CredentialStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "SUSPENDED";

export interface OrganizationMembershipClaims {
  organizationId: string;
  organizationName: string;
  role: string;
  departmentId?: string | null;
  sectionId?: string | null;
  teamId?: string | null;
  memberSince?: string;
}

export interface RoleAssignmentClaims {
  organizationId: string;
  role: string;
  scope?: string;
  assignedPermissions: string[];
}

export interface AssetAuthorizationClaims {
  organizationId: string;
  assetId: string;
  assetName: string;
  assetType: string;
  classification: string;
  authorizedRoles: string[];
  permissions: ("READ" | "TRANSFER" | "UPDATE" | "AUDIT" | "MANAGE")[];
}

export interface AuditorAuthorizationClaims {
  organizationId: string;
  auditScope: string[];
  certifyingBody?: string;
  validFrom: string;
  validUntil: string;
}

export type CredentialClaims =
  | OrganizationMembershipClaims
  | RoleAssignmentClaims
  | AssetAuthorizationClaims
  | AuditorAuthorizationClaims
  | Record<string, unknown>;

export interface VerifiableCredentialPayload {
  context: string[];
  id: string;
  type: CredentialType[];
  issuer: {
    id: string; // DID
    name?: string;
    organizationId: string;
  };
  issuanceDate: string; // ISO 8601
  expirationDate?: string | null; // ISO 8601
  credentialSubject: {
    id: string; // DID
    claims: CredentialClaims;
  };
}

export interface CredentialProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  jcsSha256Hash: string;
  blockchainTxId?: string | null;
  signature?: string | null;
}

export interface CompleteVerifiableCredential {
  credential: VerifiableCredentialPayload;
  proof: CredentialProof;
}

export interface CredentialVerificationResult {
  valid: boolean;
  status: CredentialStatus;
  checks: {
    hashValid: boolean;
    formatValid: boolean;
    notExpired: boolean;
    notRevoked: boolean;
    blockchainAnchored: boolean;
  };
  details: {
    calculatedHash: string;
    recordedHash: string;
    issuerDid: string;
    subjectDid: string;
    type: CredentialType;
    issuedAt: string;
    expiresAt?: string | null;
    revokedAt?: string | null;
    revocationReason?: string | null;
    blockchainTxId?: string | null;
  };
  error?: string;
}
