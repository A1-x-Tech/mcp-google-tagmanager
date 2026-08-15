#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TagManagerClient } from "./client.js";
import { ConfigError, DEFAULT_BASE, hasCredentials, loadConfig } from "./config.js";
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

/**
 * Prepended to INSTRUCTIONS when no credentials are configured. The model reads
 * this before it picks a tool, so an unconfigured session opens with the fix
 * rather than with a failed call. There is no in-chat login here: credentials
 * come only from the environment, so the fix is an operator action + restart.
 */
const UNCONFIGURED_PREFIX =
  "ATTENTION: Google Tag Manager is not connected yet — no credentials are configured, so every " +
  "tool call will fail. The operator must set GOOGLE_TAGMANAGER_CLIENT_ID + " +
  "GOOGLE_TAGMANAGER_CLIENT_SECRET + GOOGLE_TAGMANAGER_REFRESH_TOKEN (recommended; an OAuth " +
  "client from console.cloud.google.com with the Tag Manager API enabled, plus a refresh token " +
  "minted at developers.google.com/oauthplayground — see the README's \"Getting credentials\"), " +
  "or GOOGLE_TAGMANAGER_ACCESS_TOKEN with a short-lived access token, in the MCP client's server " +
  "config and restart this server — the variables are read only at startup. ";

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
 * Loads the config without dying on a bad value. A server that exits here never
 * completes the MCP handshake, so the user sees a dead server and no reason.
 * Instead the problem is carried into the session, where the model can read it
 * and relay it: the config degrades to "no credentials" and every tool call
 * fails with the actionable message.
 */
function loadConfigOrDegraded(telemetry: Telemetry): {
  config: TagManagerConfig;
  problem?: ConfigError;
} {
  try {
    return { config: loadConfig() };
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    console.error(`Error: ${err.message}`);
    // Fire-and-forget now that the process survives: the historical
    // `startup_failed` funnel stays comparable, but nothing blocks startup.
    telemetry.send("startup_failed", { reason: err.reason });
    return {
      config: { apiBase: process.env.GOOGLE_TAGMANAGER_API_BASE || DEFAULT_BASE },
      problem: err,
    };
  }
}

async function main(): Promise<void> {
  // Anonymous usage pings (ids/names/versions only, never credentials or
  // arguments); opt out with ASKADS_TELEMETRY=0. Built before the config so
  // missing credentials can be reported; wired to the server before tools register.
  const telemetry = new Telemetry(readVersion());
  const { config, problem } = loadConfigOrDegraded(telemetry);
  const client = new TagManagerClient(config);

  // Decided once, at startup: credentials come only from the environment, so
  // "restart after setting the variables" is the accurate advice to give.
  const connected = hasCredentials(config);

  // `instructions` belongs to the SDK's ServerOptions (2nd argument); passed
  // next to name/version it would be silently dropped from the initialize result.
  const server = new McpServer(
    {
      name: "mcp-google-tagmanager",
      version: readVersion(),
    },
    {
      instructions: connected
        ? INSTRUCTIONS
        : UNCONFIGURED_PREFIX + (problem ? `Configuration problem: ${problem.message} ` : "") + INSTRUCTIONS,
    },
  );

  instrumentToolCalls(server, telemetry);
  server.server.oninitialized = () => {
    telemetry.setClientInfo(server.server.getClientVersion());
    // Split on purpose: `server_start` keeps meaning "a usable install started",
    // so the unconfigured case gets its own event instead of inflating that number.
    if (connected) telemetry.send("server_start");
    else telemetry.send("unconfigured_start", { reason: problem?.reason ?? "missing_client_id" });
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
  console.error(
    `mcp-google-tagmanager running on stdio${connected ? "" : " (no credentials — set the environment variables and restart)"}`,
  );
}

main().catch((err) => {
  console.error("Fatal error starting mcp-google-tagmanager:", err);
  process.exit(1);
});
