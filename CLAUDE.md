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
  tools → stdio.
- `src/config.ts` — env → `TagManagerConfig`; throws `ConfigError(message, reason)`,
  never exits. Reason codes (`missing_client_id`, `missing_client_secret`,
  `missing_refresh_token`) are pinned by config.test.ts.
- `src/auth.ts` — `TokenProvider`: refresh-token → access-token exchange, promise-shared,
  cached until expiry − 60 s; direct access token passes through. Token calls bypass the
  rate limiter (different quota).
- `src/client.ts` — ALL HTTP: URL building under `/tagmanager/v2/`, Bearer auth,
  SSRF guard, timeout covering body reads, the rate limiter and the retry policy.
  One typed method per endpoint; tools never build URLs.
- `src/builtin-variable-types.ts` — generated from the discovery doc; do not hand-edit.
- `src/tools/*.ts` — `register<Domain>Tools(server, client)`; handlers are always
  `try { ok(await client...) } catch (e) { fail(e) }`.
- `src/telemetry.ts` — anonymous usage pings (ids/names/versions only, never the
  OAuth credentials, account/container ids or arguments; fire-and-forget, must never
  block or throw; opt-out `ASKADS_TELEMETRY=0`). `startup_failed` is the exception:
  `sendBlocking` awaits it, because the caller exits right after. Its `reason` is the
  `ConfigError` code vocabulary (`missing_client_id`, `missing_client_secret`,
  `missing_refresh_token`) — never a variable's value.

## Conventions (do not break)

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

1. Add a typed method to `src/client.ts` (URL + body mapping there).
2. Register the tool in the matching `src/tools/<domain>.ts` with title, annotations,
   a thorough description (the LLM reads only this) and zod fields with `.describe()`.
3. Pin its annotations in `tools/annotations.test.ts` and add it to the dist smoke list.
4. Add a mock-fetch test in the domain's test file.
5. Document it in README.md and docs/TOOLS.md.

## Releasing

Version lives in THREE places and must match byte-for-byte: `package.json.version`,
`server.json.version` and `server.json.packages[0].version`. See docs/PUBLISHING.md.
