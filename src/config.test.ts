import { test } from "node:test";
import assert from "node:assert/strict";

import { ConfigError, loadConfig } from "./config.js";

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

test("with no credentials at all the client id is reported first", () => {
  assert.equal(reasonOf({}), "missing_client_id");
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
