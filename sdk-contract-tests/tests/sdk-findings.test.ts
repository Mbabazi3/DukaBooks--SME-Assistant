import { describe, expect, it } from "vitest";
import { GptClient, GptCoreError } from "@gpt-platform/client";
import { BASE_URL, jsonapi, resource } from "../support/mock-platform";

// The SDK behaviours reported to Russ (TEST-NOTES.md, "SDK findings").
// These tests pin down CURRENT behaviour. If one starts failing after an SDK
// upgrade, the finding has probably been fixed — update TEST-NOTES and the test.

const clientReturning = (respond: () => Response, retry: NonNullable<ConstructorParameters<typeof GptClient>[0]>["retry"] = false) =>
  new GptClient({ baseUrl: BASE_URL, apiKey: "sk_app_contract_test", retry, fetch: (async () => respond()) as typeof fetch });

describe("Finding #1 — a 2xx without the { data } envelope returns undefined silently", () => {
  it.each([
    ["a bare JSON object", () => new Response(JSON.stringify({ id: "x" }), { status: 200 })],
    ["an HTML page (wrong baseUrl / proxy)", () => new Response("<html>hi</html>", { status: 200, headers: { "Content-Type": "text/html" } })],
    ["an empty JSON object", () => new Response("{}", { status: 200, headers: { "Content-Type": "application/vnd.api+json" } })],
    ["a meta-only body", () => new Response(JSON.stringify({ meta: { total: 0 } }), { status: 200, headers: { "Content-Type": "application/vnd.api+json" } })],
    ["204 No Content", () => new Response(null, { status: 204 })],
  ])("%s → resolves to undefined, no error", async (_label, respond) => {
    await expect(clientReturning(respond).crm.contacts.get("con_123")).resolves.toBeUndefined();
  });

  it("contrast: a real 500 rejects with a catchable GptCoreError", async () => {
    const client = clientReturning(() => new Response(JSON.stringify({ errors: [{ title: "boom" }] }), { status: 500 }));

    const error = await client.crm.contacts.get("con_123").catch((e) => e);

    expect(error).toBeInstanceOf(GptCoreError);
    expect(error.statusCode).toBe(500);
  });

  it("contrast: by default a 500 is retried before it fails", async () => {
    let calls = 0;
    const client = clientReturning(
      () => {
        calls++;
        return new Response(JSON.stringify({ errors: [{ title: "boom" }] }), { status: 500 });
      },
      { maxRetries: 2, initialDelay: 1, maxDelay: 5 },
    );

    await expect(client.crm.contacts.get("con_123")).rejects.toBeInstanceOf(GptCoreError);
    expect(calls).toBe(3); // 1 try + 2 retries
  });
});

describe("Finding #2 — fetch is captured when the client is constructed", () => {
  it("reassigning client.config.fetch afterwards has no effect", async () => {
    const client = clientReturning(() => jsonapi(resource("1", "crm-contact", { marker: "FIRST" })));
    (client as any).config.fetch = async () => jsonapi(resource("2", "crm-contact", { marker: "SECOND" }));

    const contact: any = await client.crm.contacts.get("con_1");

    expect(contact.marker).toBe("FIRST");
  });
});
