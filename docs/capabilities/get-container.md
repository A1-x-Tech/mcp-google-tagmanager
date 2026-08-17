# Google Tag Manager: Get a container — MCP tool

**Google Tag Manager MCP tool:** Gets one container by account id + container id.

Technical name: `get_container`

## What task it solves

> I want to get a container.

Gets one container by account id + container id.

## When to use it

Use this capability when you need “Get a container” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `account_id` — **required**. GTM account id (string).
- `container_id` — **required**. Container id (string), e.g. from list_containers.

## What it returns

Returns the Container resource including publicId (the GTM-XXXXXX snippet id), usageContext and fingerprint.

## What changes in Google Tag Manager

The tool reads Google Tag Manager data and does not change it.

## Example request

> Get a container in Google Tag Manager. Ask for any required identifiers that are missing.

## Errors and limitations

Check required parameters, token permissions, and current upstream API limits.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create a container](./create-container.md) — `create_container`
- [List containers](./list-containers.md) — `list_containers`

## Technical details

- **Impact:** read-only
- **Group:** Containers
- **Description source:** `get_container` registration in `src/tools/containers.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
