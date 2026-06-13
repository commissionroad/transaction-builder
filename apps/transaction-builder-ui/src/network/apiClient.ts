import type { ActionDefinitionV1 } from "@transaction-builder/domain";

const DEFAULT_API_BASE_URL = "http://localhost:3001";

export interface PublishedActionResponse {
  slug: string;
  chainId: number;
  commissionRoadNftId: string | null;
  title: string;
  schemaVersion: number;
  definition: ActionDefinitionV1;
  createdAt: string;
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

async function readActionResponse(
  response: Response,
): Promise<PublishedActionResponse> {
  if (response.status === 404) {
    throw new ActionNotFoundError();
  }

  if (!response.ok) {
    throw new ApiClientError(await getErrorMessage(response), response.status);
  }

  return (await response.json()) as PublishedActionResponse;
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
  return (
    import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
    DEFAULT_API_BASE_URL
  );
}
