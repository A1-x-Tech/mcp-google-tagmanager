import { test } from "node:test";
import assert from "node:assert/strict";

import { registerVersionTools } from "./versions.js";
import { harness, V2 } from "./harness.test.js";

test("registers the two version tools", () => {
  const h = harness(registerVersionTools);
  h.restore();
  assert.deepEqual(Object.keys(h.tools).sort(), ["create_version", "publish_version"]);
});

test("create_version POSTs {workspace}:create_version with name/notes", async () => {
  const h = harness(registerVersionTools, () =>
    new Response(
      JSON.stringify({
        containerVersion: { containerVersionId: "5" },
        compilerError: false,
        newWorkspacePath: "accounts/1/containers/2/workspaces/9",
      }),
      { status: 200 },
    ),
  );
  try {
    const res = await h.tools.create_version({
      account_id: "1",
      container_id: "2",
      workspace_id: "3",
      name: "Release 1",
      notes: "adds GA4",
    });
    assert.equal(res.isError, undefined);
    assert.equal(JSON.parse(res.content[0].text).newWorkspacePath, "accounts/1/containers/2/workspaces/9");
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${V2}/accounts/1/containers/2/workspaces/3:create_version`);
  assert.equal(h.calls[0].method, "POST");
  assert.deepEqual(h.calls[0].body, { name: "Release 1", notes: "adds GA4" });
});

test("compilerError=true with HTTP 200 is reported as a tool error", async () => {
  const h = harness(registerVersionTools, () =>
    new Response(JSON.stringify({ compilerError: true, containerVersion: {} }), { status: 200 }),
  );
  try {
    const res = await h.tools.create_version({ account_id: "1", container_id: "2", workspace_id: "3" });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /compilerError=true/);
  } finally {
    h.restore();
  }
});

test("publish_version action=publish POSTs {version}:publish with the fingerprint", async () => {
  const h = harness(registerVersionTools);
  try {
    await h.tools.publish_version({
      account_id: "1",
      container_id: "2",
      action: "publish",
      version_id: "7",
      fingerprint: "fp",
    });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${V2}/accounts/1/containers/2/versions/7:publish?fingerprint=fp`);
  assert.equal(h.calls[0].method, "POST");
  assert.equal(h.calls[0].body, undefined); // publish sends an empty body
});

test("publish with compilerError=true is a tool error too", async () => {
  const h = harness(registerVersionTools, () =>
    new Response(JSON.stringify({ compilerError: true }), { status: 200 }),
  );
  try {
    const res = await h.tools.publish_version({
      account_id: "1",
      container_id: "2",
      action: "publish",
      version_id: "7",
    });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /compilerError=true/);
  } finally {
    h.restore();
  }
});

test("publish_version action=get and action=live GET the version paths", async () => {
  const h = harness(registerVersionTools);
  try {
    await h.tools.publish_version({ account_id: "1", container_id: "2", action: "get", version_id: "7" });
    await h.tools.publish_version({ account_id: "1", container_id: "2", action: "live" });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${V2}/accounts/1/containers/2/versions/7`);
  assert.equal(h.calls[0].method, "GET");
  assert.equal(h.calls[1].url, `${V2}/accounts/1/containers/2/versions:live`);
  assert.equal(h.calls[1].method, "GET");
});

test("publish/get without version_id is an isError result and makes no request", async () => {
  const h = harness(registerVersionTools);
  try {
    for (const action of ["publish", "get"]) {
      const res = await h.tools.publish_version({ account_id: "1", container_id: "2", action });
      assert.equal(res.isError, true);
      assert.match(res.content[0].text, /requires `version_id`/);
    }
    assert.equal(h.calls.length, 0);
  } finally {
    h.restore();
  }
});
