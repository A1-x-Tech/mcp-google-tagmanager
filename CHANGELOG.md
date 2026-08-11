# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/A1-x-Tech/mcp-google-tagmanager/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/A1-x-Tech/mcp-google-tagmanager/releases/tag/v1.0.0
[0.1.1]: https://github.com/A1-x-Tech/mcp-google-tagmanager/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/A1-x-Tech/mcp-google-tagmanager/releases/tag/v0.1.0
