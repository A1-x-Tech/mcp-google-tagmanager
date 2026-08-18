# CLAUDE.md

MCP server (stdio) for the Google Tag Manager API v2 (`tagmanager.googleapis.com/tagmanager/v2`).
Auth is Google OAuth 2.0: a refresh-token trio exchanged at `oauth2.googleapis.com/token`
(cached until 60 s before expiry) or a direct access token. TypeScript, ESM,
`@modelcontextprotocol/sdk` + `zod`, Node >= 20.

## Commands

- `npm run typecheck` — tsc over src including tests (tsconfig.check.json)
- `npm run build` — compile to dist/ (tests and smoke excluded)
- `npm test` — unit suite (tsx loader) + dist smoke (real stdio handshake)
- `npm run smoke` — live read-only check (needs real credentials)
- `npm run dev` — tsx watch

## Architecture

- `src/index.ts` — wiring only: telemetry → config → client → McpServer → register
  tools → stdio. `loadConfigOrDegraded()` catches `ConfigError`, pings `startup_failed`
  (fire-and-forget) and degrades the config to "no credentials"; an unconfigured start
  prepends `UNCONFIGURED_PREFIX` — plus `Configuration problem: <message>` when a
  ConfigError was caught — to the initialize `instructions`, and `oninitialized` sends
  `server_start` for a configured install or `unconfigured_start` (with the reason)
  otherwise.
- `src/config.ts` — env → `TagManagerConfig`; never exits. No credentials at all
  (empty string = missing) is NOT an error: the fields stay `undefined` and the server
  starts degraded. A partial setup still throws `ConfigError(message, reason)` with the
  historical per-variable checks; the reason codes (`missing_client_id`,
  `missing_client_secret`, `missing_refresh_token`) are pinned by config.test.ts. Also
  home to `CredentialsError` / `MISSING_CREDENTIALS_MESSAGE` (opens with the historical
  startup error verbatim, then says to set the variables and restart) and
  `hasCredentials()`.
- `src/auth.ts` — `TokenProvider`: refresh-token → access-token exchange, promise-shared,
  cached until expiry − 60 s; direct access token passes through. Token calls bypass the
  rate limiter (different quota). With no credentials at all it throws `CredentialsError`
  BEFORE any fetch — a degraded start must never reach the token endpoint or the retry
  loop.
- `src/client.ts` — ALL HTTP: URL building under `/tagmanager/v2/`, Bearer auth,
  SSRF guard, timeout covering body reads, the rate limiter and the retry policy.
  One typed method per endpoint; tools never build URLs.
- `src/builtin-variable-types.ts` — generated from the discovery doc; do not hand-edit.
- `src/tools/*.ts` — `register<Domain>Tools(server, client)`; handlers are always
  `try { ok(await client...) } catch (e) { fail(e) }`.
- `src/telemetry.ts` — anonymous usage pings (ids/names/versions only, never the
  OAuth credentials, account/container ids or arguments; fire-and-forget, must never
  block or throw; opt-out `ASKADS_TELEMETRY=0`). `server_start` means "a usable install
  started"; `unconfigured_start` is a degraded start and `startup_failed` a malformed
  config caught at load — both carry a `reason` from the `ConfigError` code vocabulary
  (`missing_client_id`, `missing_client_secret`, `missing_refresh_token`) — never a
  variable's value.

## Conventions (do not break)

- **Never exit because of configuration.** A server that dies before the MCP handshake
  leaves the user with a red cross and no reason — telemetry across this line of servers
  showed that state accounted for nearly every unconfigured install, and almost none of
  them recovered. Missing credentials are a survivable state: start, answer initialize
  (with the unconfigured prefix in `instructions`) and tools/list, and let the first tool
  call fail with `CredentialsError` — its message names the fix and says to restart,
  because credentials come only from the environment. `config.test.ts`, `client.test.ts`
  and `test/dist-smoke.test.js` pin this.
- **Credential failures are not transport failures.** `CredentialsError` fires in
  `TokenProvider.getAccessToken()` before any fetch: it must never enter the retry/backoff
  loop, reach the token endpoint or burn GTM quota, because no amount of retrying mints
  credentials. The fix is an operator action (set the env variables) plus a restart.
- **The rate limiter is a correctness feature.** GTM's quota is 0.25 QPS per project;
  every API request must go through `request()`'s serialized queue. Never add a code
  path that fetches the API directly.
- **Write retries are gated.** 429/quota-403 are retryable for all methods ("not
  executed"); 5xx/network only for GET — a committed write must not be replayed.
- Wire mapping lives in the client, not the tools (snake_case tool args → camelCase
  API fields, entity_type → collection path).
- `compilerError: true` with HTTP 200 (create_version/publish) must surface as a tool
  error (`okUnlessCompilerError` in tools/versions.ts).
- Annotations: all four hints on every tool, pinned as a full map in
  `tools/annotations.test.ts`. create_version and publish_version are destructive
  (workspace deletion / live replacement).
- zod `inputSchema` is a plain object of fields (no `z.object()`); shared shapes are
  factories (util.ts) to avoid `$ref` dedup in the JSON schema.
- Output compact JSON via `ok` — the consumer is an LLM; pretty-printing burns tokens.
- All ids are strings; resources are addressed by their `path` field.
- Errors return as `isError` results, never thrown out of a handler.

## Adding a tool

Before changing the tool registry, read [the MCP capability documentation contract](docs/CAPABILITY-DOCUMENTATION.md). Every registered tool must have exactly one task-oriented page in `docs/capabilities/`; update that page, the index, and the coverage test in the same change.

1. Add a typed method to `src/client.ts` (URL + body mapping there).
2. Register the tool in the matching `src/tools/<domain>.ts` with title, annotations,
   a thorough description (the LLM reads only this) and zod fields with `.describe()`.
3. Pin its annotations in `tools/annotations.test.ts` and add it to the dist smoke list.
4. Add a mock-fetch test in the domain's test file.
5. Document it in README.md and docs/TOOLS.md.

## Releasing

Version lives in THREE places and must match byte-for-byte: `package.json.version`,
`server.json.version` and `server.json.packages[0].version`. See docs/PUBLISHING.md.
