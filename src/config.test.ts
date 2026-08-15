import { test } from "node:test";
import assert from "node:assert/strict";

import { ConfigError, hasCredentials, loadConfig } from "./config.js";

const ALL_VARS = [
  "GOOGLE_TAGMANAGER_ACCESS_TOKEN",
  "GOOGLE_TAGMANAGER_CLIENT_ID",
  "GOOGLE_TAGMANAGER_CLIENT_SECRET",
  "GOOGLE_TAGMANAGER_REFRESH_TOKEN",
  "GOOGLE_TAGMANAGER_API_BASE",
  "GOOGLE_TAGMANAGER_TIMEOUT_MS",
  "GOOGLE_TAGMANAGER_MAX_RETRIES",
  "GOOGLE_TAGMANAGER_MIN_INTERVAL_MS",
];

/** Clears every server variable, then applies the overrides, then restores. */
function withEnv(vars: Record<string, string | undefined>, run: () => void): void {
  const saved = new Map(ALL_VARS.map((k) => [k, process.env[k]]));
  for (const k of ALL_VARS) delete process.env[k];
  for (const [k, v] of Object.entries(vars)) {
    if (v !== undefined) process.env[k] = v;
  }
  try {
    run();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

function reasonOf(vars: Record<string, string | undefined>): string {
  let caught: unknown;
  withEnv(vars, () => {
    try {
      loadConfig();
    } catch (err) {
      caught = err;
    }
  });
  assert.ok(caught instanceof ConfigError, "config problems must throw ConfigError, not exit");
  return caught.reason;
}

/**
 * Missing credentials used to throw here, which killed the process before the
 * MCP handshake and left the user with a dead server and no reason. It is now
 * a survivable state: the server starts degraded and the token provider raises
 * CredentialsError on the first call instead (pinned in client.test.ts).
 * Reverting this would restore that dead end.
 */
test("no credentials at all is not an error — the config loads with empty fields", () => {
  withEnv({}, () => {
    const config = loadConfig();
    assert.equal(config.accessToken, undefined);
    assert.equal(config.clientId, undefined);
    assert.equal(config.clientSecret, undefined);
    assert.equal(config.refreshToken, undefined);
    assert.equal(config.apiBase, "https://tagmanager.googleapis.com");
    assert.equal(hasCredentials(config), false);
  });
});

test("an empty string counts as missing, not as a credential", () => {
  withEnv({ GOOGLE_TAGMANAGER_ACCESS_TOKEN: "", GOOGLE_TAGMANAGER_CLIENT_ID: "" }, () => {
    const config = loadConfig();
    assert.equal(config.accessToken, undefined);
    assert.equal(config.clientId, undefined);
    assert.equal(hasCredentials(config), false);
  });
});

test("a partial setup keeps failing with the first missing member, in the historical order", () => {
  // At least one credential variable is set, so the operator tried to configure
  // the server — that is a malformed setup, not an unconfigured one.
  assert.equal(reasonOf({ GOOGLE_TAGMANAGER_CLIENT_SECRET: "sec" }), "missing_client_id");
  assert.equal(reasonOf({ GOOGLE_TAGMANAGER_REFRESH_TOKEN: "rt" }), "missing_client_id");
});

test("each missing member of the refresh trio has its own reason code", () => {
  assert.equal(
    reasonOf({ GOOGLE_TAGMANAGER_CLIENT_ID: "id", GOOGLE_TAGMANAGER_REFRESH_TOKEN: "rt" }),
    "missing_client_secret",
  );
  assert.equal(
    reasonOf({ GOOGLE_TAGMANAGER_CLIENT_ID: "id", GOOGLE_TAGMANAGER_CLIENT_SECRET: "sec" }),
    "missing_refresh_token",
  );
});

test("a direct access token alone is a valid configuration", () => {
  withEnv({ GOOGLE_TAGMANAGER_ACCESS_TOKEN: "at" }, () => {
    const config = loadConfig();
    assert.equal(config.accessToken, "at");
    assert.equal(config.apiBase, "https://tagmanager.googleapis.com");
    assert.equal(hasCredentials(config), true);
  });
});

test("the refresh trio alone is a valid configuration", () => {
  withEnv(
    {
      GOOGLE_TAGMANAGER_CLIENT_ID: "id",
      GOOGLE_TAGMANAGER_CLIENT_SECRET: "sec",
      GOOGLE_TAGMANAGER_REFRESH_TOKEN: "rt",
    },
    () => {
      const config = loadConfig();
      assert.equal(config.clientId, "id");
      assert.equal(config.refreshToken, "rt");
      assert.equal(config.accessToken, undefined);
      assert.equal(hasCredentials(config), true);
    },
  );
});

test("numeric knobs default sanely and accept overrides", () => {
  withEnv({ GOOGLE_TAGMANAGER_ACCESS_TOKEN: "at" }, () => {
    const config = loadConfig();
    assert.equal(config.timeoutMs, 60_000);
    assert.equal(config.maxRetries, 3);
    assert.equal(config.minIntervalMs, 4_200); // 0.25 QPS quota with a margin
  });
  withEnv(
    {
      GOOGLE_TAGMANAGER_ACCESS_TOKEN: "at",
      GOOGLE_TAGMANAGER_TIMEOUT_MS: "1000",
      GOOGLE_TAGMANAGER_MAX_RETRIES: "0",
      GOOGLE_TAGMANAGER_MIN_INTERVAL_MS: "0",
    },
    () => {
      const config = loadConfig();
      assert.equal(config.timeoutMs, 1000);
      assert.equal(config.maxRetries, 0);
      assert.equal(config.minIntervalMs, 0);
    },
  );
  withEnv({ GOOGLE_TAGMANAGER_ACCESS_TOKEN: "at", GOOGLE_TAGMANAGER_MIN_INTERVAL_MS: "bogus" }, () => {
    assert.equal(loadConfig().minIntervalMs, 4_200); // invalid numbers fall back
  });
});
