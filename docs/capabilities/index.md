# Google Tag Manager MCP capabilities

This catalog contains 19 public pages—one for every registered MCP tool in `mcp-google-tagmanager`. Each page starts with the user's task, explains the result, and states whether the call changes real data.

Use this catalog to choose a ready-made capability. Full parameter schemas and API response details remain in the [technical reference](../TOOLS.md).

## Containers

- [Create a container](./create-container.md) — Creates a new container in a GTM account. **Impact:** changes data.
- [Get a container](./get-container.md) — Gets one container by account id + container id. **Impact:** read-only.
- [List containers](./list-containers.md) — Lists the containers of a GTM account. **Impact:** read-only.

## Tags, triggers and variables

- [Create a tag, trigger or variable](./create-entity.md) — Creates a tag, trigger or variable in a workspace. **Impact:** changes data.
- [Delete a tag, trigger or variable](./delete-entity.md) — Deletes a tag, trigger or variable by its API path. **Impact:** destructive operation.
- [Get any resource by path](./get-resource.md) — Generic getter for any GTM resource by its API-relative path — tags, triggers, variables, versions, containers, workspaces. **Impact:** read-only.
- [List tags](./list-tags.md) — Lists the tags of a workspace. **Impact:** read-only.
- [List triggers](./list-triggers.md) — Lists the triggers of a workspace. **Impact:** read-only.
- [List variables](./list-variables.md) — Lists the user-defined variables of a workspace (built-in variables live in manage_built_in_variables). **Impact:** read-only.
- [Update a tag, trigger or variable](./update-entity.md) — Updates a tag, trigger or variable by its API path. **Impact:** destructive operation.

## Versions and publishing

- [Create a container version from a workspace](./create-version.md) — Compiles a workspace into an immutable Container Version (the unit that gets published). **Impact:** destructive operation.
- [Publish, inspect or fetch the live container version](./publish-version.md) — Container-version operations. **Impact:** destructive operation.

## Workspaces

- [Create a workspace](./create-workspace.md) — Creates a new workspace in a container — an isolated draft where tags, triggers and variables are edited before being compiled into a version. **Impact:** changes data.
- [Get a workspace](./get-workspace.md) — Gets one workspace by account id + container id + workspace id. **Impact:** read-only.
- [List workspaces](./list-workspaces.md) — Lists the workspaces of a container. **Impact:** read-only.

## Accounts

- [Get a GTM account](./get-account.md) — Gets one Google Tag Manager account by id. **Impact:** read-only.
- [List GTM accounts](./list-accounts.md) — Lists all Google Tag Manager accounts the authorized user can access. **Impact:** read-only.

## Built-in variables

- [List/enable/disable built-in variables](./manage-built-in-variables.md) — Manages a workspace's built-in variables (pageUrl, clickText, event, ...). **Impact:** changes data.

## Additional API methods

- [Raw Tag Manager API call](./raw-request.md) — Escape hatch to call any Google Tag Manager API v2 path directly, for endpoints without a dedicated tool (environments, folders, templates, zones, workspace :sync / :quick_preview, version_headers, ...). **Impact:** destructive operation.

## For maintainers and publishers

- [MCP capability documentation contract](../CAPABILITY-DOCUMENTATION.md)
- [Technical tool reference](../TOOLS.md)
- [GitHub repository](https://github.com/A1-x-Tech/mcp-google-tagmanager)
