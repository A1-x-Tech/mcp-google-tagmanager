# Google Tag Manager: Update a tag, trigger or variable — MCP tool

**Google Tag Manager MCP tool:** Updates a tag, trigger or variable by its API path.

Technical name: `update_entity`

## What task it solves

> I want to update a tag, trigger or variable.

Updates a tag, trigger or variable by its API path.

## When to use it

Use this capability when you need “Update a tag, trigger or variable” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `path` — **required**. API-relative resource path as returned in the resource's own "path" field, e.g. "accounts/1/containers/2/workspaces/3/triggers/5".
- `body` — **required**. The complete replacement resource JSON.
- `fingerprint` — **optional**. The fingerprint from the last read of this resource; the update fails if it is stale.

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Google Tag Manager

The source marks the entire “Update a tag, trigger or variable” call as destructive. The exact effect depends on the selected action and is described below; review the parameters and reversibility before calling it.

## Example request

> Update a tag, trigger or variable in Google Tag Manager. Ask for any required identifiers that are missing. Show me the exact change and wait for confirmation first.

## Errors and limitations

PUT semantics: this is a FULL REPLACE, not a patch — fetch the current resource with get_resource, modify it, and send the whole object back. Pass the resource's last-seen fingerprint for optimistic-concurrency safety; a mismatch fails the request. Requires the tagmanager.edit.containers scope.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create a tag, trigger or variable](./create-entity.md) — `create_entity`
- [Delete a tag, trigger or variable](./delete-entity.md) — `delete_entity`
- [Get any resource by path](./get-resource.md) — `get_resource`
- [List tags](./list-tags.md) — `list_tags`

## Technical details

- **Impact:** destructive operation
- **Group:** Tags, triggers and variables
- **Description source:** `update_entity` registration in `src/tools/entities.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
