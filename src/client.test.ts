import { test } from "node:test";
import assert from "node:assert/strict";

import { TagManagerClient } from "./client.js";
import { CredentialsError, MISSING_CREDENTIALS_MESSAGE } from "./config.js";
import type { TagManagerConfig } from "./types.js";

const BASE = "https://tagmanager.googleapis.com";
const V2 = `${BASE}/tagmanager/v2`;

function makeClient(overrides: Partial<TagManagerConfig> = {}) {
  return new TagManagerClient({
    accessToken: "TKN",
    apiBase: BASE,
    minIntervalMs: 0, // no throttling delay in tests
    retryBaseMs: 0, // no backoff delay in tests
    maxRetries: 0,
    ...overrides,
  });
}

function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const original = globalThis.fetch;
  const calls: { url: string; init: RequestInit; at: number }[] = [];
  globalThis.fetch = (async (url: unknown, init: unknown) => {
    const i = (init ?? {}) as RequestInit;
    calls.push({ url: String(url), init: i, at: Date.now() });
    return handler(String(url), i);
  }) as typeof fetch;
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

const okJson = (body: unknown = { ok: true }) => new Response(JSON.stringify(body), { status: 200 });

/**
 * The degraded-start contract: a server without credentials still runs, so the
 * token provider must fail the call itself — with the exact actionable message,
 * before any fetch. Zero fetch calls proves the error skips the token endpoint
 * and the retry/backoff loop alike (maxRetries is deliberately non-zero here).
 */
test("no credentials at all: CredentialsError with the exact text, fetch never called", async () => {
  const mock = mockFetch(() => okJson());
  try {
    const client = makeClient({ accessToken: undefined, maxRetries: 3 });
    await assert.rejects(
      () => client.listAccounts(),
      (err: unknown) => {
        assert.ok(err instanceof CredentialsError, "must be a CredentialsError");
        assert.equal(err.message, MISSING_CREDENTIALS_MESSAGE);
        // The historical startup error, verbatim — the message is the product.
        assert.ok(
          err.message.startsWith(
            "GOOGLE_TAGMANAGER_CLIENT_ID is required (OAuth client id; " +
              "or set GOOGLE_TAGMANAGER_ACCESS_TOKEN directly).",
          ),
          "the message must open with the historical startup error, verbatim",
        );
        assert.match(err.message, /restart the server/, "the fix must mention the restart");
        return true;
      },
    );
    assert.equal(mock.calls.length, 0, "must not fetch at all — no retries, no token mint");
  } finally {
    mock.restore();
  }
});

test("GET requests carry the Bearer token and resolve under /tagmanager/v2/", async () => {
  const mock = mockFetch(() => okJson());
  try {
    await makeClient().listAccounts();
    assert.equal(mock.calls[0].url, `${V2}/accounts`);
    assert.equal(mock.calls[0].init.method, "GET");
    const headers = mock.calls[0].init.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer TKN");
    assert.equal(headers["Content-Type"], undefined); // no body on GET
    assert.equal(mock.calls[0].init.body, undefined);
  } finally {
    mock.restore();
  }
});

test("with the refresh trio, one token exchange serves multiple API calls", async () => {
  let tokenCalls = 0;
  const mock = mockFetch((url) => {
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      tokenCalls++;
      return okJson({ access_token: "EXCHANGED", expires_in: 3600 });
    }
    return okJson();
  });
  try {
    const client = makeClient({
      accessToken: undefined,
      clientId: "cid",
      clientSecret: "sec",
      refreshToken: "rt",
    });
    await client.listAccounts();
    await client.listContainers("1");
    const apiCalls = mock.calls.filter((c) => c.url.startsWith(V2));
    assert.equal(tokenCalls, 1);
    assert.equal(apiCalls.length, 2);
    for (const call of apiCalls) {
      assert.equal((call.init.headers as Record<string, string>).Authorization, "Bearer EXCHANGED");
    }
  } finally {
    mock.restore();
  }
});

test("query params are appended, repeated for arrays, and undefined is dropped", async () => {
  const mock = mockFetch(() => okJson());
  try {
    const client = makeClient();
    await client.listAccounts("PAGE");
    await client.enableBuiltInVariables("1", "2", "3", ["pageUrl", "clickText"]);
    await client.listWorkspaces("1", "2"); // pageToken undefined
    assert.equal(mock.calls[0].url, `${V2}/accounts?pageToken=PAGE`);
    assert.equal(
      mock.calls[1].url,
      `${V2}/accounts/1/containers/2/workspaces/3/built_in_variables?type=pageUrl&type=clickText`,
    );
    assert.equal(mock.calls[1].init.method, "POST");
    assert.equal(mock.calls[2].url, `${V2}/accounts/1/containers/2/workspaces`);
  } finally {
    mock.restore();
  }
});

test("POST bodies are JSON with Content-Type; undefined optional keys are compacted away", async () => {
  const mock = mockFetch(() => okJson());
  try {
    await makeClient().createWorkspace("1", "2", { name: "draft", description: undefined });
    const init = mock.calls[0].init;
    assert.equal((init.headers as Record<string, string>)["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(String(init.body)), { name: "draft" });
  } finally {
    mock.restore();
  }
});

test("update goes out as PUT with the fingerprint query param", async () => {
  const mock = mockFetch(() => okJson());
  try {
    await makeClient().updateEntity("accounts/1/containers/2/workspaces/3/tags/4", { name: "t" }, "fp123");
    assert.equal(mock.calls[0].url, `${V2}/accounts/1/containers/2/workspaces/3/tags/4?fingerprint=fp123`);
    assert.equal(mock.calls[0].init.method, "PUT");
  } finally {
    mock.restore();
  }
});

test("version methods hit :create_version, :publish and versions:live", async () => {
  const mock = mockFetch(() => okJson());
  try {
    const client = makeClient();
    await client.createVersion("1", "2", "3", { name: "v1", notes: undefined });
    await client.publishVersion("1", "2", "7", "fp");
    await client.liveVersion("1", "2");
    assert.equal(mock.calls[0].url, `${V2}/accounts/1/containers/2/workspaces/3:create_version`);
    assert.deepEqual(JSON.parse(String(mock.calls[0].init.body)), { name: "v1" });
    assert.equal(mock.calls[1].url, `${V2}/accounts/1/containers/2/versions/7:publish?fingerprint=fp`);
    assert.equal(mock.calls[1].init.method, "POST");
    assert.equal(mock.calls[2].url, `${V2}/accounts/1/containers/2/versions:live`);
  } finally {
    mock.restore();
  }
});

test("non-2xx throws TagManagerError with the Google envelope summarized", async () => {
  const mock = mockFetch(() =>
    new Response(
      JSON.stringify({
        error: {
          code: 403,
          message: "The caller does not have permission",
          errors: [{ domain: "global", reason: "forbidden" }],
          status: "PERMISSION_DENIED",
        },
      }),
      { status: 403 },
    ),
  );
  try {
    await assert.rejects(
      () => makeClient().listAccounts(),
      /HTTP 403: \[PERMISSION_DENIED\] The caller does not have permission \(reason: forbidden\)/,
    );
    assert.equal(mock.calls.length, 1); // permission 403 is NOT retried
  } finally {
    mock.restore();
  }
});

// --- Retry policy ---

test("429 is retried for writes too, then succeeds", async () => {
  let calls = 0;
  const mock = mockFetch(() => {
    calls++;
    if (calls === 1) return new Response("slow down", { status: 429 });
    return okJson();
  });
  try {
    const result = await makeClient({ maxRetries: 2 }).createContainer("1", { name: "c", usageContext: ["web"] });
    assert.deepEqual(result, { ok: true });
    assert.equal(calls, 2);
  } finally {
    mock.restore();
  }
});

test("a quota-403 (rateLimitExceeded) is retried, unlike a permission 403", async () => {
  let calls = 0;
  const quotaBody = JSON.stringify({
    error: {
      code: 403,
      message: "User Rate Limit Exceeded",
      errors: [{ domain: "usageLimits", reason: "userRateLimitExceeded" }],
    },
  });
  const mock = mockFetch(() => {
    calls++;
    if (calls === 1) return new Response(quotaBody, { status: 403 });
    return okJson();
  });
  try {
    const result = await makeClient({ maxRetries: 2 }).createWorkspace("1", "2", { name: "w" });
    assert.deepEqual(result, { ok: true });
    assert.equal(calls, 2);
  } finally {
    mock.restore();
  }
});

test("5xx is retried for GET but rethrown immediately for writes", async () => {
  let calls = 0;
  const mock = mockFetch(() => {
    calls++;
    if (calls === 1) return new Response("boom", { status: 502 });
    return okJson();
  });
  try {
    const result = await makeClient({ maxRetries: 2 }).listAccounts();
    assert.deepEqual(result, { ok: true });
    assert.equal(calls, 2);
  } finally {
    mock.restore();
  }

  calls = 0;
  const mock2 = mockFetch(() => {
    calls++;
    return new Response("boom", { status: 502 });
  });
  try {
    await assert.rejects(
      () => makeClient({ maxRetries: 2 }).createWorkspace("1", "2", { name: "w" }),
      /HTTP 502/,
    );
    assert.equal(calls, 1); // a write that may have committed is not replayed
  } finally {
    mock2.restore();
  }
});

test("network errors are retried for GET only, and give up after maxRetries", async () => {
  let calls = 0;
  const mock = mockFetch(() => {
    calls++;
    if (calls === 1) throw new Error("ECONNRESET");
    return okJson();
  });
  try {
    const result = await makeClient({ maxRetries: 2 }).listAccounts();
    assert.deepEqual(result, { ok: true });
    assert.equal(calls, 2);
  } finally {
    mock.restore();
  }

  calls = 0;
  const mock2 = mockFetch(() => {
    calls++;
    throw new Error("ECONNRESET");
  });
  try {
    await assert.rejects(() => makeClient({ maxRetries: 2 }).createEntity("1", "2", "3", "tag", {}), /ECONNRESET/);
    assert.equal(calls, 1);
  } finally {
    mock2.restore();
  }

  calls = 0;
  const mock3 = mockFetch(() => {
    calls++;
    return new Response("slow down", { status: 429 });
  });
  try {
    await assert.rejects(() => makeClient({ maxRetries: 2 }).listAccounts(), /HTTP 429/);
    assert.equal(calls, 3); // initial + 2 retries
  } finally {
    mock3.restore();
  }
});

test("request() aborts and reports a timeout when the request hangs", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = ((_url: unknown, init: unknown) =>
    new Promise((_resolve, reject) => {
      const signal = (init as RequestInit).signal as AbortSignal;
      signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    })) as typeof fetch;
  try {
    const client = makeClient({ timeoutMs: 10 });
    await assert.rejects(() => client.createWorkspace("1", "2", { name: "w" }), /timed out after 10ms/);
  } finally {
    globalThis.fetch = original;
  }
});

// --- SSRF guard ---

test("request() rejects an absolute path (SSRF) and never fetches a foreign origin", async () => {
  for (const evil of ["https://evil.example/steal", "http://evil.example/x", "\\\\evil.example/x"]) {
    const mock = mockFetch(() => okJson());
    try {
      await assert.rejects(() => makeClient().request("GET", evil), /foreign origin/);
      assert.equal(mock.calls.length, 0, `must not fetch for ${JSON.stringify(evil)}`);
    } finally {
      mock.restore();
    }
  }
});

test("request() still accepts a relative API path", async () => {
  const mock = mockFetch(() => okJson());
  try {
    const result = await makeClient().request("GET", "accounts/1/containers/2");
    assert.deepEqual(result, { ok: true });
    assert.equal(mock.calls[0].url, `${V2}/accounts/1/containers/2`);
  } finally {
    mock.restore();
  }
});

// --- Rate limiter ---

test("requests are serialized and spaced at least minIntervalMs apart", async () => {
  const mock = mockFetch(() => okJson());
  try {
    const client = makeClient({ minIntervalMs: 60 });
    // Fire concurrently: the limiter must serialize them.
    await Promise.all([client.listAccounts(), client.listContainers("1"), client.liveVersion("1", "2")]);
    assert.equal(mock.calls.length, 3);
    assert.ok(mock.calls[0].url.endsWith("/accounts"), "order preserved");
    const gap1 = mock.calls[1].at - mock.calls[0].at;
    const gap2 = mock.calls[2].at - mock.calls[1].at;
    assert.ok(gap1 >= 50, `first gap too small: ${gap1}ms`);
    assert.ok(gap2 >= 50, `second gap too small: ${gap2}ms`);
  } finally {
    mock.restore();
  }
});

test("a failed request does not wedge the rate-limiter queue", async () => {
  let calls = 0;
  const mock = mockFetch(() => {
    calls++;
    if (calls === 1) return new Response("nope", { status: 400 });
    return okJson();
  });
  try {
    const client = makeClient();
    await assert.rejects(() => client.listAccounts(), /HTTP 400/);
    assert.deepEqual(await client.listAccounts(), { ok: true });
  } finally {
    mock.restore();
  }
});

test("retry attempts honor the throttle spacing too", async () => {
  let calls = 0;
  const mock = mockFetch(() => {
    calls++;
    if (calls === 1) return new Response("slow down", { status: 429 });
    return okJson();
  });
  try {
    const client = makeClient({ minIntervalMs: 60, maxRetries: 1 });
    await client.listAccounts();
    assert.equal(calls, 2);
    const gap = mock.calls[1].at - mock.calls[0].at;
    assert.ok(gap >= 50, `retry gap too small: ${gap}ms`);
  } finally {
    mock.restore();
  }
});
