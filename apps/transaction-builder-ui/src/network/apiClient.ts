import type { ActionDefinitionV1 } from "@transaction-builder/domain";

const DEFAULT_TRANSACTION_BUILDER_API_BASE_URL = "http://localhost:3001";
const DEFAULT_COMMISSIONROAD_API_BASE_URL = "https://api.commissionroad.xyz";

export interface PublishedActionResponse {
  slug: string;
  chainId: number;
  commissionRoadNftId: string | null;
  title: string;
  schemaVersion: number;
  definition: ActionDefinitionV1;
  createdAt: string;
}

export interface CommissionRoadPortfolioNft {
  id: number;
  chainId: number;
  name: string;
  claimableBalances: Array<{
    address: string;
    symbol: string;
    decimals: number;
    amount: string;
    fiatValue: string | null;
  }>;
  claimableBalanceFiat?: string;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export class ActionNotFoundError extends ApiClientError {
  constructor() {
    super("Action not found", 404);
    this.name = "ActionNotFoundError";
  }
}

export async function createPublishedAction(
  definition: ActionDefinitionV1,
): Promise<PublishedActionResponse> {
  const response = await fetch(`${getApiBaseUrl()}/actions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(definition),
  });

  return readActionResponse(response);
}

export async function getPublishedAction(
  slug: string,
): Promise<PublishedActionResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/actions/${encodeURIComponent(slug)}`,
  );

  return readActionResponse(response);
}

export async function getCommissionRoadPortfolioNfts(
  walletAddress: string,
  options: { signal?: AbortSignal } = {},
): Promise<CommissionRoadPortfolioNft[]> {
  const response = await fetch(
    `${getCommissionRoadApiBaseUrl()}/portfolio/${encodeURIComponent(walletAddress)}/nfts`,
    { signal: options.signal },
  );

  return readJsonResponse<CommissionRoadPortfolioNft[]>(response);
}

async function readActionResponse(
  response: Response,
): Promise<PublishedActionResponse> {
  if (response.status === 404) {
    throw new ActionNotFoundError();
  }

  if (!response.ok) {
    throw new ApiClientError(await getErrorMessage(response), response.status);
  }

  return readJsonResponse<PublishedActionResponse>(response);
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiClientError(await getErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

function getApiBaseUrl(): string {
  return getBaseUrl(
    import.meta.env.VITE_API_BASE_URL,
    DEFAULT_TRANSACTION_BUILDER_API_BASE_URL,
  );
}

function getCommissionRoadApiBaseUrl(): string {
  return getBaseUrl(
    import.meta.env.VITE_COMMISSIONROAD_API_BASE_URL,
    DEFAULT_COMMISSIONROAD_API_BASE_URL,
  );
}

function getBaseUrl(value: string | undefined, fallback: string): string {
  return value?.trim().replace(/\/$/, "") || fallback;
}
