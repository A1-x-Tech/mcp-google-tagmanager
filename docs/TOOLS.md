# Tool reference

This is a write-capable server for the Google Tag Manager API v2. Reads pass API
responses through untransformed; writes send the resource JSON you provide. All wire
mapping (URLs, query params, snake_case → camelCase) lives in the HTTP client — tools
operate on normalized arguments only.

GTM addressing: every resource has a string id and an API-relative `path`
(`accounts/{a}/containers/{c}/workspaces/{w}/tags/{t}`), plus a `fingerprint` used for
optimistic concurrency on updates/publishes. Prefer echoing `path`/`fingerprint` from
previous responses.

## Accounts & containers

| Tool | Description |
|---|---|
| `list_accounts` | All GTM accounts visible to the credentials → `{ account[], nextPageToken }` |
| `get_account` | One account by id |
| `list_containers` | Containers of an account (includes `publicId` = GTM-XXXXXX) |
| `get_container` | One container by account + container id |
| `create_container` | New container; `usage_context` e.g. `["web"]`, `["server"]` |

## Workspaces

| Tool | Description |
|---|---|
| `list_workspaces` | Workspaces of a container. A "Default Workspace" always exists |
| `get_workspace` | One workspace |
| `create_workspace` | New draft workspace |

## Tags, triggers, variables

| Tool | Description |
|---|---|
| `list_tags` / `list_triggers` / `list_variables` | Collections of a workspace |
| `get_resource` | Generic GET of any resource by `path` (also versions, containers, ...) |
| `create_entity` | POST a tag/trigger/variable body into a workspace (`entity_type` picks the collection) |
| `update_entity` | PUT full replace by `path`; pass `fingerprint` from the last read |
| `delete_entity` | DELETE by `path` |
| `manage_built_in_variables` | `action`: `list` / `enable` / `disable`; `types` come from the BuiltInVariableType enum (116 values, generated from the discovery doc) |

## Versions & publishing

| Tool | Description |
|---|---|
| `create_version` | `POST {workspace}:create_version` — compiles the workspace into a version. The workspace is DELETED; the response's `newWorkspacePath` is the replacement. Needs the `edit.containerversions` scope |
| `publish_version` | `action=publish` (`POST {version}:publish`, needs the `publish` scope), `action=get` (one version), `action=live` (currently published version) |

Both tools convert `compilerError: true` (which the API returns with HTTP 200) into a
tool error.

## Escape hatch

`raw_request` calls any v2 path relative to `/tagmanager/v2/` with GET/POST/PUT/DELETE,
arbitrary query params (arrays = repeated keys) and a JSON body — for endpoints without
a dedicated tool (environments, folders, templates, zones, `:sync`, `version_headers`, ...).
An SSRF guard rejects any path that resolves outside the configured API origin, so the
OAuth token cannot be redirected to a foreign host. Requests still go through the rate
limiter and retry policy.

## Notes

- **Quota:** 0.25 QPS and 10,000 requests/day per project. The client serializes all
  requests ≥ 4.2 s apart and retries 429/quota-403 with backoff. Expect multi-request
  workflows to take seconds by design.
- **Scopes:** `readonly` (reads), `edit.containers` (entities/workspaces),
  `edit.containerversions` (create_version), `publish` (publish_version).
- **Ids are strings; use `path`.** Do not parse ids into numbers or hand-assemble paths.
- **PUT is full replace.** Read → modify → write back the whole object.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_TAGMANAGER_CLIENT_ID` | yes* | — | OAuth client id |
| `GOOGLE_TAGMANAGER_CLIENT_SECRET` | yes* | — | OAuth client secret |
| `GOOGLE_TAGMANAGER_REFRESH_TOKEN` | yes* | — | OAuth refresh token (exchanged automatically) |
| `GOOGLE_TAGMANAGER_ACCESS_TOKEN` | no | — | Direct access token; replaces the trio |
| `GOOGLE_TAGMANAGER_API_BASE` | no | `https://tagmanager.googleapis.com` | API root override |
| `GOOGLE_TAGMANAGER_TIMEOUT_MS` | no | `60000` | Per-request timeout |
| `GOOGLE_TAGMANAGER_MAX_RETRIES` | no | `3` | Retries on transient errors |
| `GOOGLE_TAGMANAGER_MIN_INTERVAL_MS` | no | `4200` | Minimum spacing between API requests |

\* required unless `GOOGLE_TAGMANAGER_ACCESS_TOKEN` is set.
