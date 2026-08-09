import { test } from "node:test";
import assert from "node:assert/strict";

import { registerWorkspaceTools } from "./workspaces.js";
import { harness, V2 } from "./harness.test.js";

test("registers the three workspace tools", () => {
  const h = harness(registerWorkspaceTools);
  h.restore();
  assert.deepEqual(Object.keys(h.tools).sort(), ["create_workspace", "get_workspace", "list_workspaces"]);
});

test("list_workspaces and get_workspace GET the workspace paths", async () => {
  const h = harness(registerWorkspaceTools);
  try {
    await h.tools.list_workspaces({ account_id: "1", container_id: "2" });
    await h.tools.get_workspace({ account_id: "1", container_id: "2", workspace_id: "3" });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${V2}/accounts/1/containers/2/workspaces`);
  assert.equal(h.calls[1].url, `${V2}/accounts/1/containers/2/workspaces/3`);
  assert.equal(h.calls[1].method, "GET");
});

test("create_workspace POSTs name and drops an omitted description", async () => {
  const h = harness(registerWorkspaceTools);
  try {
    await h.tools.create_workspace({ account_id: "1", container_id: "2", name: "draft" });
    await h.tools.create_workspace({ account_id: "1", container_id: "2", name: "d2", description: "why" });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${V2}/accounts/1/containers/2/workspaces`);
  assert.equal(h.calls[0].method, "POST");
  assert.deepEqual(h.calls[0].body, { name: "draft" }); // no "description": undefined
  assert.deepEqual(h.calls[1].body, { name: "d2", description: "why" });
});

test("a client error comes back as isError", async () => {
  const h = harness(registerWorkspaceTools, () => new Response("nope", { status: 404 }));
  try {
    const res = await h.tools.get_workspace({ account_id: "1", container_id: "2", workspace_id: "9" });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /HTTP 404/);
  } finally {
    h.restore();
  }
});
