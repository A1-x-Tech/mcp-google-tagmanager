import { test } from "node:test";
import assert from "node:assert/strict";

import { registerContainerTools } from "./containers.js";
import { harness, V2 } from "./harness.test.js";

test("registers the three container tools", () => {
  const h = harness(registerContainerTools);
  h.restore();
  assert.deepEqual(Object.keys(h.tools).sort(), ["create_container", "get_container", "list_containers"]);
});

test("list_containers and get_container GET the container paths", async () => {
  const h = harness(registerContainerTools);
  try {
    await h.tools.list_containers({ account_id: "1", page_token: "P" });
    await h.tools.get_container({ account_id: "1", container_id: "2" });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${V2}/accounts/1/containers?pageToken=P`);
  assert.equal(h.calls[0].method, "GET");
  assert.equal(h.calls[1].url, `${V2}/accounts/1/containers/2`);
});

test("create_container POSTs name + usageContext (snake_case mapped to wire casing)", async () => {
  const h = harness(registerContainerTools);
  try {
    await h.tools.create_container({ account_id: "1", name: "My site", usage_context: ["web"] });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${V2}/accounts/1/containers`);
  assert.equal(h.calls[0].method, "POST");
  assert.deepEqual(h.calls[0].body, { name: "My site", usageContext: ["web"] });
});

test("a client error comes back as isError", async () => {
  const h = harness(registerContainerTools, () => new Response("boom", { status: 500 }));
  try {
    const res = await h.tools.create_container({ account_id: "1", name: "x", usage_context: ["web"] });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /HTTP 500/);
  } finally {
    h.restore();
  }
});
