import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TagManagerClient } from "../client.js";
import { fail, idString, ok, pageToken, READ_ONLY, WRITE } from "./util.js";

export function registerWorkspaceTools(server: McpServer, client: TagManagerClient): void {
  server.registerTool(
    "list_workspaces",
    {
      title: "List workspaces",
      annotations: READ_ONLY,
      description:
        "Lists the workspaces of a container. Returns { workspace: [{ workspaceId, name, description, path, fingerprint }], nextPageToken }. Workspaces are mandatory in GTM v2: every tag/trigger/variable operation needs a workspaceId, and a \"Default Workspace\" always exists — call this first.",
      inputSchema: {
        account_id: idString("GTM account id (string)."),
        container_id: idString("Container id (string)."),
        page_token: pageToken(),
      },
    },
    async ({ account_id, container_id, page_token }) => {
      try {
        return ok(await client.listWorkspaces(account_id, container_id, page_token));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "get_workspace",
    {
      title: "Get a workspace",
      annotations: READ_ONLY,
      description:
        "Gets one workspace by account id + container id + workspace id. Returns the Workspace resource with its fingerprint.",
      inputSchema: {
        account_id: idString("GTM account id (string)."),
        container_id: idString("Container id (string)."),
        workspace_id: idString("Workspace id (string), e.g. from list_workspaces."),
      },
    },
    async ({ account_id, container_id, workspace_id }) => {
      try {
        return ok(
          await client.getResource(`accounts/${account_id}/containers/${container_id}/workspaces/${workspace_id}`),
        );
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "create_workspace",
    {
      title: "Create a workspace",
      annotations: WRITE,
      description:
        "Creates a new workspace in a container — an isolated draft where tags, triggers and variables are edited before being compiled into a version. Returns the created Workspace with its server-assigned workspaceId. Requires the tagmanager.edit.containers scope.",
      inputSchema: {
        account_id: idString("GTM account id (string)."),
        container_id: idString("Container id (string)."),
        name: z.string().min(1).describe("Display name of the new workspace."),
        description: z.string().optional().describe("Optional description of what this workspace changes."),
      },
    },
    async ({ account_id, container_id, name, description }) => {
      try {
        return ok(await client.createWorkspace(account_id, container_id, { name, description }));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
