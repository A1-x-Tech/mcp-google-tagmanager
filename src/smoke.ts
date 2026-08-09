import { TagManagerClient } from "./client.js";
import { ConfigError, loadConfig } from "./config.js";

/** Live READ-ONLY smoke check: lists the GTM accounts the credentials can see. */
async function main(): Promise<void> {
  const client = new TagManagerClient(loadConfig());
  const result = await client.listAccounts();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  // A missing credential is a user error, not a bug: report it without the stack.
  console.error("smoke failed:", err instanceof ConfigError ? err.message : err);
  process.exit(1);
});
