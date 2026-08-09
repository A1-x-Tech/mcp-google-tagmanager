import { test } from "node:test";
import assert from "node:assert/strict";

import { registerRawTool } from "./raw.js";
import { harness, V2 } from "./harness.test.js";

test("raw_request defaults to GET against the v2 base", async () => {
  const h = harness(registerRawTool);
  try {
    await h.tools.raw_request({ path: "accounts/1/containers/2/version_headers" });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${V2}/accounts/1/containers/2/version_headers`);
  assert.equal(h.calls[0].method, "GET");
  assert.equal(h.calls[0].auth, "Bearer TKN");
});

test("raw_request passes method, repeated query params and body through", async () => {
  const h = harness(registerRawTool);
  try {
    await h.tools.raw_request({
      path: "accounts/1/containers/2/workspaces/3/built_in_variables",
      method: "POST",
      query: { type: ["pageUrl", "event"] },
      body: undefined,
    });
    await h.tools.raw_request({
      path: "accounts/1/containers/2/environments",
      method: "POST",
      body: { name: "staging" },
    });
  } finally {
    h.restore();
  }
  assert.equal(
    h.calls[0].url,
    `${V2}/accounts/1/containers/2/workspaces/3/built_in_variables?type=pageUrl&type=event`,
  );
  assert.equal(h.calls[0].method, "POST");
  assert.deepEqual(h.calls[1].body, { name: "staging" });
});

test("raw_request cannot reach a foreign origin (SSRF guard)", async () => {
  const h = harness(registerRawTool);
  try {
    const res = await h.tools.raw_request({ path: "https://evil.example/steal", method: "GET" });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /foreign origin/);
    assert.equal(h.calls.length, 0);
  } finally {
    h.restore();
  }
});
