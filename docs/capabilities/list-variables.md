# Google Tag Manager: List variables — MCP tool

**Google Tag Manager MCP tool:** Lists the user-defined variables of a workspace (built-in variables live in manage_built_in_variables).

Technical name: `list_variables`

## What task it solves

> I want to list variables.

Lists the user-defined variables of a workspace (built-in variables live in manage_built_in_variables).

## When to use it

Use this capability when you need “List variables” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `account_id` — **required**. GTM account id (string).
- `container_id` — **required**. Container id (string).
- `workspace_id` — **required**. Workspace id (string), e.g. from list_workspaces.
- `page_token` — **optional**. Pagination token from a previous response's nextPageToken. Omit for the first page.

## What it returns

Returns { variable: [{ variableId, name, type (e.g.

## What changes in Google Tag Manager

The tool reads Google Tag Manager data and does not change it.

## Example request

> List variables in Google Tag Manager. Ask for any required identifiers that are missing.

## Errors and limitations

v = data layer, jsm = custom JS, c = constant), parameter, path, fingerprint }], nextPageToken }.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create a tag, trigger or variable](./create-entity.md) — `create_entity`
- [Delete a tag, trigger or variable](./delete-entity.md) — `delete_entity`
- [Get any resource by path](./get-resource.md) — `get_resource`
- [List tags](./list-tags.md) — `list_tags`

## Technical details

- **Impact:** read-only
- **Group:** Tags, triggers and variables
- **Description source:** `list_variables` registration in `src/tools/entities.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
