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

/**
 * The degraded-start contract: without any credentials the binary used to
 * exit(1) before the handshake, leaving the client a dead server and no reason.
 * It must now start, list every tool, open the instructions with the fix, and
 * answer a tool call with the actionable error — offline: the CredentialsError
 * fires before any fetch, so this test never touches the network.
 */
test("dist binary starts without credentials: handshake, tool list, actionable call error", async () => {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, value]) => value !== undefined && !key.startsWith("GOOGLE_TAGMANAGER_"),
    ),
  );
  env.ASKADS_TELEMETRY = "0"; // keep the suite offline
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/index.js", import.meta.url))],
    env,
    stderr: "pipe",
  });
  const client = new Client({ name: "dist-smoke-unconfigured", version: "0.0.0" });
  await client.connect(transport);
  try {
    // The model must read the fix before it picks a tool.
    const instructions = client.getInstructions() ?? "";
    assert.match(instructions, /not connected/);
    assert.match(instructions, /GOOGLE_TAGMANAGER_CLIENT_ID/);
    assert.match(instructions, /restart/);

    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ALL_TOOLS);

    // A tool call fails with the exact message instead of killing the server.
    const result = await client.callTool({ name: "list_accounts", arguments: {} });
    assert.equal(result.isError, true);
    const text = result.content.map((c) => c.text ?? "").join(" ");
    assert.match(text, /GOOGLE_TAGMANAGER_CLIENT_ID is required \(OAuth client id; or set GOOGLE_TAGMANAGER_ACCESS_TOKEN directly\)\./);
    assert.match(text, /restart the server/);
  } finally {
    await client.close();
  }
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
