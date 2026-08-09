import { test } from "node:test";
import assert from "node:assert/strict";

import { TokenProvider } from "./auth.js";
import type { TagManagerConfig } from "./types.js";

const TRIO: TagManagerConfig = {
  clientId: "cid",
  clientSecret: "sec",
  refreshToken: "rt",
  apiBase: "https://tagmanager.googleapis.com",
};

function mockTokenFetch(responses: Array<{ status?: number; body: unknown }>) {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = (async (url: unknown, init: unknown) => {
    const i = (init ?? {}) as RequestInit;
    calls.push({ url: String(url), init: i });
    const next = responses[Math.min(calls.length - 1, responses.length - 1)];
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  }) as typeof fetch;
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

test("exchanges the refresh token as form-urlencoded grant_type=refresh_token", async () => {
  const mock = mockTokenFetch([{ body: { access_token: "AT-1", expires_in: 3600 } }]);
  try {
    const token = await new TokenProvider(TRIO).getAccessToken();
    assert.equal(token, "AT-1");
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.calls[0].url, "https://oauth2.googleapis.com/token");
    assert.equal(mock.calls[0].init.method, "POST");
    const headers = mock.calls[0].init.headers as Record<string, string>;
    assert.equal(headers["Content-Type"], "application/x-www-form-urlencoded");
    const params = new URLSearchParams(String(mock.calls[0].init.body));
    assert.equal(params.get("grant_type"), "refresh_token");
    assert.equal(params.get("client_id"), "cid");
    assert.equal(params.get("client_secret"), "sec");
    assert.equal(params.get("refresh_token"), "rt");
  } finally {
    mock.restore();
  }
});

test("caches the access token until expiry (second call makes no request)", async () => {
  const mock = mockTokenFetch([{ body: { access_token: "AT-1", expires_in: 3600 } }]);
  try {
    const provider = new TokenProvider(TRIO);
    assert.equal(await provider.getAccessToken(), "AT-1");
    assert.equal(await provider.getAccessToken(), "AT-1");
    assert.equal(mock.calls.length, 1);
  } finally {
    mock.restore();
  }
});

test("refreshes again when the token is within the 60s expiry margin", async () => {
  // expires_in of 30s is inside the 60s margin, so the cache is immediately stale.
  const mock = mockTokenFetch([
    { body: { access_token: "AT-1", expires_in: 30 } },
    { body: { access_token: "AT-2", expires_in: 3600 } },
  ]);
  try {
    const provider = new TokenProvider(TRIO);
    assert.equal(await provider.getAccessToken(), "AT-1");
    assert.equal(await provider.getAccessToken(), "AT-2");
    assert.equal(mock.calls.length, 2);
  } finally {
    mock.restore();
  }
});

test("concurrent callers share a single in-flight exchange", async () => {
  const mock = mockTokenFetch([{ body: { access_token: "AT-1", expires_in: 3600 } }]);
  try {
    const provider = new TokenProvider(TRIO);
    const [a, b] = await Promise.all([provider.getAccessToken(), provider.getAccessToken()]);
    assert.equal(a, "AT-1");
    assert.equal(b, "AT-1");
    assert.equal(mock.calls.length, 1);
  } finally {
    mock.restore();
  }
});

test("a direct access token is returned without any token-endpoint call", async () => {
  const mock = mockTokenFetch([{ body: {} }]);
  try {
    const provider = new TokenProvider({ accessToken: "DIRECT", apiBase: "https://tagmanager.googleapis.com" });
    assert.equal(await provider.getAccessToken(), "DIRECT");
    assert.equal(mock.calls.length, 0);
  } finally {
    mock.restore();
  }
});

test("a token-endpoint error surfaces as TagManagerError and is not cached", async () => {
  const mock = mockTokenFetch([
    { status: 400, body: { error: "invalid_grant", error_description: "Token has been revoked." } },
    { body: { access_token: "AT-2", expires_in: 3600 } },
  ]);
  try {
    const provider = new TokenProvider(TRIO);
    await assert.rejects(() => provider.getAccessToken(), /HTTP 400: invalid_grant/);
    assert.equal(await provider.getAccessToken(), "AT-2"); // failure was not cached
    assert.equal(mock.calls.length, 2);
  } finally {
    mock.restore();
  }
});

test("a response without access_token is an error", async () => {
  const mock = mockTokenFetch([{ body: { token_type: "Bearer" } }]);
  try {
    await assert.rejects(() => new TokenProvider(TRIO).getAccessToken(), /no access_token/);
  } finally {
    mock.restore();
  }
});
