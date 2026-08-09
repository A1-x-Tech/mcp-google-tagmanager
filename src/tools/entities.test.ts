import { test } from "node:test";
import assert from "node:assert/strict";

import { registerEntityTools } from "./entities.js";
import { harness, V2 } from "./harness.test.js";

const WS = `${V2}/accounts/1/containers/2/workspaces/3`;

test("registers the seven entity tools", () => {
  const h = harness(registerEntityTools);
  h.restore();
  assert.deepEqual(Object.keys(h.tools).sort(), [
    "create_entity",
    "delete_entity",
    "get_resource",
    "list_tags",
    "list_triggers",
    "list_variables",
    "update_entity",
  ]);
});

test("list_tags / list_triggers / list_variables GET their collections", async () => {
  const h = harness(registerEntityTools);
  const args = { account_id: "1", container_id: "2", workspace_id: "3" };
  try {
    await h.tools.list_tags(args);
    await h.tools.list_triggers({ ...args, page_token: "P" });
    await h.tools.list_variables(args);
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${WS}/tags`);
  assert.equal(h.calls[1].url, `${WS}/triggers?pageToken=P`);
  assert.equal(h.calls[2].url, `${WS}/variables`);
  for (const call of h.calls) assert.equal(call.method, "GET");
});

test("get_resource GETs an arbitrary API path", async () => {
  const h = harness(registerEntityTools);
  try {
    await h.tools.get_resource({ path: "accounts/1/containers/2/workspaces/3/tags/4" });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${WS}/tags/4`);
  assert.equal(h.calls[0].method, "GET");
});

test("create_entity POSTs the body to the collection chosen by entity_type", async () => {
  const h = harness(registerEntityTools);
  const base = { account_id: "1", container_id: "2", workspace_id: "3" };
  try {
    await h.tools.create_entity({ ...base, entity_type: "tag", body: { name: "t", type: "html" } });
    await h.tools.create_entity({ ...base, entity_type: "trigger", body: { name: "tr", type: "pageview" } });
    await h.tools.create_entity({ ...base, entity_type: "variable", body: { name: "v", type: "c" } });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${WS}/tags`);
  assert.deepEqual(h.calls[0].body, { name: "t", type: "html" });
  assert.equal(h.calls[1].url, `${WS}/triggers`);
  assert.equal(h.calls[2].url, `${WS}/variables`);
  for (const call of h.calls) assert.equal(call.method, "POST");
});

test("update_entity PUTs the full body with the fingerprint query param", async () => {
  const h = harness(registerEntityTools);
  try {
    await h.tools.update_entity({
      path: "accounts/1/containers/2/workspaces/3/tags/4",
      body: { name: "renamed", type: "html" },
      fingerprint: "fp1",
    });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${WS}/tags/4?fingerprint=fp1`);
  assert.equal(h.calls[0].method, "PUT");
  assert.deepEqual(h.calls[0].body, { name: "renamed", type: "html" });
});

test("delete_entity DELETEs and reports { deleted: true }", async () => {
  const h = harness(registerEntityTools, () => new Response(null, { status: 200 }));
  try {
    const res = await h.tools.delete_entity({ path: "accounts/1/containers/2/workspaces/3/variables/7" });
    assert.equal(res.isError, undefined);
    assert.deepEqual(JSON.parse(res.content[0].text), {
      deleted: true,
      path: "accounts/1/containers/2/workspaces/3/variables/7",
    });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${WS}/variables/7`);
  assert.equal(h.calls[0].method, "DELETE");
});

test("a fingerprint conflict comes back as isError", async () => {
  const h = harness(
    registerEntityTools,
    () =>
      new Response(
        JSON.stringify({ error: { code: 412, message: "Fingerprint mismatch", status: "FAILED_PRECONDITION" } }),
        { status: 412 },
      ),
  );
  try {
    const res = await h.tools.update_entity({
      path: "accounts/1/containers/2/workspaces/3/tags/4",
      body: { name: "x" },
      fingerprint: "stale",
    });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /HTTP 412: \[FAILED_PRECONDITION\] Fingerprint mismatch/);
  } finally {
    h.restore();
  }
});
