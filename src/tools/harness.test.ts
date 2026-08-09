/**
 * Shared harness for the tool tests: registers tools against a fake server and
 * runs their handlers through a REAL TagManagerClient with globalThis.fetch
 * mocked, so each tool test verifies the full wire shape (URL, method, body)
 * of the request it triggers. No tests live in this file.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TagManagerClient } from "../client.js";

export const V2 = "https://tagmanager.googleapis.com/tagmanager/v2";

export type ToolResult = { content: { text: string }[]; isError?: boolean };
export type Handler = (args: Record<string, unknown>) => Promise<ToolResult>;

export interface RecordedCall {
  url: string;
  method: string;
  auth: unknown;
  body: Record<string, unknown> | undefined;
}

export function harness(
  register: (server: McpServer, client: TagManagerClient) => void,
  respond?: (url: string, init: RequestInit) => Response,
) {
  const calls: RecordedCall[] = [];
  const orig = globalThis.fetch;
  globalThis.fetch = (async (url: unknown, init: unknown) => {
    const i = (init ?? {}) as RequestInit;
    calls.push({
      url: String(url),
      method: String(i.method),
      auth: (i.headers as Record<string, string> | undefined)?.Authorization,
      body: i.body ? JSON.parse(String(i.body)) : undefined,
    });
    if (respond) return respond(String(url), i);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;

  const client = new TagManagerClient({
    accessToken: "TKN",
    apiBase: "https://tagmanager.googleapis.com",
    minIntervalMs: 0,
    retryBaseMs: 0,
    maxRetries: 0,
  });

  const tools: Record<string, Handler> = {};
  const server = {
    registerTool: (name: string, _cfg: unknown, handler: Handler) => {
      tools[name] = handler;
    },
  };
  register(server as never, client);

  return {
    calls,
    tools,
    restore() {
      globalThis.fetch = orig;
    },
  };
}
