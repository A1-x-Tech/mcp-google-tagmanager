# Google Tag Manager: Create a container version from a workspace — MCP tool

**Google Tag Manager MCP tool:** Compiles a workspace into an immutable Container Version (the unit that gets published).

Technical name: `create_version`

## What task it solves

> I want to create a container version from a workspace.

Compiles a workspace into an immutable Container Version (the unit that gets published).

## When to use it

Use this capability when you need “Create a container version from a workspace” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `account_id` — **required**. GTM account id (string).
- `container_id` — **required**. Container id (string).
- `workspace_id` — **required**. Workspace id (string) to compile. This workspace is deleted afterwards.
- `name` — **optional**. Version display name.
- `notes` — **optional**. Version notes (changelog entry).

## What it returns

Returns { containerVersion (with containerVersionId and full tag/trigger/variable snapshots), syncStatus, newWorkspacePath }.

## What changes in Google Tag Manager

The source marks the entire “Create a container version from a workspace” call as destructive. The exact effect depends on the selected action and is described below; review the parameters and reversibility before calling it.

## Example request

> Create a container version from a workspace in Google Tag Manager. Ask for any required identifiers that are missing. Show me the exact change and wait for confirmation first.

## Errors and limitations

SIDE EFFECT: the source workspace is DELETED and replaced by a fresh one — the response's newWorkspacePath points to the replacement; use it for any further edits, or old workspace paths will 404. A compile failure comes back as compilerError=true with HTTP 200 and is reported as an error. Requires the tagmanager.edit.containerversions scope (edit.containers is NOT sufficient).

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Publish, inspect or fetch the live container version](./publish-version.md) — `publish_version`

## Technical details

- **Impact:** destructive operation
- **Group:** Versions and publishing
- **Description source:** `create_version` registration in `src/tools/versions.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
