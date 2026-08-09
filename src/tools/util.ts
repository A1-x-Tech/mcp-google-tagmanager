import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

/** Wraps a value as a compact-JSON tool result (compact: the consumer is an LLM). */
export function ok(data: unknown): CallToolResult {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  return { content: [{ type: "text", text: text ?? "null" }] };
}

export function fail(err: unknown): CallToolResult {
  let message = err instanceof Error ? err.message : String(err);
  // Surface the underlying cause (e.g. the network error behind a timeout) — no
  // secrets live in cause, and it makes failures far easier to diagnose.
  if (err instanceof Error && err.cause instanceof Error) message += ` (${err.cause.message})`;
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

/**
 * MCP tool annotations — hints the consuming client can use to gate or label a
 * tool. All four hints are set explicitly on every tool: some clients (OpenAI
 * Apps review) require readOnlyHint, destructiveHint and openWorldHint each time.
 */
export const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

/** Creates a new resource: not read-only, but nothing existing is overwritten. */
export const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

/** Overwrites or deletes existing state (PUT full-replace, DELETE, publish). */
export const DESTRUCTIVE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

/**
 * zod FACTORIES (not shared consts) for fields that repeat within one tool's
 * inputSchema: reusing one zod object across two fields makes zod-to-json-schema
 * dedupe them into a `$ref`, which some tool-schema consumers don't dereference
 * and flag as `any`. A fresh object per field keeps each one inlined.
 */
export const idString = (what: string) => z.string().min(1).describe(what);

/** An API-relative resource path, as returned in every resource's `path` field. */
export const resourcePath = (example: string) =>
  z
    .string()
    .regex(/^accounts\//, 'Must be an API-relative path starting with "accounts/"')
    .describe(`API-relative resource path as returned in the resource's own "path" field, e.g. "${example}".`);

export const pageToken = () =>
  z.string().optional().describe("Pagination token from a previous response's nextPageToken. Omit for the first page.");
