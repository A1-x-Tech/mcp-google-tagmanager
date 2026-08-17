# Google Tag Manager: Get a GTM account — MCP tool

**Google Tag Manager MCP tool:** Gets one Google Tag Manager account by id.

Technical name: `get_account`

## What task it solves

> I want to get a GTM account.

Gets one Google Tag Manager account by id.

## When to use it

Use this capability when you need “Get a GTM account” without doing the same work manually in the Google Tag Manager interface. It runs only when an AI client calls it.

## What to provide

- `account_id` — **required**. GTM account id (string), e.g. from list_accounts.

## What it returns

Returns the Account resource: { accountId, name, path, fingerprint, shareData }.

## What changes in Google Tag Manager

The tool reads Google Tag Manager data and does not change it.

## Example request

> Get a GTM account in Google Tag Manager. Ask for any required identifiers that are missing.

## Errors and limitations

Check required parameters, token permissions, and current upstream API limits.

Access also depends on token permissions, quotas, and upstream API limits.

## Related MCP tools

- [List GTM accounts](./list-accounts.md) — `list_accounts`

## Technical details

- **Impact:** read-only
- **Group:** Accounts
- **Description source:** `get_account` registration in `src/tools/accounts.ts`
- [Full technical reference](../TOOLS.md)
- [All MCP capabilities](./index.md)
