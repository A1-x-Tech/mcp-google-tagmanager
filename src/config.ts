import type { TagManagerConfig } from "./types.js";

/** Default Google Tag Manager API host. */
const DEFAULT_BASE = "https://tagmanager.googleapis.com";

/**
 * GTM enforces 0.25 QPS per project (25 requests / 100 s sliding window), so
 * requests are spaced at least this far apart by default: 100_000 ms / 25 = 4_000,
 * plus a small safety margin.
 */
const DEFAULT_MIN_INTERVAL_MS = 4_200;

/**
 * A missing or malformed environment variable. Thrown instead of exiting on the
 * spot so index.ts owns the process exit; `reason` is a machine-readable code
 * (never a variable's value).
 */
export class ConfigError extends Error {
  readonly reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.name = "ConfigError";
    this.reason = reason;
  }
}

function die(message: string, reason: string): never {
  throw new ConfigError(message, reason);
}

/**
 * Builds the client config from environment variables, throwing ConfigError if
 * a required one is missing.
 *
 * Two auth modes:
 *   GOOGLE_TAGMANAGER_ACCESS_TOKEN                        ready-made OAuth access token (quick sessions;
 *                                                         expires in ~1 hour, no auto-refresh)
 *   GOOGLE_TAGMANAGER_CLIENT_ID / _CLIENT_SECRET /        refresh-token flow: the server exchanges the
 *   GOOGLE_TAGMANAGER_REFRESH_TOKEN                       refresh token for access tokens itself (recommended)
 *
 * Optional:
 *   GOOGLE_TAGMANAGER_API_BASE          API root override (default https://tagmanager.googleapis.com)
 *   GOOGLE_TAGMANAGER_TIMEOUT_MS        per-request timeout (default 60000)
 *   GOOGLE_TAGMANAGER_MAX_RETRIES       retries on transient errors (default 3)
 *   GOOGLE_TAGMANAGER_MIN_INTERVAL_MS   min spacing between API requests (default 4200)
 */
export function loadConfig(): TagManagerConfig {
  const accessToken = process.env.GOOGLE_TAGMANAGER_ACCESS_TOKEN;
  const clientId = process.env.GOOGLE_TAGMANAGER_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_TAGMANAGER_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_TAGMANAGER_REFRESH_TOKEN;

  if (!accessToken) {
    if (!clientId) {
      die(
        "GOOGLE_TAGMANAGER_CLIENT_ID is required (OAuth client id; or set GOOGLE_TAGMANAGER_ACCESS_TOKEN directly).",
        "missing_client_id",
      );
    }
    if (!clientSecret) {
      die("GOOGLE_TAGMANAGER_CLIENT_SECRET is required (OAuth client secret).", "missing_client_secret");
    }
    if (!refreshToken) {
      die("GOOGLE_TAGMANAGER_REFRESH_TOKEN is required (OAuth refresh token).", "missing_refresh_token");
    }
  }

  const timeoutMs = Number(process.env.GOOGLE_TAGMANAGER_TIMEOUT_MS);
  const maxRetries = Number(process.env.GOOGLE_TAGMANAGER_MAX_RETRIES);
  const minIntervalMs = Number(process.env.GOOGLE_TAGMANAGER_MIN_INTERVAL_MS);

  return {
    accessToken,
    clientId,
    clientSecret,
    refreshToken,
    apiBase: process.env.GOOGLE_TAGMANAGER_API_BASE || DEFAULT_BASE,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60_000,
    maxRetries: Number.isFinite(maxRetries) && maxRetries >= 0 ? maxRetries : 3,
    minIntervalMs: Number.isFinite(minIntervalMs) && minIntervalMs >= 0 ? minIntervalMs : DEFAULT_MIN_INTERVAL_MS,
  };
}
