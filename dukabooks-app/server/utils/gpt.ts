import { GptClient, GptCoreError } from "@gpt-platform/client";

// The ONLY place the app talks to GPT Platform. Runs in Nitro (server side),
// so the API key never reaches the browser bundle.
//
// Config comes from runtimeConfig.gptPlatform (see nuxt.config.ts), which Nuxt
// fills from NUXT_GPT_PLATFORM_* environment variables — copy .env.example to
// .env and fill it in.

let client: GptClient | null = null;

export function useGptConfig(event?: Parameters<typeof useRuntimeConfig>[0]) {
  return useRuntimeConfig(event).gptPlatform;
}

export function useGptClient(event?: Parameters<typeof useRuntimeConfig>[0]): GptClient {
  if (client) return client;
  const { baseUrl, apiKey } = useGptConfig(event);
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: "GPT Platform is not configured",
      message: "Set NUXT_GPT_PLATFORM_API_KEY (and NUXT_GPT_PLATFORM_WORKSPACE_ID) in dukabooks-app/.env",
    });
  }
  client = new GptClient({ baseUrl, apiKey });
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
