# Google Tag Manager: List workspaces — MCP tool

**Google Tag Manager MCP tool:** Lists the workspaces of a container.

Technical name: `list_workspaces`

## What task it solves

> I want to list workspaces.

Lists the workspaces of a container.

## When to use it

Use this capability when you need “List workspaces” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `account_id` — **required**. GTM account id (string).
- `container_id` — **required**. Container id (string).
- `page_token` — **optional**. Pagination token from a previous response's nextPageToken. Omit for the first page.

## What it returns

Returns { workspace: [{ workspaceId, name, description, path, fingerprint }], nextPageToken }.

## What changes in Google Tag Manager

The tool reads Google Tag Manager data and does not change it.

## Example request

> List workspaces in Google Tag Manager. Ask for any required identifiers that are missing.

## Errors and limitations

Workspaces are mandatory in GTM v2: every tag/trigger/variable operation needs a workspaceId, and a "Default Workspace" always exists — call this first.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create a workspace](./create-workspace.md) — `create_workspace`
- [Get a workspace](./get-workspace.md) — `get_workspace`

## Technical details

- **Impact:** read-only
- **Group:** Workspaces
- **Description source:** `list_workspaces` registration in `src/tools/workspaces.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
