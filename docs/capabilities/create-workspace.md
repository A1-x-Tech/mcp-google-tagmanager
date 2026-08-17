# Google Tag Manager: Create a workspace — MCP tool

**Google Tag Manager MCP tool:** Creates a new workspace in a container — an isolated draft where tags, triggers and variables are edited before being compiled into a version.

Technical name: `create_workspace`

## What task it solves

> I want to create a workspace.

Creates a new workspace in a container — an isolated draft where tags, triggers and variables are edited before being compiled into a version.

## When to use it

Use this capability when you need “Create a workspace” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `account_id` — **required**. GTM account id (string).
- `container_id` — **required**. Container id (string).
- `name` — **required**. Display name of the new workspace.
- `description` — **optional**. Optional description of what this workspace changes.

## What it returns

Returns the created Workspace with its server-assigned workspaceId.

## What changes in Google Tag Manager

The tool changes real Google Tag Manager data as described above. The server does not promise an automatic rollback.

## Example request

> Create a workspace in Google Tag Manager. Ask for any required identifiers that are missing.

## Errors and limitations

Requires the tagmanager.edit.containers scope.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Get a workspace](./get-workspace.md) — `get_workspace`
- [List workspaces](./list-workspaces.md) — `list_workspaces`

## Technical details

- **Impact:** changes data
- **Group:** Workspaces
- **Description source:** `create_workspace` registration in `src/tools/workspaces.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
