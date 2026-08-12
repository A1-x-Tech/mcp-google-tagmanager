// Tests the built artifact in dist/ — the exact files that ship to npm.
// Plain JS on purpose: no tsx loader between the test and the artifact.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { TagManagerClient } from "../dist/client.js";

const ALL_TOOLS = [
  "create_container",
  "create_entity",
  "create_version",
  "create_workspace",
  "delete_entity",
  "get_account",
  "get_container",
  "get_resource",
  "get_workspace",
  "list_accounts",
  "list_containers",
  "list_tags",
  "list_triggers",
  "list_variables",
  "list_workspaces",
  "manage_built_in_variables",
  "publish_version",
  "raw_request",
  "update_entity",
];

test("dist binary completes a real MCP handshake over stdio and lists every tool", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/index.js", import.meta.url))],
    env: { ...process.env, GOOGLE_TAGMANAGER_ACCESS_TOKEN: "smoke-test-token", ASKADS_TELEMETRY: "0" },
    stderr: "ignore",
  });
  const client = new Client({ name: "dist-smoke", version: "0.0.0" });
  try {
    await client.connect(transport);
    const serverInfo = client.getServerVersion();
    assert.equal(serverInfo.name, "mcp-google-tagmanager");
    assert.notEqual(serverInfo.version, "0.0.0"); // real version read from package.json

    // The only prose the calling model gets before it picks a tool. An empty
    // one means the option was dropped somewhere between src and dist.
    const instructions = client.getInstructions();
    assert.ok(instructions, "initialize must carry instructions");
    assert.ok(instructions.length > 300, `instructions look truncated (${instructions.length} chars)`);
    // Regression guard on the two facts that cost the most to rediscover: GTM
    // configures tags, it does not report data, and the quota is the bottleneck.
    assert.match(instructions, /not Google Analytics/);
    assert.match(instructions, /0\.25 QPS/);

    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ALL_TOOLS);
    for (const tool of tools) {
      assert.ok(tool.annotations, `${tool.name} is missing annotations in dist`);
      assert.equal(typeof tool.annotations.readOnlyHint, "boolean", `${tool.name} readOnlyHint`);
    }
  } finally {
    await client.close();
  }
});

test("dist binary exits with an error when unconfigured", async () => {
  const { spawn } = await import("node:child_process");
  // Opt out so the startup_failed ping never leaves the test machine.
  const env = { ...process.env, ASKADS_TELEMETRY: "0" };
  delete env.GOOGLE_TAGMANAGER_ACCESS_TOKEN;
  delete env.GOOGLE_TAGMANAGER_CLIENT_ID;
  delete env.GOOGLE_TAGMANAGER_CLIENT_SECRET;
  delete env.GOOGLE_TAGMANAGER_REFRESH_TOKEN;
  const child = spawn(process.execPath, [fileURLToPath(new URL("../dist/index.js", import.meta.url))], { env });
  let stderr = "";
  child.stderr.on("data", (chunk) => (stderr += chunk));
  const code = await new Promise((resolve) => child.on("close", resolve));
  assert.equal(code, 1);
  assert.match(stderr, /GOOGLE_TAGMANAGER_CLIENT_ID is required/);
});

test("dist client rejects foreign-origin paths before sending the token", async () => {
  let called = false;
  const orig = globalThis.fetch;
  globalThis.fetch = async () => {
    called = true;
    return new Response("{}", { status: 200 });
  };
  try {
    const client = new TagManagerClient({
      accessToken: "SECRET",
      apiBase: "https://tagmanager.googleapis.com",
      timeoutMs: 1000,
      maxRetries: 0,
      minIntervalMs: 0,
    });
    await assert.rejects(() => client.request("GET", "https://example.invalid/steal"), /foreign origin/);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = orig;
  }
});
