# Google Tag Manager: Get a workspace — MCP tool

**Google Tag Manager MCP tool:** Gets one workspace by account id + container id + workspace id.

Technical name: `get_workspace`

## What task it solves

> I want to get a workspace.

Gets one workspace by account id + container id + workspace id.

## When to use it

Use this capability when you need “Get a workspace” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `account_id` — **required**. GTM account id (string).
- `container_id` — **required**. Container id (string).
- `workspace_id` — **required**. Workspace id (string), e.g. from list_workspaces.

## What it returns

Returns the Workspace resource with its fingerprint.

## What changes in Google Tag Manager

The tool reads Google Tag Manager data and does not change it.

## Example request

> Get a workspace in Google Tag Manager. Ask for any required identifiers that are missing.

## Errors and limitations

Check required parameters, token permissions, and current upstream API limits.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create a workspace](./create-workspace.md) — `create_workspace`
- [List workspaces](./list-workspaces.md) — `list_workspaces`

## Technical details

- **Impact:** read-only
- **Group:** Workspaces
- **Description source:** `get_workspace` registration in `src/tools/workspaces.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
