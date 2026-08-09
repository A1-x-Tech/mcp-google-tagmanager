/**
 * The server talks to the Google Tag Manager API v2
 * (https://tagmanager.googleapis.com/tagmanager/v2/...). Auth is Google OAuth 2.0:
 * either a ready-made access token, or a client-id/client-secret/refresh-token
 * trio that the server exchanges for short-lived access tokens itself.
 *
 * GTM v2 addresses every resource through a single relative `path`
 * (accounts/{a}/containers/{c}/workspaces/{w}/tags/{t}, ...). All ids are
 * strings, and every resource carries `path` and `fingerprint` fields —
 * the fingerprint is the API's optimistic-concurrency token.
 */

export interface TagManagerConfig {
  /** Ready-made OAuth access token. Treated as a secret. Optional when the refresh trio is set. */
  accessToken?: string;
  /** OAuth client id of the Google Cloud project. */
  clientId?: string;
  /** OAuth client secret. Treated as a secret. */
  clientSecret?: string;
  /** Long-lived OAuth refresh token. Treated as a secret. */
  refreshToken?: string;
  /** API root host. Defaults to https://tagmanager.googleapis.com. */
  apiBase: string;
  /** Per-request timeout in milliseconds. Defaults to 60_000. */
  timeoutMs?: number;
  /** Max retries for transient errors (429/quota-403, and 5xx/network for reads). Defaults to 3. */
  maxRetries?: number;
  /** Base backoff in milliseconds, doubled each retry. Defaults to 1_000. */
  retryBaseMs?: number;
  /**
   * Minimum spacing between API requests in milliseconds. GTM enforces
   * 0.25 QPS (25 requests per 100 s sliding window), so the default is 4_200.
   */
  minIntervalMs?: number;
}

/**
 * The API reports failures with the standard Google JSON error envelope
 * ({ error: { code, message, errors: [{ reason, ... }], status } }). The parsed
 * body is kept alongside the HTTP status and a short readable message is derived.
 */
export class TagManagerError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(status: number, body: unknown) {
    super(`HTTP ${status}: ${formatErrorBody(body)}`);
    this.name = "TagManagerError";
    this.status = status;
    this.body = body;
  }
}

/** Turns a parsed Google API error body into a short, readable message. */
function formatErrorBody(body: unknown): string {
  if (body == null) return "(no body)";
  if (typeof body === "string") return body.slice(0, 500);
  if (typeof body !== "object") return String(body);
  const obj = body as Record<string, unknown>;

  // Google envelope: { error: { code, message, errors, status } }
  const err = obj.error;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string") {
      const status = typeof e.status === "string" ? `[${e.status}] ` : "";
      const reason = firstReason(e.errors);
      return `${status}${e.message}${reason ? ` (reason: ${reason})` : ""}`.slice(0, 500);
    }
  }
  // OAuth token endpoint style: { error: "invalid_grant", error_description: "..." }
  if (typeof obj.error === "string") {
    const desc = typeof obj.error_description === "string" ? `: ${obj.error_description}` : "";
    return `${obj.error}${desc}`.slice(0, 500);
  }
  if (typeof obj.message === "string") return obj.message.slice(0, 500);

  return JSON.stringify(obj).slice(0, 500);
}

/** Extracts the first `reason` from the envelope's errors[] list, if any. */
function firstReason(errors: unknown): string | undefined {
  if (!Array.isArray(errors)) return undefined;
  const first = errors[0];
  if (first && typeof first === "object" && typeof (first as Record<string, unknown>).reason === "string") {
    return (first as Record<string, unknown>).reason as string;
  }
  return undefined;
}

/**
 * True when a 403 body is a quota/rate-limit rejection (retryable) rather than
 * a permissions problem (not retryable). GTM documents quota overruns as
 * HTTP 403; 429 rateLimitExceeded is also observed across Google APIs.
 */
export function isQuotaError(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const err = (body as Record<string, unknown>).error;
  if (!err || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;
  const reasons = Array.isArray(e.errors)
    ? e.errors
        .map((item) =>
          item && typeof item === "object" ? (item as Record<string, unknown>).reason : undefined,
        )
        .filter((r): r is string => typeof r === "string")
    : [];
  const quotaReasons = ["rateLimitExceeded", "userRateLimitExceeded", "quotaExceeded", "dailyLimitExceeded"];
  if (reasons.some((r) => quotaReasons.includes(r))) return true;
  return typeof e.message === "string" && /quota|rate limit/i.test(e.message);
}
