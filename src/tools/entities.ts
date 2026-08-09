import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { EntityKind, TagManagerClient } from "../client.js";
import { DESTRUCTIVE, fail, idString, ok, pageToken, READ_ONLY, resourcePath, WRITE } from "./util.js";

/** One list_* tool per collection: same wire shape, different response key. */
const LISTS: Array<{ tool: string; kind: EntityKind; title: string; description: string }> = [
  {
    tool: "list_tags",
    kind: "tag",
    title: "List tags",
    description:
      "Lists the tags of a workspace. Returns { tag: [{ tagId, name, type (e.g. html, gaawe), parameter: [{ type, key, value, list, map }], firingTriggerId, blockingTriggerId, paused, path, fingerprint, tagManagerUrl }], nextPageToken }.",
  },
  {
    tool: "list_triggers",
    kind: "trigger",
    title: "List triggers",
    description:
      "Lists the triggers of a workspace. Returns { trigger: [{ triggerId, name, type (e.g. pageview, click, customEvent), filter/customEventFilter (conditions of { type, parameter }), path, fingerprint }], nextPageToken }.",
  },
  {
    tool: "list_variables",
    kind: "variable",
    title: "List variables",
    description:
      "Lists the user-defined variables of a workspace (built-in variables live in manage_built_in_variables). Returns { variable: [{ variableId, name, type (e.g. v = data layer, jsm = custom JS, c = constant), parameter, path, fingerprint }], nextPageToken }.",
  },
];

export function registerEntityTools(server: McpServer, client: TagManagerClient): void {
  for (const { tool, kind, title, description } of LISTS) {
    server.registerTool(
      tool,
      {
        title,
        annotations: READ_ONLY,
        description,
        inputSchema: {
          account_id: idString("GTM account id (string)."),
          container_id: idString("Container id (string)."),
          workspace_id: idString("Workspace id (string), e.g. from list_workspaces."),
          page_token: pageToken(),
        },
      },
      async ({ account_id, container_id, workspace_id, page_token }) => {
        try {
          return ok(await client.listEntities(account_id, container_id, workspace_id, kind, page_token));
        } catch (e) {
          return fail(e);
        }
      },
    );
  }

  server.registerTool(
    "get_resource",
    {
      title: "Get any resource by path",
      annotations: READ_ONLY,
      description:
        "Generic getter for any GTM resource by its API-relative path — tags, triggers, variables, versions, containers, workspaces. Prefer echoing the `path` field from a previous response over assembling the string yourself. Returns the full resource JSON including its current fingerprint (needed for update_entity).",
      inputSchema: {
        path: resourcePath("accounts/1/containers/2/workspaces/3/tags/4"),
      },
    },
    async ({ path }) => {
      try {
        return ok(await client.getResource(path));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "create_entity",
    {
      title: "Create a tag, trigger or variable",
      annotations: WRITE,
      description:
        "Creates a tag, trigger or variable in a workspace. `body` is the resource JSON: minimally { name, type } plus type-specific parameter entries; tags also take firingTriggerId (array of trigger id strings). Example tag body: { \"name\": \"GA4 event\", \"type\": \"gaawe\", \"parameter\": [...], \"firingTriggerId\": [\"12\"] }. Returns the created resource with its server-assigned id and fingerprint. Requires the tagmanager.edit.containers scope.",
      inputSchema: {
        account_id: idString("GTM account id (string)."),
        container_id: idString("Container id (string)."),
        workspace_id: idString("Workspace id (string)."),
        entity_type: z.enum(["tag", "trigger", "variable"]).describe("Which collection to create in."),
        body: z
          .record(z.any())
          .describe("The resource JSON to create (name, type, parameter, and for tags firingTriggerId)."),
      },
    },
    async ({ account_id, container_id, workspace_id, entity_type, body }) => {
      try {
        return ok(await client.createEntity(account_id, container_id, workspace_id, entity_type, body));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "update_entity",
    {
      title: "Update a tag, trigger or variable",
      annotations: { ...DESTRUCTIVE, idempotentHint: true },
      description:
        "Updates a tag, trigger or variable by its API path. PUT semantics: this is a FULL REPLACE, not a patch — fetch the current resource with get_resource, modify it, and send the whole object back. Pass the resource's last-seen fingerprint for optimistic-concurrency safety; a mismatch fails the request. Requires the tagmanager.edit.containers scope.",
      inputSchema: {
        path: resourcePath("accounts/1/containers/2/workspaces/3/triggers/5"),
        body: z.record(z.any()).describe("The complete replacement resource JSON."),
        fingerprint: z
          .string()
          .optional()
          .describe("The fingerprint from the last read of this resource; the update fails if it is stale."),
      },
    },
    async ({ path, body, fingerprint }) => {
      try {
        return ok(await client.updateEntity(path, body, fingerprint));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "delete_entity",
    {
      title: "Delete a tag, trigger or variable",
      annotations: { ...DESTRUCTIVE, idempotentHint: true },
      description:
        "Deletes a tag, trigger or variable by its API path. The response is empty on success. Requires the tagmanager.edit.containers scope.",
      inputSchema: {
        path: resourcePath("accounts/1/containers/2/workspaces/3/variables/7"),
      },
    },
    async ({ path }) => {
      try {
        await client.deleteEntity(path);
        return ok({ deleted: true, path });
      } catch (e) {
        return fail(e);
      }
    },
  );
}
