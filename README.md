# <img src="./assets/a1-logo.svg" alt="A1" width="40"> Google Tag Manager MCP

**English** | [Русский](./README.ru.md)

[![npm](https://img.shields.io/npm/v/mcp-google-tagmanager)](https://www.npmjs.com/package/mcp-google-tagmanager)
[![CI](https://github.com/A1-x-Tech/mcp-google-tagmanager/actions/workflows/ci.yml/badge.svg)](https://github.com/A1-x-Tech/mcp-google-tagmanager/actions/workflows/ci.yml)
[![Glama](https://glama.ai/mcp/servers/A1-x-Tech/mcp-google-tagmanager/badges/score.svg)](https://glama.ai/mcp/servers/A1-x-Tech/mcp-google-tagmanager)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**A1 Google Tag Manager MCP** lets an AI app inspect and manage Google Tag Manager containers in plain language. See what fires on a page, work with tags, triggers and variables in a draft workspace, then deliberately compile and publish a version when you are ready.

It connects to the Google Tag Manager API v2 through your Google account. The difference from asking an AI to guess a GTM setup is that it works with the actual container, workspace and version you choose.

- **19 tools.** 10 operations only read GTM data; 4 create drafts or change built-in variables; 5 can alter, delete, compile or publish live configuration.
- **Draft first.** Tags, triggers and variables are created in a workspace. Publishing is a separate, explicitly destructive operation.
- **Quota-aware.** GTM permits 0.25 requests per second per project; the server spaces requests by at least 4.2 seconds instead of overwhelming the API.
- **Your Google access.** The server uses your OAuth credentials and requests only the Tag Manager scopes needed for reading, editing, versioning and publishing.

Start with a read-only question:

> Which tags in my containers fire on the page-view trigger?

[Connect the server](#quick-start) · [Explore use cases](#what-you-can-ask-it-to-do) · [Open technical documentation](#technical-documentation)

---

## See it work in a minute

> **You:** List my GTM containers and show which tags fire on page view.
>
> **Assistant:** Lists the containers, their workspaces, relevant triggers and the tags attached to them. Nothing changes.
>
> **You:** In the Default Workspace of `GTM-ABC123`, prepare a GA4 configuration tag for measurement ID `G-XXXXXXX` on all pages.
>
> **Assistant:** Shows the workspace, proposed tag and trigger configuration, then asks for confirmation before creating the draft.
>
> **You:** Confirm the draft.
>
> **Assistant:** Creates the tag in the workspace. It does not publish the container; compiling and publishing a version remains a separate step.

## Contents

- [Quick start](#quick-start)
- [What you can ask it to do](#what-you-can-ask-it-to-do)
- [How GTM changes are connected](#how-gtm-changes-are-connected)
- [What can change](#what-can-change)
- [Getting access](#getting-access)
- [Configuration](#configuration)
- [Data and telemetry](#data-and-telemetry)
- [Limits and background work](#limits-and-background-work)
- [Technical documentation](#technical-documentation)
- [Support](#support)

## Quick start

You need Node.js 20+, a Google account with access to a GTM container and OAuth credentials from a Google Cloud project where the Tag Manager API is enabled.

1. [Prepare Google OAuth access](#getting-access).
2. Add the server to your AI app.
3. Start with the read-only question above.

<details open>
<summary><strong>Codex</strong></summary>

<br>

**In the app:**

1. Open **Settings → Plugins → MCP servers**.
2. Select **Add server**.
3. Add `npx -y mcp-google-tagmanager@latest` and the three environment variables below.

| Variable | Value |
|---|---|
| `GOOGLE_TAGMANAGER_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_TAGMANAGER_CLIENT_SECRET` | Your Google OAuth client secret |
| `GOOGLE_TAGMANAGER_REFRESH_TOKEN` | Your Google OAuth refresh token |

**From the command line:**

```bash
codex mcp add google-tagmanager \
  --env GOOGLE_TAGMANAGER_CLIENT_ID=your_client_id \
  --env GOOGLE_TAGMANAGER_CLIENT_SECRET=your_client_secret \
  --env GOOGLE_TAGMANAGER_REFRESH_TOKEN=your_refresh_token \
  -- npx -y mcp-google-tagmanager@latest
```

```bash
codex mcp list
```

[Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)

</details>

<details>
<summary><strong>Claude Code</strong></summary>

<br>

```bash
claude mcp add \
  --env GOOGLE_TAGMANAGER_CLIENT_ID=your_client_id \
  --env GOOGLE_TAGMANAGER_CLIENT_SECRET=your_client_secret \
  --env GOOGLE_TAGMANAGER_REFRESH_TOKEN=your_refresh_token \
  --transport stdio \
  --scope user \
  google-tagmanager \
  -- npx -y mcp-google-tagmanager@latest
```

```bash
claude mcp list
```

[Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

<br>

1. Open **Settings → Developer → Edit Config**.
2. Add this entry to `mcpServers`:

```json
{
  "mcpServers": {
    "google-tagmanager": {
      "command": "npx",
      "args": ["-y", "mcp-google-tagmanager@latest"],
      "env": {
        "GOOGLE_TAGMANAGER_CLIENT_ID": "your_client_id",
        "GOOGLE_TAGMANAGER_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_TAGMANAGER_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

If **Edit Config** is unavailable, edit `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows.

[Claude Desktop MCP documentation](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)

</details>

<details>
<summary><strong>Cursor</strong></summary>

<br>

Add a user-level server to `~/.cursor/mcp.json` on macOS/Linux or `%USERPROFILE%\.cursor\mcp.json` on Windows:

```json
{
  "mcpServers": {
    "google-tagmanager": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-google-tagmanager@latest"],
      "env": {
        "GOOGLE_TAGMANAGER_CLIENT_ID": "your_client_id",
        "GOOGLE_TAGMANAGER_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_TAGMANAGER_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

[Cursor MCP documentation](https://cursor.com/docs/mcp)

</details>

<details>
<summary><strong>VS Code</strong></summary>

<br>

Run **MCP: Open User Configuration** from the Command Palette and add:

```json
{
  "servers": {
    "google-tagmanager": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-google-tagmanager@latest"],
      "env": {
        "GOOGLE_TAGMANAGER_CLIENT_ID": "${input:gtm_client_id}",
        "GOOGLE_TAGMANAGER_CLIENT_SECRET": "${input:gtm_client_secret}",
        "GOOGLE_TAGMANAGER_REFRESH_TOKEN": "${input:gtm_refresh_token}"
      }
    }
  },
  "inputs": [
    { "type": "promptString", "id": "gtm_client_id", "description": "Google OAuth client ID" },
    { "type": "promptString", "id": "gtm_client_secret", "description": "Google OAuth client secret", "password": true },
    { "type": "promptString", "id": "gtm_refresh_token", "description": "Google OAuth refresh token", "password": true }
  ]
}
```

Check it with **MCP: List Servers**.

[VS Code MCP documentation](https://code.visualstudio.com/docs/agent-customization/mcp-servers)

</details>

## What you can ask it to do

### Understand the current setup

- List the GTM accounts and containers I can access.
- Which tags fire on page view in this workspace?
- Show the trigger and variable configuration for this tag.
- Which built-in variables are enabled?

### Prepare tracking changes in a draft

- Create a workspace for the checkout tracking change.
- Prepare a GA4 tag and a trigger for a specific event.
- Enable the click variables needed for this trigger.
- Update this tag after showing me the complete replacement configuration.

### Release a version deliberately

- Compile this workspace into a version named `April release`.
- Show the compiler errors, if any.
- Publish version `42` after I confirm the version and its changes.

## How GTM changes are connected

GTM has a clear release path:

1. An **account** contains one or more **containers**.
2. A container has **workspaces** for draft changes.
3. Tags, triggers and variables belong to a workspace.
4. Compiling a workspace creates a **container version** and removes the source workspace. GTM provides a replacement workspace.
5. Publishing makes a selected container version live.

This server can inspect each step. It does not treat a draft as a release: version creation and publishing are separate operations.

## What can change

| Operation | What happens | Confirmation boundary |
|---|---|---|
| List accounts, containers, workspaces, tags, triggers, variables and versions | Reads GTM configuration | No change |
| Create a container or workspace | Adds a new GTM object | Changes GTM |
| Create a tag, trigger or variable | Adds a draft object to a workspace | Changes a draft workspace |
| Enable or disable built-in variables | Changes the workspace configuration | Changes a draft workspace |
| Update a tag, trigger or variable | Replaces the complete resource, protected by its fingerprint | Potentially destructive |
| Delete a tag, trigger or variable | Removes the selected object | Destructive |
| Compile a workspace | Creates a version and deletes the source workspace | Destructive |
| Publish a version | Makes a selected version live | Destructive |
| Raw API request | Can call API methods without a dedicated tool | Potentially destructive |

The AI client decides how it asks for confirmation. The server marks read-only, write and destructive operations so the client can distinguish inspection from a real change.

## Getting access

The server uses Google OAuth 2.0. Google Tag Manager does not provide API keys for this user data.

1. Create or select a Google Cloud project and enable the [Tag Manager API](https://console.cloud.google.com/apis/library/tagmanager.googleapis.com). A project without that API enabled receives no quota.
2. Configure the OAuth consent screen and create an OAuth client. A **Desktop app** client is suitable for local use.
3. Authorize your Google account and obtain a refresh token. The [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) can do this if you enable **Use your own OAuth credentials**.
4. Request these scopes together:

   ```text
   https://www.googleapis.com/auth/tagmanager.readonly
   https://www.googleapis.com/auth/tagmanager.edit.containers
   https://www.googleapis.com/auth/tagmanager.edit.containerversions
   https://www.googleapis.com/auth/tagmanager.publish
   ```

The scopes are separate: reading, editing, compiling versions and publishing each need their corresponding permission. Treat the client secret and refresh token as passwords.

## Configuration

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_TAGMANAGER_CLIENT_ID` | Yes* | OAuth client ID. |
| `GOOGLE_TAGMANAGER_CLIENT_SECRET` | Yes* | OAuth client secret. |
| `GOOGLE_TAGMANAGER_REFRESH_TOKEN` | Yes* | OAuth refresh token. |
| `GOOGLE_TAGMANAGER_ACCESS_TOKEN` | Yes* | Short-lived alternative to the OAuth trio. |
| `GOOGLE_TAGMANAGER_API_BASE` | No | Tag Manager API base URL override. |
| `GOOGLE_TAGMANAGER_TIMEOUT_MS` | No | Per-request timeout; default `60000` ms. |
| `GOOGLE_TAGMANAGER_MAX_RETRIES` | No | Maximum retries on temporary failures; default `3`. |
| `GOOGLE_TAGMANAGER_MIN_INTERVAL_MS` | No | Minimum request spacing; default `4200` ms. |

\* Provide either the OAuth trio or an access token. Access tokens expire in about an hour and are not refreshed automatically.

## Data and telemetry

The server runs locally and sends GTM API requests and OAuth refresh requests to Google. Its anonymous telemetry contains a random installation ID, package version, AI client and Node.js/operating-system versions, and tool names. It does not send OAuth tokens, GTM data, tool arguments or prompts.

Disable telemetry for A1 MCP servers with:

```bash
ASKADS_TELEMETRY=0
```

## Limits and background work

- **GTM is rate-limited.** The API allows 0.25 requests per second per project, so the server serializes calls at least 4.2 seconds apart. Broad audits can therefore take time.
- **Temporary limits are retried carefully.** `429` and Google quota `403` responses use exponential backoff and `Retry-After`. Reads retry after network and `5xx` failures; writes are not replayed after an uncertain failure.
- **There is no background monitoring.** The server runs only when your AI app calls it. If the app supports scheduled tasks, it can periodically inspect a container or its live version.
- **A workspace disappears when compiled.** Before calling `create_version`, save anything you need from the workspace and inspect the returned replacement workspace path.

## Technical documentation

- [All tools and inputs](./docs/TOOLS.md)
- [Development documentation](./docs/DEVELOPMENT.md)
- [Publishing documentation](./docs/PUBLISHING.md)
- [Google Tag Manager API v2 reference](https://developers.google.com/tag-platform/tag-manager/api/reference/rest)

## Support

Found a bug or need a scenario? [Create an issue](https://github.com/A1-x-Tech/mcp-google-tagmanager/issues) or write in [Telegram](https://t.me/a1_mcp).

<br>

<p align="center">
  <img src="https://github.com/ztemerbekov/a1-yandex-kit-skills/raw/main/assets/images/mona-hifive-yandex-kit-warm.gif" alt="Две Моны дают пять" width="256">
</p>

<p align="center">
  You made it to the end!
</p>
