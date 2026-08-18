# Development

TypeScript + ESM, `@modelcontextprotocol/sdk` + `zod`, Node >= 20, stdio transport.
Tests are `node:test` + `node:assert/strict`, run through the tsx loader — the whole
unit suite works offline with `globalThis.fetch` mocked.

## Commands

```bash
npm run typecheck   # tsc over src incl. tests (tsconfig.check.json, noEmit)
npm run build       # compile src → dist (tests and smoke excluded)
npm test            # unit suite + dist smoke (builds first)
npm run smoke       # live read-only check: lists GTM accounts (needs credentials)
npm run dev         # tsx watch src/index.ts
```

## Layout

```
src/
  index.ts                  # wiring: config → client → server → tools → stdio
  config.ts                 # env → TagManagerConfig; throws ConfigError(reason)
  auth.ts                   # TokenProvider: refresh-token → access-token, cached
  client.ts                 # all HTTP: rate limiter, retries, SSRF guard, timeout
  types.ts                  # config type, TagManagerError, quota-403 detection
  builtin-variable-types.ts # generated from the discovery doc — do not hand-edit
  smoke.ts                  # live smoke (excluded from the build)
  tools/                    # register*Tools(server, client) per domain + util.ts
test/dist-smoke.test.js     # real MCP handshake with dist/index.js over stdio
```

## Testing strategy

- `client.test.ts` — real client + mocked fetch: URLs, auth header, query building,
  the retry matrix (429 / quota-403 / 5xx / network × read / write), the throttle
  (serialization + spacing, also across retries), timeout, SSRF guard.
- `auth.test.ts` — token exchange body, caching, expiry margin, shared in-flight
  refresh, error paths.
- `tools/*.test.ts` — every tool runs through a REAL client with fetch mocked
  (`tools/harness.test.ts`), asserting the exact wire request it produces and that
  client errors surface as `isError` results.
- `tools/annotations.test.ts` — pins the full tool list and all four hints per tool.
- `test/dist-smoke.test.js` — spawns the built binary, performs a real MCP
  handshake over stdio via the SDK client, and checks the advertised tool list.

## Usage telemetry

The server sends anonymous events to `usage.gistrec.cloud` (`server_start` when a
client connects to a configured install, `unconfigured_start` when a client connects
to a server without credentials, `tool_call` with the tool **name**, and
`startup_failed` with a fixed-vocabulary reason code when the configuration is
malformed) to count active installs and tool demand. An event carries only de-identified technical fields: a random
installation id (`~/.config/mcp-google-tagmanager/instance-id`), the package
version, the AI client's name and version from the MCP handshake, the Node.js
version and the OS.

The OAuth credentials, account/container ids and paths, tool arguments and
prompts are never sent or stored (implementation: `src/telemetry.ts`). Sends run
in the background with a 2-second cap and are silently skipped on any error. Opt
out for every MCP server by this author at once: `ASKADS_TELEMETRY=0`.

## Refreshing the built-in variable enum

`src/builtin-variable-types.ts` is generated from
`https://www.googleapis.com/discovery/v1/apis/tagmanager/v2/rest`
(the `type` query parameter enum of the built_in_variables methods), minus
`builtInVariableTypeUnspecified`. When Google ships new built-ins, regenerate the
array from the discovery doc and update the revision noted in the file header.
