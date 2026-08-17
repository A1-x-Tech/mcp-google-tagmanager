# Google Tag Manager: Publish, inspect or fetch the live container version — MCP tool

**Google Tag Manager MCP tool:** Container-version operations.

Technical name: `publish_version`

## What task it solves

> I want to manage the live container version.

Container-version operations.

## When to use it

Use this capability when you need “Publish, inspect or fetch the live container version” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `account_id` — **required**. GTM account id (string).
- `container_id` — **required**. Container id (string).
- `action` — **required**. What to do.
- `version_id` — **optional**. Container version id (string). Required for "publish" and "get"; ignored for "live".
- `fingerprint` — **optional**. The version's last-seen fingerprint ("publish" only), for optimistic-concurrency safety.

## What it returns

Returns the ContainerVersion (publish wraps it as { containerVersion, compilerError }).

## What changes in Google Tag Manager

The source marks the entire “Publish, inspect or fetch the live container version” call as destructive. The exact effect depends on the selected action and is described below; review the parameters and reversibility before calling it.

## Example request

> Publish, inspect or fetch the live container version in Google Tag Manager. Ask for any required identifiers that are missing. Show me the exact change and wait for confirmation first.

## Errors and limitations

action "publish" pushes a version live (replacing the currently published one; requires the tagmanager.publish scope; version_id required, fingerprint recommended). action "get" fetches one version by version_id. action "live" fetches the currently published version of the container (no version_id needed). Publish responses can carry compilerError=true with HTTP 200 — reported as an error.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Create a container version from a workspace](./create-version.md) — `create_version`

## Technical details

- **Impact:** destructive operation
- **Group:** Versions and publishing
- **Description source:** `publish_version` registration in `src/tools/versions.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
