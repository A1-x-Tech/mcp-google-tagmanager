# Google Tag Manager MCP

[![npm](https://img.shields.io/npm/v/mcp-google-tagmanager)](https://www.npmjs.com/package/mcp-google-tagmanager)
[![CI](https://github.com/A1-x-Tech/mcp-google-tagmanager/actions/workflows/ci.yml/badge.svg)](https://github.com/A1-x-Tech/mcp-google-tagmanager/actions/workflows/ci.yml)
[![Glama](https://glama.ai/mcp/servers/A1-x-Tech/mcp-google-tagmanager/badges/score.svg)](https://glama.ai/mcp/servers/A1-x-Tech/mcp-google-tagmanager)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

MCP server for the **Google Tag Manager API v2**: manage containers, workspaces, tags,
triggers, variables and publishing from Claude, Cursor, Codex and other AI clients in
natural language.

Ask the assistant to audit a container, wire up a new GA4 tag with its trigger, enable
built-in variables, compile a version and push it live — the full GTM workflow without
clicking through the web UI.

## Quick start

1. [Get OAuth credentials](#getting-credentials) for a Google Cloud project with the Tag Manager API enabled.
2. Add the server — for example in Claude Code ([other clients](#installation)):

   ```bash
   claude mcp add google-tagmanager \
     -e GOOGLE_TAGMANAGER_CLIENT_ID=your_client_id \
     -e GOOGLE_TAGMANAGER_CLIENT_SECRET=your_client_secret \
     -e GOOGLE_TAGMANAGER_REFRESH_TOKEN=your_refresh_token \
     -- npx -y mcp-google-tagmanager
   ```

3. Ask the assistant: "List my GTM containers and show which tags fire on page view."

## Tools

| Tool | Description |
|---|---|
| `list_accounts` | List all GTM accounts the user can access |
| `get_account` | Get one account |
| `list_containers` | List containers of an account (with `GTM-XXXXXX` public ids) |
| `get_container` | Get one container |
| `create_container` | Create a container (`web`, `server`, ...) |
| `list_workspaces` | List workspaces of a container |
| `get_workspace` | Get one workspace |
| `create_workspace` | Create a workspace (draft) |
| `list_tags` | List tags of a workspace |
| `list_triggers` | List triggers of a workspace |
| `list_variables` | List user-defined variables of a workspace |
| `get_resource` | Get any resource by its API path (tag, trigger, variable, version, ...) |
| `create_entity` | Create a tag, trigger or variable |
| `update_entity` | Update a tag/trigger/variable (PUT full replace, fingerprint-guarded) |
| `delete_entity` | Delete a tag/trigger/variable |
| `manage_built_in_variables` | List / enable / disable built-in variables (full enum from the discovery doc) |
| `create_version` | Compile a workspace into a container version (⚠️ deletes the workspace) |
| `publish_version` | Publish a version, get one version, or fetch the live version |
| `raw_request` | Escape hatch: call any Tag Manager API v2 path directly |

## Built-in rate limiting

The Tag Manager API quota is unusually strict: **0.25 QPS per project** (25 requests per
100-second sliding window) and 10,000 requests per day. The server handles this for you:

- every API request goes through a serialized queue with a minimum spacing of
  **4.2 s** between requests (tunable via `GOOGLE_TAGMANAGER_MIN_INTERVAL_MS`);
- `429` and quota-`403` (`rateLimitExceeded` / `userRateLimitExceeded` / `quotaExceeded`)
  responses are retried with exponential backoff honoring `Retry-After`;
- `5xx` and network errors are retried for reads only — a write that may have committed
  is never replayed.

Big fan-out requests ("list everything in every container") will therefore be slow by
design — that is the quota, not the server.

## Example prompts

- "Which tags in container GTM-ABC123 fire on the page-view trigger?"
- "Create a Custom HTML tag in the default workspace that logs to the console, firing on all pages."
- "Enable the clickText and clickClasses built-in variables in my workspace."
- "Compile my workspace into a version named 'March release' and publish it."

## Installation

<details open>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add google-tagmanager \
  -e GOOGLE_TAGMANAGER_CLIENT_ID=your_client_id \
  -e GOOGLE_TAGMANAGER_CLIENT_SECRET=your_client_secret \
  -e GOOGLE_TAGMANAGER_REFRESH_TOKEN=your_refresh_token \
  -- npx -y mcp-google-tagmanager
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

`claude_desktop_config.json` — macOS `~/Library/Application Support/Claude/`, Windows `%APPDATA%\Claude\`

```json
{
  "mcpServers": {
    "google-tagmanager": {
      "command": "npx",
      "args": ["-y", "mcp-google-tagmanager"],
      "env": {
        "GOOGLE_TAGMANAGER_CLIENT_ID": "your_client_id",
        "GOOGLE_TAGMANAGER_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_TAGMANAGER_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Cursor</b></summary>

`~/.cursor/mcp.json` (or `.cursor/mcp.json` in the project)

```json
{
  "mcpServers": {
    "google-tagmanager": {
      "command": "npx",
      "args": ["-y", "mcp-google-tagmanager"],
      "env": {
        "GOOGLE_TAGMANAGER_CLIENT_ID": "your_client_id",
        "GOOGLE_TAGMANAGER_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_TAGMANAGER_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

</details>

For a quick one-off session you can skip the trio and pass a short-lived token directly:
`GOOGLE_TAGMANAGER_ACCESS_TOKEN=ya29....` (Google access tokens expire after about an
hour and are not refreshed automatically).

## Getting credentials

The Tag Manager API only supports OAuth 2.0 — there are no API keys for user data. One-time setup:

1. **Create/pick a Google Cloud project** at [console.cloud.google.com](https://console.cloud.google.com)
   and enable the **Tag Manager API** ([direct link](https://console.cloud.google.com/apis/library/tagmanager.googleapis.com)).
   Without a registered project the API grants **zero quota** — this step is mandatory.
2. **Configure the OAuth consent screen** (APIs & Services → OAuth consent screen).
   For personal use, External + your account as a test user is enough.
3. **Create an OAuth client** (APIs & Services → Credentials → Create credentials →
   OAuth client ID → *Desktop app* or *Web application*). Save the **client id** and **client secret**.
4. **Mint a refresh token.** The easiest path is the
   [OAuth 2.0 Playground](https://developers.google.com/oauthplayground):
   - gear icon → check *Use your own OAuth credentials* → paste the client id/secret
     (for a Web client also add `https://developers.google.com/oauthplayground` to its
     authorized redirect URIs);
   - in Step 1 authorize these scopes (space-separated):

     ```
     https://www.googleapis.com/auth/tagmanager.readonly https://www.googleapis.com/auth/tagmanager.edit.containers https://www.googleapis.com/auth/tagmanager.edit.containerversions https://www.googleapis.com/auth/tagmanager.publish
     ```

   - in Step 2 click *Exchange authorization code for tokens* and copy the **refresh token**.
5. Put the three values into the environment variables above. The server exchanges the
   refresh token for access tokens automatically and caches them until just before expiry.

> ⚠️ The credentials are stored as plain text in your client's MCP config. Scope the OAuth
> consent to the four Tag Manager scopes above and nothing else.
>
> Note the scope split: reading needs `readonly`, editing needs `edit.containers`,
> `create_version` needs `edit.containerversions`, and publishing needs `publish`.
> Authorize all four at once or re-consent mid-flow.

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_TAGMANAGER_CLIENT_ID` | yes* | — | OAuth client id |
| `GOOGLE_TAGMANAGER_CLIENT_SECRET` | yes* | — | OAuth client secret |
| `GOOGLE_TAGMANAGER_REFRESH_TOKEN` | yes* | — | OAuth refresh token |
| `GOOGLE_TAGMANAGER_ACCESS_TOKEN` | no | — | Ready-made access token; replaces the trio for quick sessions |
| `GOOGLE_TAGMANAGER_API_BASE` | no | `https://tagmanager.googleapis.com` | API root override |
| `GOOGLE_TAGMANAGER_TIMEOUT_MS` | no | `60000` | Per-request timeout |
| `GOOGLE_TAGMANAGER_MAX_RETRIES` | no | `3` | Retries on transient errors |
| `GOOGLE_TAGMANAGER_MIN_INTERVAL_MS` | no | `4200` | Minimum spacing between API requests (0.25 QPS quota) |

\* the trio is required unless `GOOGLE_TAGMANAGER_ACCESS_TOKEN` is set.

## Good to know

- **`create_version` deletes the source workspace.** The response's `newWorkspacePath`
  points to the automatically created replacement — the server surfaces it and the tool
  description warns the model, but keep it in mind when scripting.
- **`compilerError: true` can arrive with HTTP 200** on `create_version` and publish.
  The server converts it into a tool error so it is never mistaken for success.
- **Updates are full replacements** (PUT, not PATCH): `update_entity` expects the complete
  resource. Fetch with `get_resource`, edit, send back, and pass the `fingerprint` for
  optimistic-concurrency safety.
- **All ids are strings**, and every resource carries its own `path` field — echo it back
  rather than assembling paths by hand.

## Requirements

- Node.js >= 20
- A Google account with access to at least one GTM container

## Documentation

- [docs/TOOLS.md](docs/TOOLS.md) — tool reference
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — architecture and dev commands
- [docs/PUBLISHING.md](docs/PUBLISHING.md) — release checklist
- [Google Tag Manager API v2 reference](https://developers.google.com/tag-platform/tag-manager/api/reference/rest)

## Support

Questions and issues → [GitHub Issues](https://github.com/A1-x-Tech/mcp-google-tagmanager/issues)
or Telegram [@gistrec](https://t.me/gistrec).

## License

[MIT](./LICENSE)
