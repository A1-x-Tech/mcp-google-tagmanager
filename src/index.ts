#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TagManagerClient } from "./client.js";
import { ConfigError, loadConfig } from "./config.js";
import { instrumentToolCalls, Telemetry } from "./telemetry.js";
import type { TagManagerConfig } from "./types.js";
import { registerAccountTools } from "./tools/accounts.js";
import { registerBuiltInVariableTools } from "./tools/builtins.js";
import { registerContainerTools } from "./tools/containers.js";
import { registerEntityTools } from "./tools/entities.js";
import { registerRawTool } from "./tools/raw.js";
import { registerVersionTools } from "./tools/versions.js";
import { registerWorkspaceTools } from "./tools/workspaces.js";

/**
 * The prose the calling model receives in the initialize result, before it sees
 * a single tool. It carries only what the tool list cannot: what this API is
 * not, where the live-site danger sits, what the quota costs, and which errors
 * mean something other than what they say.
 */
const INSTRUCTIONS =
  "Google Tag Manager API v2 configures what a container deploys — tags, triggers, variables, " +
  "versions. It is not Google Analytics: no visits, conversions or reporting exist here. Tag, " +
  "trigger and variable edits land in a workspace draft and change nothing on real sites until " +
  "create_version compiles it; compiling consumes the workspace, so a workspace id from before a " +
  "create_version is dead. Quota binds everything: 0.25 QPS per project (25 calls/100 s) and 10k a " +
  "day, so requests are spaced 4.2 s apart by default — auditing a container takes minutes by " +
  "design; plan the fewest calls, never poll. 429 and quota-403 are already retried with backoff; " +
  "retrying by hand only burns quota. A 403 is as often a missing OAuth scope (readonly, " +
  "edit.containers, edit.containerversions and publish are granted separately) as a real permission " +
  "problem, an empty list_accounts means the authorized Google account sees no GTM account, not " +
  "that none exists, and with a direct access token (no refresh trio) a 401 after an hour is just " +
  "expiry. publish_version replaces production on every site with the container.";

/** Reads the package version so the server reports its real version to MCP clients. */
function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Loads the config, reporting the drop-off if it is missing. An unconfigured
 * server dies before the MCP handshake, so this ping is the only trace such an
 * install ever leaves — and it has to be awaited, or process.exit() below would
 * kill the request in flight.
 */
async function loadConfigOrExit(telemetry: Telemetry): Promise<TagManagerConfig> {
  try {
    return loadConfig();
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    console.error(`Error: ${err.message}`);
    await telemetry.sendBlocking("startup_failed", { reason: err.reason });
    process.exit(1);
  }
}

async function main(): Promise<void> {
  // Anonymous usage pings (ids/names/versions only, never credentials or
  // arguments); opt out with ASKADS_TELEMETRY=0. Built before the config so
  // missing credentials can be reported; wired to the server before tools register.
  const telemetry = new Telemetry(readVersion());
  const config = await loadConfigOrExit(telemetry);
  const client = new TagManagerClient(config);

  // `instructions` belongs to the SDK's ServerOptions (2nd argument); passed
  // next to name/version it would be silently dropped from the initialize result.
  const server = new McpServer(
    {
      name: "mcp-google-tagmanager",
      version: readVersion(),
    },
    { instructions: INSTRUCTIONS },
  );

  instrumentToolCalls(server, telemetry);
  server.server.oninitialized = () => {
    telemetry.setClientInfo(server.server.getClientVersion());
    telemetry.send("server_start");
  };

  registerAccountTools(server, client);
  registerContainerTools(server, client);
  registerWorkspaceTools(server, client);
  registerEntityTools(server, client);
  registerBuiltInVariableTools(server, client);
  registerVersionTools(server, client);
  registerRawTool(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr: stdout is reserved for the MCP protocol.
  console.error("mcp-google-tagmanager running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting mcp-google-tagmanager:", err);
  process.exit(1);
});
