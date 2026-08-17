# Google Tag Manager: Create a tag, trigger or variable — MCP tool

**Google Tag Manager MCP tool:** Creates a tag, trigger or variable in a workspace.

Technical name: `create_entity`

## What task it solves

> I want to create a tag, trigger or variable.

Creates a tag, trigger or variable in a workspace.

## When to use it

Use this capability when you need “Create a tag, trigger or variable” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `account_id` — **required**. GTM account id (string).
- `container_id` — **required**. Container id (string).
- `workspace_id` — **required**. Workspace id (string).
- `entity_type` — **required**. Which collection to create in.
- `body` — **required**. The resource JSON to create (name, type, parameter, and for tags firingTriggerId).

## What it returns

Returns the created resource with its server-assigned id and fingerprint.

## What changes in Google Tag Manager

The tool changes real Google Tag Manager data as described above. The server does not promise an automatic rollback.

## Example request

> Create a tag, trigger or variable in Google Tag Manager. Ask for any required identifiers that are missing.

## Errors and limitations

`body` is the resource JSON: minimally { name, type } plus type-specific parameter entries; tags also take firingTriggerId (array of trigger id strings). Example tag body: { "name": "GA4 event", "type": "gaawe", "parameter": [...], "firingTriggerId": ["12"] }. Requires the tagmanager.edit.containers scope.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Delete a tag, trigger or variable](./delete-entity.md) — `delete_entity`
- [Get any resource by path](./get-resource.md) — `get_resource`
- [List tags](./list-tags.md) — `list_tags`
- [List triggers](./list-triggers.md) — `list_triggers`

## Technical details

- **Impact:** changes data
- **Group:** Tags, triggers and variables
- **Description source:** `create_entity` registration in `src/tools/entities.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
