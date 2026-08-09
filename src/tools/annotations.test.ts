import { test } from "node:test";
import assert from "node:assert/strict";

import { registerAccountTools } from "./accounts.js";
import { registerBuiltInVariableTools } from "./builtins.js";
import { registerContainerTools } from "./containers.js";
import { registerEntityTools } from "./entities.js";
import { registerRawTool } from "./raw.js";
import { registerVersionTools } from "./versions.js";
import { registerWorkspaceTools } from "./workspaces.js";

interface Annotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

/** Registers every tool against a fake server, capturing each tool's annotations. */
function collectAnnotations(): Record<string, Annotations | undefined> {
  const annotations: Record<string, Annotations | undefined> = {};
  const server = {
    registerTool: (name: string, cfg: { annotations?: Annotations }) => {
      annotations[name] = cfg.annotations;
    },
  };
  // Registration reads the client only inside handlers, so a stub is fine here.
  registerAccountTools(server as never, {} as never);
  registerContainerTools(server as never, {} as never);
  registerWorkspaceTools(server as never, {} as never);
  registerEntityTools(server as never, {} as never);
  registerBuiltInVariableTools(server as never, {} as never);
  registerVersionTools(server as never, {} as never);
  registerRawTool(server as never, {} as never);
  return annotations;
}

const ANN = collectAnnotations();

/**
 * The full hint map, pinned per tool. This is a write-capable API: reads are
 * READ_ONLY; creates are non-destructive writes; update/delete overwrite
 * existing state; create_version deletes its source workspace and publish
 * replaces the live version, so both are destructive.
 */
const EXPECTED: Record<string, Required<Annotations>> = {
  list_accounts: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  get_account: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  list_containers: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  get_container: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  list_workspaces: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  get_workspace: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  list_tags: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  list_triggers: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  list_variables: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  get_resource: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  create_container: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  create_workspace: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  create_entity: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  update_entity: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  delete_entity: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  manage_built_in_variables: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  create_version: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  publish_version: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  raw_request: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
};

test("registers all nineteen tools, each with annotations", () => {
  assert.deepEqual(Object.keys(ANN).sort(), Object.keys(EXPECTED).sort());
  for (const [name, a] of Object.entries(ANN)) {
    assert.ok(a, `${name} is missing annotations`);
  }
});

test("every tool carries exactly the pinned hints", () => {
  for (const [name, expected] of Object.entries(EXPECTED)) {
    assert.deepEqual(
      {
        readOnlyHint: ANN[name]?.readOnlyHint,
        destructiveHint: ANN[name]?.destructiveHint,
        idempotentHint: ANN[name]?.idempotentHint,
        openWorldHint: ANN[name]?.openWorldHint,
      },
      expected,
      `hints for ${name}`,
    );
  }
});
