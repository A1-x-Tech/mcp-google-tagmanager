# Google Tag Manager: Delete a tag, trigger or variable — MCP tool

**Google Tag Manager MCP tool:** Deletes a tag, trigger or variable by its API path.

Technical name: `delete_entity`

## What task it solves

> I want to delete a tag, trigger or variable.

Deletes a tag, trigger or variable by its API path.

## When to use it

Use this capability when you need “Delete a tag, trigger or variable” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `path` — **required**. API-relative resource path as returned in the resource's own "path" field, e.g. "accounts/1/containers/2/workspaces/3/variables/7".

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Google Tag Manager

The source marks the entire “Delete a tag, trigger or variable” call as destructive. The exact effect depends on the selected action and is described below; review the parameters and reversibility before calling it.

## Example request

> Delete a tag, trigger or variable in Google Tag Manager. Ask for any required identifiers that are missing. Show me the exact change and wait for confirmation first.

## Errors and limitations

The response is empty on success. Requires the tagmanager.edit.containers scope.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create a tag, trigger or variable](./create-entity.md) — `create_entity`
- [Get any resource by path](./get-resource.md) — `get_resource`
- [List tags](./list-tags.md) — `list_tags`
- [List triggers](./list-triggers.md) — `list_triggers`

## Technical details

- **Impact:** destructive operation
- **Group:** Tags, triggers and variables
- **Description source:** `delete_entity` registration in `src/tools/entities.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
