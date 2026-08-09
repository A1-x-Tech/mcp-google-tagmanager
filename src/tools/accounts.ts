import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TagManagerClient } from "../client.js";
import { fail, idString, ok, pageToken, READ_ONLY } from "./util.js";

export function registerAccountTools(server: McpServer, client: TagManagerClient): void {
  server.registerTool(
    "list_accounts",
    {
      title: "List GTM accounts",
      annotations: READ_ONLY,
      description:
        "Lists all Google Tag Manager accounts the authorized user can access. Returns { account: [{ accountId, name, path, fingerprint }], nextPageToken }. All ids are strings. This is the entry point: every other tool needs an accountId (or a path) from here.",
      inputSchema: {
        page_token: pageToken(),
      },
    },
    async ({ page_token }) => {
      try {
        return ok(await client.listAccounts(page_token));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "get_account",
    {
      title: "Get a GTM account",
      annotations: READ_ONLY,
      description:
        "Gets one Google Tag Manager account by id. Returns the Account resource: { accountId, name, path, fingerprint, shareData }.",
      inputSchema: {
        account_id: idString("GTM account id (string), e.g. from list_accounts."),
      },
    },
    async ({ account_id }) => {
      try {
        return ok(await client.getResource(`accounts/${account_id}`));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
