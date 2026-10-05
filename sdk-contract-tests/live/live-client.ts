import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GptClient } from "@gpt-platform/client";

/**
 * Builds a REAL GptClient for the live staging tests.
 *
 * Credentials are read from dukabooks-app/.env (the same file the app uses),
 * or from the file named by GPT_PLATFORM_ENV_FILE. Values already set in the
 * environment win. Nothing secret lives in this folder.
 *
 * Safety: the client's fetch only allows GET requests. Anything else throws
 * before it reaches the network, so these tests can never create, change or
 * delete data in the workspace.
 */

const DEFAULT_ENV_FILE = fileURLToPath(new URL("../../dukabooks-app/.env", import.meta.url));

function loadEnvFile(path: string) {
  if (!existsSync(path)) return false;
  // Parse the whole file first so a key that appears twice behaves like
  // dotenv / `node --env-file`: the LAST line wins.
  const fromFile = new Map<string, string>();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (fromFile.has(key)) console.warn(`[live tests] ${key} is set more than once in ${path} — using the last one`);
    fromFile.set(key, raw.replace(/^(['"])(.*)\1$/, "$2"));
  }
  // Values already exported in the shell still win over the file.
  for (const [key, value] of fromFile) if (process.env[key] === undefined) process.env[key] = value;
  return true;
}

const envFile = process.env.GPT_PLATFORM_ENV_FILE || DEFAULT_ENV_FILE;
const envLoaded = loadEnvFile(envFile);

export const live = {
  envFile,
  envLoaded,
  baseUrl: process.env.GPT_PLATFORM_BASE_URL || "",
  apiKey: process.env.GPT_PLATFORM_APP_SERVER_KEY || process.env.GPT_PLATFORM_APP_KEY || "",
  workspaceId: process.env.GPT_PLATFORM_WORKSPACE_ID || "",
};

/** Why the live suite can't run, or null if it can. */
export const skipReason = !live.baseUrl || !live.apiKey || !live.workspaceId
  ? `set GPT_PLATFORM_BASE_URL, GPT_PLATFORM_APP_SERVER_KEY and GPT_PLATFORM_WORKSPACE_ID in ${envFile}`
  : null;

const readOnlyFetch: typeof fetch = async (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init);
  if (request.method !== "GET") {
    throw new Error(`Live tests are read-only: blocked ${request.method} ${new URL(request.url).pathname}`);
  }
  return fetch(request);
};

/**
 * @param workspaceId Only pass a REAL workspace UUID. The SDK appends it as
 *   ?workspace_id= to every request, which is what gives calls without a
 *   workspace argument (search, review queues) their workspace context.
 */
export function liveClient(workspaceId?: string) {
  return new GptClient({
    baseUrl: live.baseUrl,
    apiKey: live.apiKey,
    ...(workspaceId && { workspaceId }),
    fetch: readOnlyFetch,
    retry: { maxRetries: 1, initialDelay: 500, maxDelay: 2000 },
    appInfo: { name: "DukaBooks live tests" },
  });
}

/** Platform ids are UUIDs; placeholders like "ws_duka_001" are rejected with 400 InvalidQuery. */
export const looksLikeUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** The server's own explanation, from a JSON:API error body. */
function errorDetail(body: unknown): string {
  let parsed: any = body;
  if (typeof body === "string") {
    try { parsed = JSON.parse(body); } catch { return body.slice(0, 300); }
  }
  const errors: any[] = parsed?.errors ?? [];
  return errors.map((e) => [e.code, e.detail ?? e.title, e.source?.pointer ?? e.source?.parameter].filter(Boolean).join(" ")).join("; ");
}

/** Re-throws SDK errors with the status code, request id and server detail in the message. */
export async function call<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const bits = [err?.name, err?.statusCode && `HTTP ${err.statusCode}`, err?.requestId && `request ${err.requestId}`]
      .filter(Boolean)
      .join(", ");
    const detail = errorDetail(err?.body);
    const hint = err?.statusCode === 403
      ? " → the key is valid but not allowed to use this feature in the workspace; ask the platform team to grant it to the app/key"
      : "";
    throw new Error(`${label} failed (${bits}): ${err?.message ?? err}${detail ? ` — ${detail}` : ""}${hint}`, { cause: err });
  }
}
