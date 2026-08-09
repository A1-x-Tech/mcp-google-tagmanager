# Publishing

Release checklist for `mcp-google-tagmanager`.

1. **Bump the version in THREE places** (must match byte-for-byte):
   - `package.json` → `version`
   - `server.json` → `version` (root)
   - `server.json` → `packages[0].version`

   Check: `grep -n '"version"' package.json server.json`

   Move the `Unreleased` notes in `CHANGELOG.md` into a dated section and update the
   link references at the bottom.

2. **Publish to npm** (prepublishOnly runs typecheck + tests + build):

   ```bash
   npm publish
   ```

3. **Tag and release on GitHub** (a tag is not a Release):

   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin main --follow-tags
   gh release create vX.Y.Z --title vX.Y.Z --generate-notes --verify-tag
   ```

4. **Publish to the MCP registry** (`mcpName`: `io.github.A1-x-Tech/mcp-google-tagmanager`):

   ```bash
   mcp-publisher logout
   mcp-publisher login github --token "$(gh auth token)"
   mcp-publisher publish
   ```

   Use `--token` (device-flow may not see the A1-x-Tech organization). Note that
   `mcp-publisher` publishes the ROOT `server.json` version — if it was not bumped,
   `npm publish` succeeds but `mcp-publisher publish` fails with a misleading
   "400 cannot publish duplicate version".
