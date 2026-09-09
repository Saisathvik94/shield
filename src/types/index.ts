export * from "./auth";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AlgorandStatusResponse {
  connected: boolean;
  network: string;
  server: string;
  latestRound?: number;
  timeSinceLastRound?: number;
  genesisId?: string;
  error?: string;
}
