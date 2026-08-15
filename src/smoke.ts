import { TagManagerClient } from "./client.js";
import { ConfigError, CredentialsError, loadConfig } from "./config.js";

/** Live READ-ONLY smoke check: lists the GTM accounts the credentials can see. */
async function main(): Promise<void> {
  const client = new TagManagerClient(loadConfig());
  const result = await client.listAccounts();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  // A missing or malformed credential is a user error, not a bug: no stack.
  const userError = err instanceof ConfigError || err instanceof CredentialsError;
  console.error("smoke failed:", userError ? err.message : err);
  process.exit(1);
});
