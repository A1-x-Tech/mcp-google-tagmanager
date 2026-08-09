import { test } from "node:test";
import assert from "node:assert/strict";

import { BUILT_IN_VARIABLE_TYPES } from "../builtin-variable-types.js";
import { registerBuiltInVariableTools } from "./builtins.js";
import { harness, V2 } from "./harness.test.js";

const BIV = `${V2}/accounts/1/containers/2/workspaces/3/built_in_variables`;
const ARGS = { account_id: "1", container_id: "2", workspace_id: "3" };

test("the enum is generated from the discovery doc and holds the common values", () => {
  // Pin the size so a silent truncation of the generated file is caught.
  assert.ok(BUILT_IN_VARIABLE_TYPES.length >= 100, `enum too small: ${BUILT_IN_VARIABLE_TYPES.length}`);
  for (const known of ["pageUrl", "clickText", "event", "referrer", "scrollDepthThreshold"]) {
    assert.ok((BUILT_IN_VARIABLE_TYPES as readonly string[]).includes(known), `missing ${known}`);
  }
  assert.ok(!(BUILT_IN_VARIABLE_TYPES as readonly string[]).includes("builtInVariableTypeUnspecified"));
});

test("action=list GETs the collection", async () => {
  const h = harness(registerBuiltInVariableTools);
  try {
    await h.tools.manage_built_in_variables({ ...ARGS, action: "list" });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, BIV);
  assert.equal(h.calls[0].method, "GET");
});

test("action=enable POSTs repeated ?type= params with an empty body", async () => {
  const h = harness(registerBuiltInVariableTools);
  try {
    await h.tools.manage_built_in_variables({ ...ARGS, action: "enable", types: ["pageUrl", "clickText"] });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${BIV}?type=pageUrl&type=clickText`);
  assert.equal(h.calls[0].method, "POST");
  assert.equal(h.calls[0].body, undefined); // toggles carry no body
});

test("action=disable DELETEs with repeated ?type= params", async () => {
  const h = harness(registerBuiltInVariableTools, () => new Response(null, { status: 200 }));
  try {
    const res = await h.tools.manage_built_in_variables({ ...ARGS, action: "disable", types: ["event"] });
    assert.deepEqual(JSON.parse(res.content[0].text), { disabled: ["event"] });
  } finally {
    h.restore();
  }
  assert.equal(h.calls[0].url, `${BIV}?type=event`);
  assert.equal(h.calls[0].method, "DELETE");
});

test("enable/disable without types is an isError result and makes no request", async () => {
  const h = harness(registerBuiltInVariableTools);
  try {
    const res = await h.tools.manage_built_in_variables({ ...ARGS, action: "enable" });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /requires a non-empty/);
    assert.equal(h.calls.length, 0);
  } finally {
    h.restore();
  }
});
