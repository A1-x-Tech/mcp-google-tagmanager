# Google Tag Manager: Get any resource by path — MCP tool

**Google Tag Manager MCP tool:** Generic getter for any GTM resource by its API-relative path — tags, triggers, variables, versions, containers, workspaces.

Technical name: `get_resource`

## What task it solves

> I want to get any resource by path.

Generic getter for any GTM resource by its API-relative path — tags, triggers, variables, versions, containers, workspaces.

## When to use it

Use this capability when you need “Get any resource by path” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `path` — **required**. API-relative resource path as returned in the resource's own "path" field, e.g. "accounts/1/containers/2/workspaces/3/tags/4".

## What it returns

Returns the full resource JSON including its current fingerprint (needed for update_entity).

## What changes in Google Tag Manager

The tool reads Google Tag Manager data and does not change it.

## Example request

> Get any resource by path in Google Tag Manager. Ask for any required identifiers that are missing.

## Errors and limitations

Prefer echoing the `path` field from a previous response over assembling the string yourself.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create a tag, trigger or variable](./create-entity.md) — `create_entity`
- [Delete a tag, trigger or variable](./delete-entity.md) — `delete_entity`
- [List tags](./list-tags.md) — `list_tags`
- [List triggers](./list-triggers.md) — `list_triggers`

## Technical details

- **Impact:** read-only
- **Group:** Tags, triggers and variables
- **Description source:** `get_resource` registration in `src/tools/entities.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
