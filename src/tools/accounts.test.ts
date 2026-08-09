import { test } from "node:test";
import assert from "node:assert/strict";

import { registerAccountTools } from "./accounts.js";
import { harness, V2 } from "./harness.test.js";

test("registers both account tools", () => {
  const h = harness(registerAccountTools);
  h.restore();
  assert.deepEqual(Object.keys(h.tools).sort(), ["get_account", "list_accounts"]);
});

test("list_accounts GETs /accounts with the Bearer token and optional page_token", async () => {
  const h = harness(registerAccountTools);
  try {
    await h.tools.list_accounts({});
    await h.tools.list_accounts({ page_token: "NEXT" });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${V2}/accounts`);
  assert.equal(h.calls[0].method, "GET");
  assert.equal(h.calls[0].auth, "Bearer TKN");
  assert.equal(h.calls[1].url, `${V2}/accounts?pageToken=NEXT`);
});

test("get_account GETs the account path", async () => {
  const h = harness(registerAccountTools);
  try {
    const res = await h.tools.get_account({ account_id: "123" });
    assert.equal(res.isError, undefined);
    assert.equal(JSON.parse(res.content[0].text).ok, true);
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${V2}/accounts/123`);
});

test("an API error is returned as an isError result, not thrown", async () => {
  const h = harness(registerAccountTools, () => new Response("denied", { status: 403 }));
  try {
    const res = await h.tools.list_accounts({});
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /HTTP 403/);
  } finally {
    h.restore();
  }
});
