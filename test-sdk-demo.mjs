/**
 * GPT Platform JS SDK (v1.2.0) — offline verification harness
 *
 * Run:
 *   npm init -y && npm i @gpt-platform/client
 *   node russ-sdk-demo.mjs
 *
 * No API key or network needed — every call runs against an in-process
 * mock fetch, so this verifies the SDK's request/response behaviour only.
 */

import { GptClient } from "@gpt-platform/client";

const jsonapi = (payload) =>
  new Response(JSON.stringify({ data: payload }), {
    status: 200,
    headers: { "Content-Type": "application/vnd.api+json" },
  });

let pass = 0;
let fail = 0;
const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
};

// ---------------------------------------------------------------------------
console.log("\n1. HAPPY PATH — correctly enveloped response is unwrapped");
{
  const client = new GptClient({
    baseUrl: "https://api.gpt-core.com",
    fetch: async () =>
      jsonapi({
        id: "con_123",
        type: "crm-contact",
        attributes: { first_name: "John", last_name: "Doe" },
      }),
  });
  const contact = await client.crm.contacts.get("con_123");
  check("attributes flattened to top level", contact?.first_name === "John" && contact?.last_name === "Doe");
}

// ---------------------------------------------------------------------------
console.log("\n2. REQUEST SHAPE — what the SDK actually puts on the wire");
{
  let captured = null;
  let capturedBody = null;
  const client = new GptClient({
    baseUrl: "https://api.gpt-core.com",
    fetch: async (request) => {
      captured = request;
      capturedBody = await request.text(); // body can only be read once
      return jsonapi({
        id: "con_456",
        type: "crm-contact",
        attributes: { first_name: "Jane" },
      });
    },
  });
  await client.crm.contacts.create({
    workspace_id: "ws_1",
    first_name: "Jane",
  });

  const headers = Object.fromEntries(captured.headers.entries());
  check("method is POST", captured.method === "POST");
  check("URL is /crm/contacts", captured.url === "https://api.gpt-core.com/crm/contacts");
  check(
    "body is JSON:API envelope ({ data: { type, attributes } })",
    capturedBody.includes('"data"') && capturedBody.includes('"crm-contact"'),
    capturedBody
  );
  check("auto Idempotency-Key header", Boolean(headers["idempotency-key"]));
  check("User-Agent GPTCore/JS 1.2.0", headers["user-agent"] === "GPTCore/JS 1.2.0");
  check("versioned Accept header", headers["accept"] === "application/vnd.api+json; version=2026-07-12");
}

// ---------------------------------------------------------------------------
console.log("\n3. FINDING #1 — non-envelope 2xx responses return undefined SILENTLY");
console.log("  (execute() reads body?.data and has no shape validation)");
{
  const cases = [
    ["bare JSON object", () => new Response(JSON.stringify({ id: "x" }), { status: 200 })],
    ["HTML page (wrong baseUrl / proxy)", () => new Response("<html>hi</html>", { status: 200, headers: { "Content-Type": "text/html" } })],
    ["empty JSON {}", () => new Response("{}", { status: 200, headers: { "Content-Type": "application/vnd.api+json" } })],
    ["meta-only body", () => new Response(JSON.stringify({ meta: { total: 0 } }), { status: 200, headers: { "Content-Type": "application/vnd.api+json" } })],
    ["204 No Content", () => new Response(null, { status: 204 })],
  ];
  for (const [label, respond] of cases) {
    const client = new GptClient({ baseUrl: "https://api.gpt-core.com", fetch: respond });
    const result = await client.crm.contacts.get("con_123");
    check(`200/204 with ${label} → returns undefined, throws nothing`, result === undefined);
  }

  // Contrast: real errors behave correctly.
  const errClient = new GptClient({
    baseUrl: "https://api.gpt-core.com",
    fetch: async () => new Response(JSON.stringify({ errors: [{ title: "boom" }] }), { status: 500 }),
  });
  let threw = false;
  try {
    await errClient.crm.contacts.get("con_123");
  } catch (e) {
    threw = true;
  }
  check("contrast: a 500 throws a proper catchable error", threw);

  // Suggested fix (SDK-side): validate the envelope in execute(), e.g.
  //   const innerData = data?.data;
  //   if (innerData === undefined && response.status !== 204) throw new Error(
  //     "Unexpected response shape: missing JSON:API 'data' envelope"
  //   );
}

// ---------------------------------------------------------------------------
console.log("\n4. FINDING #2 — fetch implementation is captured at construction");
{
  const clientA = new GptClient({
    baseUrl: "https://api.gpt-core.com",
    fetch: async () => jsonapi({ id: "1", type: "crm-contact", attributes: { marker: "FIRST" } }),
  });
  clientA.config.fetch = async () =>
    jsonapi({ id: "2", type: "crm-contact", attributes: { marker: "SECOND" } });

  const result = await clientA.crm.contacts.get("con_1");
  check(
    "client.config.fetch reassignment has NO effect (still uses constructor mock)",
    result?.marker === "FIRST",
    `got marker=${result?.marker}`
  );
}

// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(60)}`);
console.log(`Done: ${pass} passed, ${fail} failed`);
console.log("Sections 3 and 4 document current SDK behaviour (repros, not bugs in this harness).");
