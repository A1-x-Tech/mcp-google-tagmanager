import { test } from "node:test";
import assert from "node:assert/strict";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { TagManagerError } from "../types.js";
import { fail, ok } from "./util.js";

/** The tools only ever emit text content; narrow the SDK's content union. */
function textOf(res: CallToolResult): string {
  const first = res.content[0];
  assert.equal(first.type, "text");
  return (first as { type: "text"; text: string }).text;
}

test("ok() emits compact JSON (the consumer is an LLM)", () => {
  assert.equal(textOf(ok({ a: 1, b: ["x"] })), '{"a":1,"b":["x"]}');
  assert.equal(textOf(ok("plain")), "plain");
  assert.equal(textOf(ok(undefined)), "null");
});

test("fail() marks the result as an error and keeps the message", () => {
  const res = fail(new TagManagerError(403, { error: { message: "denied", status: "PERMISSION_DENIED" } }));
  assert.equal(res.isError, true);
  assert.equal(textOf(res), "Error: HTTP 403: [PERMISSION_DENIED] denied");
});

test("fail() appends the cause when present", () => {
  const err = new Error("timed out", { cause: new Error("ECONNRESET") });
  assert.equal(textOf(fail(err)), "Error: timed out (ECONNRESET)");
});
