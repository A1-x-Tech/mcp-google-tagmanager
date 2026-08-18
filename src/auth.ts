import { CredentialsError } from "./config.js";
import type { TagManagerConfig } from "./types.js";
import { TagManagerError } from "./types.js";

/** Google OAuth 2.0 token endpoint. */
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Refresh the access token this many milliseconds before its reported expiry,
 * so a token never goes stale mid-request.
 */
const EXPIRY_MARGIN_MS = 60_000;

/** Fallback lifetime when the token response has no usable expires_in. */
const DEFAULT_LIFETIME_S = 3600;

/**
 * Supplies OAuth access tokens for API requests.
 *
 * With GOOGLE_TAGMANAGER_ACCESS_TOKEN set, that token is returned as-is (quick
 * sessions; Google access tokens expire in ~1 hour and are not auto-refreshed).
 * Otherwise the client-id/secret/refresh-token trio is exchanged at
 * https://oauth2.googleapis.com/token (form-urlencoded, grant_type=refresh_token)
 * and the resulting access token is cached until 60 s before expiry. Concurrent
 * callers share one in-flight exchange; a failed exchange is not cached.
 *
 * Token-endpoint calls do not count against the GTM API quota, so they bypass
 * the client's rate limiter.
 *
 * With no credentials at all (a degraded start), {@link CredentialsError} is
 * thrown BEFORE any fetch — a missing setup must never enter the retry/backoff
 * loop or reach the token endpoint, because no amount of retrying mints
 * credentials.
 */
export class TokenProvider {
  private cachedToken?: string;
  private cachedUntil = 0;
  private pending?: Promise<string>;

  constructor(private readonly config: TagManagerConfig) {}

  async getAccessToken(): Promise<string> {
    if (this.config.accessToken) return this.config.accessToken;
    if (!this.config.clientId && !this.config.clientSecret && !this.config.refreshToken) {
      throw new CredentialsError();
    }
    if (this.cachedToken && Date.now() < this.cachedUntil) return this.cachedToken;
    if (!this.pending) {
      this.pending = this.refresh().finally(() => {
        this.pending = undefined;
      });
    }
    return this.pending;
  }

  private async refresh(): Promise<string> {
    const { clientId, clientSecret, refreshToken } = this.config;
    if (!clientId || !clientSecret || !refreshToken) {
      // loadConfig yields either a full trio or no credentials at all (caught
      // above as CredentialsError); this guards a direct partial construction.
      throw new Error(
        "OAuth refresh requires GOOGLE_TAGMANAGER_CLIENT_ID, GOOGLE_TAGMANAGER_CLIENT_SECRET and GOOGLE_TAGMANAGER_REFRESH_TOKEN.",
      );
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const timeoutMs = this.config.timeoutMs ?? 60_000;
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();

    let data: unknown = undefined;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) throw new TagManagerError(res.status, data);

    const record = (data ?? {}) as Record<string, unknown>;
    const token = record.access_token;
    if (typeof token !== "string" || !token) {
      throw new Error("OAuth token response contained no access_token.");
    }

    const expiresIn = Number(record.expires_in);
    const lifetimeMs = (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : DEFAULT_LIFETIME_S) * 1000;
    this.cachedToken = token;
    this.cachedUntil = Date.now() + lifetimeMs - EXPIRY_MARGIN_MS;
    return token;
  }
}
