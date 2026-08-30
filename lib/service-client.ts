import "server-only";

const DEFAULT_TIMEOUT_MS = 10_000;

type ServiceRequestInit = Omit<RequestInit, "signal"> & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

export class ServiceRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ServiceRequestError";
  }
}

function getServiceConfig() {
  const baseUrl = process.env.SERVICE_BASE_URL?.trim();
  const token = process.env.SERVICE_TOKEN?.trim();
  const configuredTimeout = Number(process.env.SERVICE_REQUEST_TIMEOUT_MS);

  if (!baseUrl || !token) {
    throw new ServiceRequestError("Service authentication is not configured");
  }

  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new ServiceRequestError("Service URL is invalid");
  }

  if (parsedBaseUrl.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new ServiceRequestError("Service URL must use HTTPS in production");
  }

  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_TIMEOUT_MS;

  return { baseUrl: parsedBaseUrl, token, timeoutMs };
}

export async function serviceFetch(path: string, init: ServiceRequestInit = {}) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new ServiceRequestError("Service request path must be relative");
  }

  const { baseUrl, token, timeoutMs } = getServiceConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  try {
    const response = await fetch(new URL(path, baseUrl), {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ServiceRequestError(
        `Upstream service returned HTTP ${response.status}`,
        response.status,
      );
    }

    return response;
  } catch (error) {
    if (error instanceof ServiceRequestError) throw error;
    if (controller.signal.aborted) {
      throw new ServiceRequestError("Upstream service request timed out", undefined, { cause: error });
    }
    throw new ServiceRequestError("Unable to reach upstream service", undefined, { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

export async function serviceFetchJson<T>(path: string, init?: ServiceRequestInit): Promise<T> {
  const response = await serviceFetch(path, init);

  try {
    return await response.json() as T;
  } catch (error) {
    throw new ServiceRequestError("Upstream service returned invalid JSON", response.status, { cause: error });
  }
}
