import { TokenProvider } from "./auth.js";
import type { TagManagerConfig } from "./types.js";
import { isQuotaError, TagManagerError } from "./types.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/** Query-string values: repeated keys (e.g. ?type=a&type=b) are arrays. */
export type Query = Record<string, string | string[] | undefined>;

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

/** The workspace-entity collections that share the create/list wire shape. */
export type EntityKind = "tag" | "trigger" | "variable";

const ENTITY_COLLECTION: Record<EntityKind, string> = {
  tag: "tags",
  trigger: "triggers",
  variable: "variables",
};

/** Builds the API-relative workspace path GTM v2 uses to address everything inside a workspace. */
export function workspacePath(accountId: string, containerId: string, workspaceId: string): string {
  return `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;
}

export class TagManagerClient {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseMs: number;
  private readonly minIntervalMs: number;
  private readonly tokens: TokenProvider;

  /**
   * Rate limiter state. GTM allows 0.25 QPS per project (25 requests / 100 s
   * sliding window), so every API request is serialized through this queue and
   * spaced at least minIntervalMs apart — including retry attempts.
   */
  private queue: Promise<unknown> = Promise.resolve();
  private lastStartAt = 0;

  constructor(
    private readonly config: TagManagerConfig,
    tokens?: TokenProvider,
  ) {
    const root = config.apiBase.endsWith("/") ? config.apiBase : config.apiBase + "/";
    this.base = root + "tagmanager/v2/";
    this.timeoutMs = config.timeoutMs ?? 60_000;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBaseMs = config.retryBaseMs ?? 1_000;
    this.minIntervalMs = config.minIntervalMs ?? 4_200;
    this.tokens = tokens ?? new TokenProvider(config);
  }

  /** Backoff before a retry: honors Retry-After when present, else exponential (capped at 30s). */
  private backoffMs(attempt: number, res?: Response): number {
    const retryAfter = res ? Number(res.headers.get("Retry-After")) : NaN;
    if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter, 30) * 1000;
    return Math.min(this.retryBaseMs * 2 ** attempt, 30_000);
  }

  /**
   * Waits until the previous request started at least minIntervalMs ago. Only
   * ever runs inside the serialized queue, so there is no race on lastStartAt.
   */
  private async throttle(): Promise<void> {
    const wait = this.lastStartAt + this.minIntervalMs - Date.now();
    if (wait > 0) await delay(wait);
    this.lastStartAt = Date.now();
  }

  /**
   * fetch with an AbortController timeout. Reads the response body inside the
   * guarded zone so the timeout also covers a slow or drip-feeding body, not
   * just the initial headers.
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    label: string,
  ): Promise<{ res: Response; text: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const text = await res.text();
      return { res, text };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Request to "${label}" timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Low-level request to a GTM v2 path relative to /tagmanager/v2/
   * (e.g. "accounts/1/containers/2/workspaces/3/tags"). All requests are
   * serialized and spaced ≥ minIntervalMs apart (0.25 QPS quota). Retries
   * 429 and quota-403 for every method; 5xx and network errors/timeouts only
   * for GET (a write that already committed must not be replayed). Any other
   * non-2xx throws a {@link TagManagerError}.
   */
  async request<T = unknown>(method: HttpMethod, path: string, opts: RequestOptions = {}): Promise<T> {
    // Resolve the path against the API base, then reject anything that escaped
    // to a foreign origin (an absolute "https://evil/x" or a "\\evil/x" slipped
    // through raw_request) so the Bearer token can never leak to another host.
    const url = new URL(path.replace(/^\//, ""), this.base);
    if (url.origin !== new URL(this.base).origin) {
      throw new Error(`raw_request path must be a relative API path (resolved to foreign origin ${url.origin})`);
    }
    for (const [key, value] of Object.entries(opts.query ?? {})) {
      if (value === undefined) continue;
      for (const v of Array.isArray(value) ? value : [value]) url.searchParams.append(key, v);
    }
    const target = url.toString();

    // Serialize through the rate-limiter queue; a failed request must not wedge it.
    const run = this.queue.then(() => this.perform<T>(method, target, path, opts.body));
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async perform<T>(method: HttpMethod, target: string, label: string, body: unknown): Promise<T> {
    // Guard method !== "GET" keeps undici from crashing on a GET-with-body.
    const hasBody = body !== undefined && method !== "GET";
    const idempotent = method === "GET";

    for (let attempt = 0; ; attempt++) {
      // The token exchange happens outside the throttle window: it goes to
      // oauth2.googleapis.com and does not count against the GTM quota.
      const token = await this.tokens.getAccessToken();
      await this.throttle();

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (hasBody) headers["Content-Type"] = "application/json";

      let res: Response;
      let text: string;
      try {
        ({ res, text } = await this.fetchWithTimeout(
          target,
          { method, headers, body: hasBody ? JSON.stringify(body) : undefined },
          label,
        ));
      } catch (err) {
        // Network error or timeout: retry reads with backoff; a write may have
        // reached the server, so rethrow it as-is.
        if (idempotent && attempt < this.maxRetries) {
          await delay(this.backoffMs(attempt));
          continue;
        }
        throw err;
      }

      let data: unknown = undefined;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      // 429 and quota-403 mean "not executed, slow down" — retryable for every
      // method. 5xx is retried only for reads.
      const rateLimited = res.status === 429 || (res.status === 403 && isQuotaError(data));
      const transient = rateLimited || (idempotent && res.status >= 500 && res.status < 600);
      if (transient && attempt < this.maxRetries) {
        await delay(this.backoffMs(attempt, res));
        continue;
      }

      if (!res.ok) throw new TagManagerError(res.status, data);
      return data as T;
    }
  }

  // --- Accounts ---

  /** Lists all GTM accounts the authorized user can access. */
  async listAccounts(pageToken?: string): Promise<unknown> {
    return this.request("GET", "accounts", { query: { pageToken } });
  }

  /**
   * Generic GET of any resource by its API-relative path — accounts, containers,
   * workspaces, tags, triggers, variables and versions all share this shape.
   */
  async getResource(path: string): Promise<unknown> {
    return this.request("GET", path);
  }

  // --- Containers ---

  async listContainers(accountId: string, pageToken?: string): Promise<unknown> {
    return this.request("GET", `accounts/${accountId}/containers`, { query: { pageToken } });
  }

  async createContainer(accountId: string, body: { name: string; usageContext: string[] }): Promise<unknown> {
    return this.request("POST", `accounts/${accountId}/containers`, { body });
  }

  // --- Workspaces ---

  async listWorkspaces(accountId: string, containerId: string, pageToken?: string): Promise<unknown> {
    return this.request("GET", `accounts/${accountId}/containers/${containerId}/workspaces`, {
      query: { pageToken },
    });
  }

  async createWorkspace(
    accountId: string,
    containerId: string,
    body: { name: string; description?: string },
  ): Promise<unknown> {
    return this.request("POST", `accounts/${accountId}/containers/${containerId}/workspaces`, {
      body: compact(body),
    });
  }

  // --- Tags / triggers / variables ---

  async listEntities(
    accountId: string,
    containerId: string,
    workspaceId: string,
    kind: EntityKind,
    pageToken?: string,
  ): Promise<unknown> {
    const parent = workspacePath(accountId, containerId, workspaceId);
    return this.request("GET", `${parent}/${ENTITY_COLLECTION[kind]}`, { query: { pageToken } });
  }

  async createEntity(
    accountId: string,
    containerId: string,
    workspaceId: string,
    kind: EntityKind,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const parent = workspacePath(accountId, containerId, workspaceId);
    return this.request("POST", `${parent}/${ENTITY_COLLECTION[kind]}`, { body });
  }

  /** Full replace (PUT, not PATCH): send the complete resource back. */
  async updateEntity(path: string, body: Record<string, unknown>, fingerprint?: string): Promise<unknown> {
    return this.request("PUT", path, { query: { fingerprint }, body });
  }

  async deleteEntity(path: string): Promise<unknown> {
    return this.request("DELETE", path);
  }

  // --- Built-in variables ---

  async listBuiltInVariables(accountId: string, containerId: string, workspaceId: string): Promise<unknown> {
    const parent = workspacePath(accountId, containerId, workspaceId);
    return this.request("GET", `${parent}/built_in_variables`);
  }

  /** Enable: POST with repeated ?type= query params and an empty body. */
  async enableBuiltInVariables(
    accountId: string,
    containerId: string,
    workspaceId: string,
    types: string[],
  ): Promise<unknown> {
    const parent = workspacePath(accountId, containerId, workspaceId);
    return this.request("POST", `${parent}/built_in_variables`, { query: { type: types } });
  }

  /** Disable: DELETE with repeated ?type= query params. */
  async disableBuiltInVariables(
    accountId: string,
    containerId: string,
    workspaceId: string,
    types: string[],
  ): Promise<unknown> {
    const parent = workspacePath(accountId, containerId, workspaceId);
    return this.request("DELETE", `${parent}/built_in_variables`, { query: { type: types } });
  }

  // --- Versions & publishing ---

  /**
   * Compiles the workspace into a Container Version. Mind the side effect: the
   * workspace is DELETED and replaced (response carries newWorkspacePath), and
   * a compile failure arrives as compilerError=true with HTTP 200.
   */
  async createVersion(
    accountId: string,
    containerId: string,
    workspaceId: string,
    body: { name?: string; notes?: string },
  ): Promise<unknown> {
    const path = workspacePath(accountId, containerId, workspaceId);
    return this.request("POST", `${path}:create_version`, { body: compact(body) });
  }

  async publishVersion(
    accountId: string,
    containerId: string,
    versionId: string,
    fingerprint?: string,
  ): Promise<unknown> {
    const path = `accounts/${accountId}/containers/${containerId}/versions/${versionId}`;
    return this.request("POST", `${path}:publish`, { query: { fingerprint } });
  }

  async getVersion(accountId: string, containerId: string, versionId: string): Promise<unknown> {
    return this.request("GET", `accounts/${accountId}/containers/${containerId}/versions/${versionId}`);
  }

  /** The currently published (live) version of a container. */
  async liveVersion(accountId: string, containerId: string): Promise<unknown> {
    return this.request("GET", `accounts/${accountId}/containers/${containerId}/versions:live`);
  }
}

/** Drops keys whose value is `undefined` so they are not sent to the API. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
