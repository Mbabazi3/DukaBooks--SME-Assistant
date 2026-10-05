import { GptClient } from "@gpt-platform/client";

export { SDK_VERSION, DEFAULT_API_VERSION } from "@gpt-platform/client";

/**
 * A fake GPT Platform for contract tests.
 *
 * Give it handlers keyed by "METHOD /path". Every request the SDK makes is
 * recorded (method, path, query, headers, parsed JSON body) so tests can
 * assert exactly what went over the wire. A handler may return a Response,
 * or plain data which is wrapped in the JSON:API envelope `{ data }`.
 * Requests with no handler get a JSON:API 404.
 */

export const BASE_URL = "https://api.gpt-core.com";
export const API_KEY = "sk_app_contract_test";

export interface CapturedRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  /** Parsed JSON body, raw text if not JSON, undefined if empty. */
  body: any;
}

export type Handler = (req: CapturedRequest) => unknown | Response | Promise<unknown | Response>;

export function mockPlatform(handlers: Record<string, Handler> = {}) {
  const requests: CapturedRequest[] = [];

  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    // A Request body can only be read once — read it here and nowhere else.
    const text = await request.text();
    let body: any;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    const captured: CapturedRequest = {
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(request.headers),
      body,
    };
    requests.push(captured);

    const handler = handlers[`${captured.method} ${captured.path}`];
    if (!handler) {
      return jsonapiErrors(404, `No mock for ${captured.method} ${captured.path}`);
    }
    const result = await handler(captured);
    return result instanceof Response ? result : jsonapi(result);
  };

  const client = new GptClient({ baseUrl: BASE_URL, apiKey: API_KEY, fetch: fetch as typeof globalThis.fetch });

  return {
    client,
    requests,
    /** The most recent request the SDK sent. */
    get last(): CapturedRequest {
      const req = requests.at(-1);
      if (!req) throw new Error("The SDK sent no request");
      return req;
    },
  };
}

/** A JSON:API resource object. */
export const resource = (id: string, type: string, attributes: Record<string, unknown> = {}) => ({ id, type, attributes });

/** A 2xx JSON:API response: `{ data }`. */
export const jsonapi = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/vnd.api+json" },
  });

/** A JSON:API error response. */
export const jsonapiErrors = (status: number, detail: string) =>
  new Response(JSON.stringify({ errors: [{ status: String(status), detail }] }), {
    status,
    headers: { "Content-Type": "application/vnd.api+json" },
  });

/** A Server-Sent Events response: one `data:` line per event, then [DONE]. */
export const sse = (events: unknown[]) =>
  new Response([...events.map((e) => `data: ${JSON.stringify(e)}\n\n`), "data: [DONE]\n\n"].join(""), {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
