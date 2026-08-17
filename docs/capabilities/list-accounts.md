# Google Tag Manager: List GTM accounts — MCP tool

**Google Tag Manager MCP tool:** Lists all Google Tag Manager accounts the authorized user can access.

Technical name: `list_accounts`

## What task it solves

> I want to list GTM accounts.

Lists all Google Tag Manager accounts the authorized user can access.

## When to use it

Use this capability when you need “List GTM accounts” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `page_token` — **optional**. Pagination token from a previous response's nextPageToken. Omit for the first page.

## What it returns

Returns { account: [{ accountId, name, path, fingerprint }], nextPageToken }.

## What changes in Google Tag Manager

The tool reads Google Tag Manager data and does not change it.

## Example request

> List GTM accounts in Google Tag Manager. Ask for any required identifiers that are missing.

## Errors and limitations

All ids are strings. This is the entry point: every other tool needs an accountId (or a path) from here.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [Get a GTM account](./get-account.md) — `get_account`

## Technical details

- **Impact:** read-only
- **Group:** Accounts
- **Description source:** `list_accounts` registration in `src/tools/accounts.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
