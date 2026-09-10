export type RiskLevel = 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
export type PolicyDecision = 'ALLOW' | 'REQUIRE_APPROVAL' | 'BLOCK';

export type SignalCategory =
  | 'DOCUMENT'
  | 'CREDENTIAL'
  | 'IDENTITY'
  | 'BLOCKCHAIN'
  | 'CLASSIFICATION'
  | 'AUDIT'
  | 'ACTION';

export type SignalSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskSignal {
  code: string;
  name: string;
  category: SignalCategory;
  severity: SignalSeverity;
  scoreImpact: number;
  description: string;
  mitigation: string;
  detected: boolean;
  metadata?: Record<string, unknown>;
}

export interface RiskEvaluationResult {
  assetId: string;
  organizationId: string;
  action: string;
  riskScore: number;       // 0-100 (0 = Safe, 100 = Dangerous)
  trustScore: number;      // 0-100 (100 = Maximum Trust, 0 = Zero Trust)
  riskLevel: RiskLevel;
  decision: PolicyDecision;
  recommendedQuorum: number;
  signals: RiskSignal[];
  blockReasons: string[];
  approvalReasons: string[];
  evaluatedAt: string;
  assessmentId?: string;
}

export interface EvaluateRiskParams {
  assetId: string;
  organizationId: string;
  action?: string;
  requestedById?: string;
  targetCustodianId?: string;
  persist?: boolean;
}
