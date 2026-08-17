# Google Tag Manager: Raw Tag Manager API call — MCP tool

**Google Tag Manager MCP tool:** Escape hatch to call any Google Tag Manager API v2 path directly, for endpoints without a dedicated tool (environments, folders, templates, zones, workspace :sync / :quick_preview, version_headers, ...).

Technical name: `raw_request`

## What task it solves

> I want to raw Tag Manager API call.

Escape hatch to call any Google Tag Manager API v2 path directly, for endpoints without a dedicated tool (environments, folders, templates, zones, workspace :sync / :quick_preview, version_headers, ...).

## When to use it

Use this capability when you need “Raw Tag Manager API call” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `path` — **required**. API path relative to /tagmanager/v2/, e.g. "accounts/1/containers/2/version_headers".
- `method` — **optional**. HTTP method. Defaults to GET.
- `query` — **optional**. Query parameters; use an array for repeated keys, e.g. { "type": ["pageUrl", "event"] }.
- `body` — **optional**. JSON request body (POST/PUT).

## What it returns

Returns compact JSON from the upstream API or a clear MCP tool error. The exact fields depend on the operation and are documented in the technical reference.

## What changes in Google Tag Manager

The source marks the entire “Raw Tag Manager API call” call as destructive. The exact effect depends on the selected action and is described below; review the parameters and reversibility before calling it.

## Example request

> Raw Tag Manager API call in Google Tag Manager. Ask for any required identifiers that are missing. Show me the exact change and wait for confirmation first.

## Errors and limitations

`path` is relative to /tagmanager/v2/, e.g. "accounts/1/containers/2/environments". `query` values may be arrays for repeated params. Requests go through the same OAuth, rate limiter and retries as every other tool.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

There are no other dedicated tools in this group.

## Technical details

- **Impact:** destructive operation
- **Group:** Additional API methods
- **Description source:** `raw_request` registration in `src/tools/raw.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
