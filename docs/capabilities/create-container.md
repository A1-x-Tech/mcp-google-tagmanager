# Google Tag Manager: Create a container — MCP tool

**Google Tag Manager MCP tool:** Creates a new container in a GTM account.

Technical name: `create_container`

## What task it solves

> I want to create a container.

Creates a new container in a GTM account.

## When to use it

Use this capability when you need “Create a container” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `account_id` — **required**. GTM account id (string).
- `name` — **required**. Display name of the new container.
- `usage_context` — **required**. Usage contexts, e.g. ["web"]. Other documented values: androidSdk5, iosSdk5, server.

## What it returns

Returns the created Container with its server-assigned containerId and publicId.

## What changes in Google Tag Manager

The tool changes real Google Tag Manager data as described above. The server does not promise an automatic rollback.

## Example request

> Create a container in Google Tag Manager. Ask for any required identifiers that are missing.

## Errors and limitations

usage_context declares the platform, e.g. ["web"]; other values include androidSdk5, iosSdk5, server. Requires the tagmanager.edit.containers scope.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Get a container](./get-container.md) — `get_container`
- [List containers](./list-containers.md) — `list_containers`

## Technical details

- **Impact:** changes data
- **Group:** Containers
- **Description source:** `create_container` registration in `src/tools/containers.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
