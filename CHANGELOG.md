# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

## [1.2.0] - 2026-09-20

### Added

- In-chat Google login via `@a1-x-tech/mcp-google-auth` — 6 new onboarding
  tools: `auth_status`, `setup_instructions`, `set_client`, `start_login`
  (deliberately not read-only), `finish_login`, `logout`. The flow is loopback
  `127.0.0.1` + PKCE against a user-owned Desktop OAuth client; the code is
  exchanged locally and the client secret never passes through the chat. Each
  tool has a capability page under `docs/capabilities/`.
- Tokens from a login are stored per server in
  `~/.config/mcp-google-tagmanager/credentials.json` (0600) and re-read on every
  call, so a login finished mid-session works without restarting the AI client.
  `GOOGLE_TAGMANAGER_OAUTH_PORT` pins the loopback listener port for SSH forwarding.
- `finish_login` verifies a fresh login against **Tag Manager API** itself rather than
  Google's identity endpoint: OIDC answers even when the API is switched off in
  the Cloud project, which would make a broken setup look connected. A 403 that
  says the API is disabled is translated into the actual fix — enable it in the
  same project as the OAuth client.

### Changed

- The client accepts the component's `TokenProvider` as a fallback token
  source: environment credentials (the refresh triple or `GOOGLE_TAGMANAGER_ACCESS_TOKEN`)
  keep absolute priority and behave exactly as before; the stored in-chat login
  is used only when the environment carries no credentials. The single 401
  re-mint + replay works for provider-backed tokens too, and is skipped when
  nothing can be re-minted.
- The unconfigured `initialize` instructions lead with the in-chat login
  (`setup_instructions` → `set_client` → `start_login` → `finish_login`, no
  restart needed); setting the environment variables + restart remains the
  documented alternative.

## [1.1.0] — 2026-08-19

### Changed

- **The server no longer exits because of configuration.** Missing credentials are a
  survivable state: the server starts, completes the MCP handshake, serves the full tool list
  and opens the `initialize` instructions with the fix (which variables to set, and that the
  server must be restarted afterwards — credentials are read from the environment only at
  startup). The first tool call then fails with that same actionable message instead of the
  client showing a dead server with no reason. A malformed setup (some credential variable
  set but no workable combination) still reports its historical reason code
  (`missing_client_id` / `missing_client_secret` / `missing_refresh_token`), but degrades the
  same way — its message is carried into the instructions — instead of killing the process
  before the handshake.

### Added

- Telemetry event `unconfigured_start` (with the same closed reason vocabulary): a server
  without credentials now survives to the MCP handshake, so a degraded start is counted
  separately instead of inflating `server_start` or dying as `startup_failed`.

## [1.0.1] — 2026-08-12

### Added

- Server instructions. The MCP `initialize` response now carries a short briefing for the calling
  model: what this API is and is not, what it cannot do, and the quotas, retry rules and misleading
  failures that should change how it is used. That knowledge previously lived only in the README,
  which a model never reads.

## [1.0.0] — 2026-08-11

### Changed

- Declared stable. The tool surface, input schemas and environment variables of 0.1.x carry over
  unchanged — this release marks API stability, not new behaviour.

## [0.1.1] — 2026-08-09

### Added
- Opt-out usage telemetry, matching the `mcp-google-*` line convention: anonymous
  `server_start` / `tool_call` / `startup_failed` events (ids/names/versions only —
  never the OAuth credentials, account/container ids or tool arguments); opt out
  with `ASKADS_TELEMETRY=0`.

## [0.1.0] — 2026-08-09

### Added
- First full release. MCP server for the Google Tag Manager API v2 with 19 tools:
  - accounts: `list_accounts`, `get_account`;
  - containers: `list_containers`, `get_container`, `create_container`;
  - workspaces: `list_workspaces`, `get_workspace`, `create_workspace`;
  - workspace entities: `list_tags`, `list_triggers`, `list_variables`,
    `get_resource`, `create_entity`, `update_entity` (PUT full replace with
    fingerprint), `delete_entity`;
  - `manage_built_in_variables` — list/enable/disable, with the full
    116-value `BuiltInVariableType` enum generated from the discovery document
    (revision 20260805);
  - versions & publishing: `create_version` (compiles a workspace; surfaces
    `newWorkspacePath` since the API deletes the source workspace) and
    `publish_version` (publish / get / live);
  - `raw_request` — escape hatch for any v2 path, with an SSRF guard.
- Google OAuth 2.0 auth: refresh-token flow (`GOOGLE_TAGMANAGER_CLIENT_ID` /
  `_CLIENT_SECRET` / `_REFRESH_TOKEN`, access tokens cached until 60 s before
  expiry) or a direct `GOOGLE_TAGMANAGER_ACCESS_TOKEN` for quick sessions.
- Built-in rate limiter for the 0.25 QPS / 25-per-100 s project quota: all API
  requests are serialized and spaced ≥ 4.2 s apart (tunable via
  `GOOGLE_TAGMANAGER_MIN_INTERVAL_MS`), with retries + backoff on 429 and
  quota-403; 5xx/network retries are gated to reads.
- `compilerError: true` with HTTP 200 (create_version/publish) is converted
  into a tool error instead of passing as success.
- Tests: unit suite with a mocked global fetch for every tool, client retry /
  throttle / SSRF coverage, OAuth token caching, plus a dist smoke test that
  performs a real MCP handshake with the built binary over stdio.
- CI (Node 20/22: typecheck + build + tests) and a daily read-only health
  check that skips itself while live-API secrets are not configured.

### Changed
- Replaced the 0.0.1 npm name-reservation stub (plain `index.js`) with the
  TypeScript/ESM implementation (`dist/index.js` binary).

[1.1.0]: https://github.com/A1-x-Tech/mcp-google-tagmanager/releases/tag/v1.1.0
[1.0.1]: https://github.com/A1-x-Tech/mcp-google-tagmanager/releases/tag/v1.0.1
[1.0.0]: https://github.com/A1-x-Tech/mcp-google-tagmanager/releases/tag/v1.0.0
[0.1.1]: https://github.com/A1-x-Tech/mcp-google-tagmanager/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/A1-x-Tech/mcp-google-tagmanager/releases/tag/v0.1.0
