import type { TagManagerConfig } from "./types.js";

/** Default Google Tag Manager API host. */
export const DEFAULT_BASE = "https://tagmanager.googleapis.com";

/**
 * GTM enforces 0.25 QPS per project (25 requests / 100 s sliding window), so
 * requests are spaced at least this far apart by default: 100_000 ms / 25 = 4_000,
 * plus a small safety margin.
 */
const DEFAULT_MIN_INTERVAL_MS = 4_200;

/**
 * A malformed environment variable combination. Thrown instead of exiting on
 * the spot so index.ts can catch it, report the drop-off and start degraded
 * instead of dying; `reason` is a machine-readable code (never a variable's
 * value).
 */
export class ConfigError extends Error {
  readonly reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.name = "ConfigError";
    this.reason = reason;
  }
}

/**
 * What a tool call without credentials reads. The first sentence is the
 * historical startup error, verbatim (it already names both auth modes) — the
 * rest exists because credentials come only from the environment, so the fix
 * is an operator action plus a restart, never a retry.
 */
export const MISSING_CREDENTIALS_MESSAGE =
  "GOOGLE_TAGMANAGER_CLIENT_ID is required (OAuth client id; or set GOOGLE_TAGMANAGER_ACCESS_TOKEN directly). " +
  "This is not a network failure and retrying will not help: the operator must set these " +
  "environment variables in the MCP client's server config and restart the server — they are " +
  "read only at startup.";

/**
 * Raised when a tool call needs credentials and none were configured. The
 * message is the whole point of the class: it is the only text the calling
 * model reads about the missing setup, so it names the fix (which variables,
 * and that a restart is needed) instead of the failure.
 */
export class CredentialsError extends Error {
  constructor(message: string = MISSING_CREDENTIALS_MESSAGE) {
    super(message);
    this.name = "CredentialsError";
  }
}

/** True when the config carries usable credentials (a direct access token or the full refresh trio). */
export function hasCredentials(config: TagManagerConfig): boolean {
  return Boolean(config.accessToken || (config.clientId && config.clientSecret && config.refreshToken));
}

/**
 * Builds the client config from environment variables.
 *
 * Missing credentials are NOT an error here: the server starts anyway and the
 * token provider raises {@link CredentialsError} on the first tool call, so an
 * unconfigured install completes the MCP handshake and carries the fix into
 * the session instead of dying before it with nothing to read. A malformed
 * setup — some credential variable set but no workable combination — still
 * throws, keeping the historical per-variable messages and reason codes,
 * because guessing what the user meant is worse.
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
  // An empty string counts as "not set" — a blank value in an MCP config is
  // the same operator mistake as a missing one.
  const accessToken = process.env.GOOGLE_TAGMANAGER_ACCESS_TOKEN || undefined;
  const clientId = process.env.GOOGLE_TAGMANAGER_CLIENT_ID || undefined;
  const clientSecret = process.env.GOOGLE_TAGMANAGER_CLIENT_SECRET || undefined;
  const refreshToken = process.env.GOOGLE_TAGMANAGER_REFRESH_TOKEN || undefined;

  // None of the four set → not an error (degraded start). Some set but no
  // workable combination → the historical checks in their historical order.
  const anyProvided = Boolean(accessToken || clientId || clientSecret || refreshToken);
  if (anyProvided && !accessToken) {
    if (!clientId) {
      throw new ConfigError(
        "GOOGLE_TAGMANAGER_CLIENT_ID is required (OAuth client id; or set GOOGLE_TAGMANAGER_ACCESS_TOKEN directly).",
        "missing_client_id",
      );
    }
    if (!clientSecret) {
      throw new ConfigError(
        "GOOGLE_TAGMANAGER_CLIENT_SECRET is required (OAuth client secret).",
        "missing_client_secret",
      );
    }
    if (!refreshToken) {
      throw new ConfigError("GOOGLE_TAGMANAGER_REFRESH_TOKEN is required (OAuth refresh token).", "missing_refresh_token");
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
