# Google Tag Manager: List/enable/disable built-in variables — MCP tool

**Google Tag Manager MCP tool:** Manages a workspace's built-in variables (pageUrl, clickText, event, ...).

Technical name: `manage_built_in_variables`

## What task it solves

> I want to manage built-in variables.

Manages a workspace's built-in variables (pageUrl, clickText, event, ...).

## When to use it

Use this capability when you need “List/enable/disable built-in variables” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `account_id` — **required**. GTM account id (string).
- `container_id` — **required**. Container id (string).
- `workspace_id` — **required**. Workspace id (string).
- `action` — **required**. What to do.
- `types` — **optional**. Built-in variable types to enable/disable (required for those actions), e.g. ["pageUrl", "clickText"]. Ignored for "list".

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Google Tag Manager

The tool changes real Google Tag Manager data as described above. The server does not promise an automatic rollback.

## Example request

> List/enable/disable built-in variables in Google Tag Manager. Ask for any required identifiers that are missing.

## Errors and limitations

These are toggles, not records: action "list" returns the currently enabled ones ({ builtInVariable: [...] }), "enable" and "disable" take `types` (BuiltInVariableType enum values) and switch them on/off. Enable/disable require the tagmanager.edit.containers scope.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

There are no other dedicated tools in this group.

## Technical details

- **Impact:** changes data
- **Group:** Built-in variables
- **Description source:** `manage_built_in_variables` registration in `src/tools/builtins.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
