import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { TagManagerClient } from "../client.js";
import { DESTRUCTIVE, fail, idString, ok } from "./util.js";

/**
 * Both :create_version and :publish can fail at the compiler level while
 * returning HTTP 200 — the failure signal is compilerError=true in the body.
 * Surface that as a tool error so the model does not mistake it for success.
 */
function okUnlessCompilerError(res: unknown): CallToolResult {
  if (res && typeof res === "object" && (res as Record<string, unknown>).compilerError === true) {
    return {
      content: [
        {
          type: "text",
          text: `Error: the container failed to compile (compilerError=true; HTTP 200). Full response: ${JSON.stringify(res)}`,
        },
      ],
      isError: true,
    };
  }
  return ok(res);
}

export function registerVersionTools(server: McpServer, client: TagManagerClient): void {
  server.registerTool(
    "create_version",
    {
      title: "Create a container version from a workspace",
      // Destructive on purpose: the source workspace is deleted by the API.
      annotations: DESTRUCTIVE,
      description:
        "Compiles a workspace into an immutable Container Version (the unit that gets published). SIDE EFFECT: the source workspace is DELETED and replaced by a fresh one — the response's newWorkspacePath points to the replacement; use it for any further edits, or old workspace paths will 404. Returns { containerVersion (with containerVersionId and full tag/trigger/variable snapshots), syncStatus, newWorkspacePath }. A compile failure comes back as compilerError=true with HTTP 200 and is reported as an error. Requires the tagmanager.edit.containerversions scope (edit.containers is NOT sufficient).",
      inputSchema: {
        account_id: idString("GTM account id (string)."),
        container_id: idString("Container id (string)."),
        workspace_id: idString("Workspace id (string) to compile. This workspace is deleted afterwards."),
        name: z.string().optional().describe("Version display name."),
        notes: z.string().optional().describe("Version notes (changelog entry)."),
      },
    },
    async ({ account_id, container_id, workspace_id, name, notes }) => {
      try {
        return okUnlessCompilerError(await client.createVersion(account_id, container_id, workspace_id, { name, notes }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "publish_version",
    {
      title: "Publish, inspect or fetch the live container version",
      // publish replaces what is live in production — destructive; get/live are reads.
      annotations: DESTRUCTIVE,
      description:
        'Container-version operations. action "publish" pushes a version live (replacing the currently published one; requires the tagmanager.publish scope; version_id required, fingerprint recommended). action "get" fetches one version by version_id. action "live" fetches the currently published version of the container (no version_id needed). Publish responses can carry compilerError=true with HTTP 200 — reported as an error. Returns the ContainerVersion (publish wraps it as { containerVersion, compilerError }).',
      inputSchema: {
        account_id: idString("GTM account id (string)."),
        container_id: idString("Container id (string)."),
        action: z.enum(["publish", "get", "live"]).describe("What to do."),
        version_id: z
          .string()
          .optional()
          .describe('Container version id (string). Required for "publish" and "get"; ignored for "live".'),
        fingerprint: z
          .string()
          .optional()
          .describe('The version\'s last-seen fingerprint ("publish" only), for optimistic-concurrency safety.'),
      },
    },
    async ({ account_id, container_id, action, version_id, fingerprint }) => {
      try {
        if (action === "live") {
          return ok(await client.liveVersion(account_id, container_id));
        }
        if (!version_id) {
          return fail(new Error(`action "${action}" requires \`version_id\`.`));
        }
        if (action === "get") {
          return ok(await client.getVersion(account_id, container_id, version_id));
        }
        return okUnlessCompilerError(await client.publishVersion(account_id, container_id, version_id, fingerprint));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
