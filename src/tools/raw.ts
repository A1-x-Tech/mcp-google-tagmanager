import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HttpMethod, TagManagerClient } from "../client.js";
import { DESTRUCTIVE, fail, ok } from "./util.js";

export function registerRawTool(server: McpServer, client: TagManagerClient): void {
  server.registerTool(
    "raw_request",
    {
      title: "Raw Tag Manager API call",
      // The API has write endpoints and this tool can reach all of them,
      // so it carries the most conservative hints.
      annotations: DESTRUCTIVE,
      description:
        'Escape hatch to call any Google Tag Manager API v2 path directly, for endpoints without a dedicated tool (environments, folders, templates, zones, workspace :sync / :quick_preview, version_headers, ...). `path` is relative to /tagmanager/v2/, e.g. "accounts/1/containers/2/environments". `query` values may be arrays for repeated params. Requests go through the same OAuth, rate limiter and retries as every other tool.',
      inputSchema: {
        path: z
          .string()
          .min(1)
          .describe('API path relative to /tagmanager/v2/, e.g. "accounts/1/containers/2/version_headers".'),
        method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional().describe("HTTP method. Defaults to GET."),
        query: z
          .record(z.union([z.string(), z.array(z.string())]))
          .optional()
          .describe('Query parameters; use an array for repeated keys, e.g. { "type": ["pageUrl", "event"] }.'),
        body: z.record(z.any()).optional().describe("JSON request body (POST/PUT)."),
      },
    },
    async ({ path, method, query, body }) => {
      try {
        const m = (method ?? "GET") as HttpMethod;
        return ok(await client.request(m, path, { query, body }));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
