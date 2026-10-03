import { GptClient, GptCoreError } from "@gpt-platform/client";

// The ONLY place the app talks to GPT Platform. Runs in Nitro (server side),
// so the keys never reach the browser bundle.
//
// Settings come from environment variables. `nuxt dev` loads dukabooks-app/.env
// automatically; for a production build run `npm start` (node --env-file=.env).
// See .env.example for the full list.

export interface GptConfig {
  baseUrl: string;
  apiKey: string;
  appId: string;
  workspaceId: string;
  agentId: string;
  invoiceResultId: string;
}

export function useGptConfig(): GptConfig {
  const env = process.env;
  return {
    baseUrl: env.GPT_PLATFORM_BASE_URL || "https://api.gpt-core.com",
    // Server-to-server calls use the app's server key; the plain app key is a fallback.
    apiKey: env.GPT_PLATFORM_APP_SERVER_KEY || env.GPT_PLATFORM_APP_KEY || "",
    appId: env.GPT_PLATFORM_APP_ID || "",
    workspaceId: env.GPT_PLATFORM_WORKSPACE_ID || "",
    agentId: env.GPT_PLATFORM_AGENT_ID || "",
    invoiceResultId: env.GPT_PLATFORM_INVOICE_RESULT_ID || "",
  };
}

// Throws a clear 503 naming the env var when an optional setting is needed but missing.
export function requireSetting(value: string, envName: string, feature: string): string {
  if (!value) {
    throw createError({
      statusCode: 503,
      statusMessage: `${feature} is not configured`,
      message: `Set ${envName} in dukabooks-app/.env`,
    });
  }
  return value;
}

let client: GptClient | null = null;

export function useGptClient(): GptClient {
  if (client) return client;
  const { baseUrl, apiKey, workspaceId } = useGptConfig();
  requireSetting(apiKey, "GPT_PLATFORM_APP_SERVER_KEY", "GPT Platform");
  client = new GptClient({
    baseUrl,
    apiKey,
    workspaceId: workspaceId || undefined,
    appInfo: { name: "DukaBooks", version: "0.1.0" },
  });
  return client;
}

// Runs an SDK call and turns SDK errors into proper HTTP errors for the page,
// keeping the status code and request id so failures are easy to trace.
export async function sdk<T>(fn: () => Promise<T>): Promise<T> {
  try {
    const result = await fn();
    // SDK finding #1 (TEST-NOTES.md): a non-JSON:API 2xx silently yields undefined.
    if (result === undefined) {
      throw createError({ statusCode: 502, statusMessage: "Empty response from GPT Platform (no JSON:API envelope)" });
    }
    return result;
  } catch (err) {
    if (err instanceof GptCoreError) {
      throw createError({
        statusCode: err.statusCode ?? 502,
        statusMessage: `${err.name}: ${err.message}`,
        data: { code: err.code, requestId: err.requestId },
      });
    }
    throw err;
  }
}
