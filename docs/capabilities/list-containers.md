# Google Tag Manager: List containers — MCP tool

**Google Tag Manager MCP tool:** Lists the containers of a GTM account.

Technical name: `list_containers`

## What task it solves

> I want to list containers.

Lists the containers of a GTM account.

## When to use it

Use this capability when you need “List containers” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `account_id` — **required**. GTM account id (string).
- `page_token` — **optional**. Pagination token from a previous response's nextPageToken. Omit for the first page.

## What it returns

Returns { container: [{ containerId, name, publicId (e.g.

## What changes in Google Tag Manager

The tool reads Google Tag Manager data and does not change it.

## Example request

> List containers in Google Tag Manager. Ask for any required identifiers that are missing.

## Errors and limitations

GTM-XXXXXX), usageContext, path, fingerprint, tagManagerUrl }], nextPageToken }.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create a container](./create-container.md) — `create_container`
- [Get a container](./get-container.md) — `get_container`

## Technical details

- **Impact:** read-only
- **Group:** Containers
- **Description source:** `list_containers` registration in `src/tools/containers.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
