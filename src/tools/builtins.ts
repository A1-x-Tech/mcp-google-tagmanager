import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BUILT_IN_VARIABLE_TYPES } from "../builtin-variable-types.js";
import type { TagManagerClient } from "../client.js";
import { fail, idString, ok, WRITE } from "./util.js";

export function registerBuiltInVariableTools(server: McpServer, client: TagManagerClient): void {
  server.registerTool(
    "manage_built_in_variables",
    {
      title: "List/enable/disable built-in variables",
      // list is read-only, but enable/disable write; toggles are non-destructive
      // (re-enabling restores them) and idempotent (enabling twice is a no-op).
      annotations: { ...WRITE, idempotentHint: true },
      description:
        "Manages a workspace's built-in variables (pageUrl, clickText, event, ...). These are toggles, not records: action \"list\" returns the currently enabled ones ({ builtInVariable: [...] }), \"enable\" and \"disable\" take `types` (BuiltInVariableType enum values) and switch them on/off. Enable/disable require the tagmanager.edit.containers scope.",
      inputSchema: {
        account_id: idString("GTM account id (string)."),
        container_id: idString("Container id (string)."),
        workspace_id: idString("Workspace id (string)."),
        action: z.enum(["list", "enable", "disable"]).describe("What to do."),
        types: z
          .array(z.enum(BUILT_IN_VARIABLE_TYPES))
          .optional()
          .describe(
            'Built-in variable types to enable/disable (required for those actions), e.g. ["pageUrl", "clickText"]. Ignored for "list".',
          ),
      },
    },
    async ({ account_id, container_id, workspace_id, action, types }) => {
      try {
        if (action === "list") {
          return ok(await client.listBuiltInVariables(account_id, container_id, workspace_id));
        }
        if (!types || types.length === 0) {
          return fail(new Error(`action "${action}" requires a non-empty \`types\` array.`));
        }
        if (action === "enable") {
          return ok(await client.enableBuiltInVariables(account_id, container_id, workspace_id, types));
        }
        await client.disableBuiltInVariables(account_id, container_id, workspace_id, types);
        return ok({ disabled: types });
      } catch (e) {
        return fail(e);
      }
    },
  );
}
