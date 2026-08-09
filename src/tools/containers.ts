import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TagManagerClient } from "../client.js";
import { fail, idString, ok, pageToken, READ_ONLY, WRITE } from "./util.js";

export function registerContainerTools(server: McpServer, client: TagManagerClient): void {
  server.registerTool(
    "list_containers",
    {
      title: "List containers",
      annotations: READ_ONLY,
      description:
        "Lists the containers of a GTM account. Returns { container: [{ containerId, name, publicId (e.g. GTM-XXXXXX), usageContext, path, fingerprint, tagManagerUrl }], nextPageToken }.",
      inputSchema: {
        account_id: idString("GTM account id (string)."),
        page_token: pageToken(),
      },
    },
    async ({ account_id, page_token }) => {
      try {
        return ok(await client.listContainers(account_id, page_token));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "get_container",
    {
      title: "Get a container",
      annotations: READ_ONLY,
      description:
        "Gets one container by account id + container id. Returns the Container resource including publicId (the GTM-XXXXXX snippet id), usageContext and fingerprint.",
      inputSchema: {
        account_id: idString("GTM account id (string)."),
        container_id: idString("Container id (string), e.g. from list_containers."),
      },
    },
    async ({ account_id, container_id }) => {
      try {
        return ok(await client.getResource(`accounts/${account_id}/containers/${container_id}`));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "create_container",
    {
      title: "Create a container",
      annotations: WRITE,
      description:
        "Creates a new container in a GTM account. usage_context declares the platform, e.g. [\"web\"]; other values include androidSdk5, iosSdk5, server. Returns the created Container with its server-assigned containerId and publicId. Requires the tagmanager.edit.containers scope.",
      inputSchema: {
        account_id: idString("GTM account id (string)."),
        name: z.string().min(1).describe("Display name of the new container."),
        usage_context: z
          .array(z.string().min(1))
          .min(1)
          .describe('Usage contexts, e.g. ["web"]. Other documented values: androidSdk5, iosSdk5, server.'),
      },
    },
    async ({ account_id, name, usage_context }) => {
      try {
        return ok(await client.createContainer(account_id, { name, usageContext: usage_context }));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
