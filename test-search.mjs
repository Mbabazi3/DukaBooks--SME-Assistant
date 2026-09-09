import { GptClient } from "@gpt-platform/client";

const logRequest = async (request) => {
  console.log("\n=== MOCK REQUEST ===");
  console.log("URL:", request.url);
  console.log("Method:", request.method);
  console.log("Body:", await request.text());
};

// NOTE: every SDK method expects a JSON:API envelope { data: ... }.
// A bare response body makes the SDK silently return undefined.
const jsonapi = (payload) =>
  new Response(JSON.stringify({ data: payload }), {
    status: 200,
    headers: { "Content-Type": "application/vnd.api+json" }
  });

// Full-text search (Meilisearch) — keyword lookup
const fullTextFetch = async (request) => {
  await logRequest(request);
  return jsonapi({
    hits: [
      {
        id: "doc_test_001",
        title: "invoice-001.pdf",
        document_type: "invoice",
        snippet: "ABC Supplies Ltd ... INV-1045 ... UGX 2,450,000",
        workspace_id: "ws_test_001"
      }
    ],
    total: 1,
    processing_time_ms: 12
  });
};

// Semantic search (pgvector) — meaning-based lookup
const semanticFetch = async (request) => {
  await logRequest(request);
  return jsonapi({
    hits: [
      {
        id: "doc_test_001",
        title: "invoice-001.pdf",
        chunk: "Invoice INV-1045 from ABC Supplies Ltd, total 2,450,000 UGX, dated 2026-08-01",
        score: 0.93
      },
      {
        id: "doc_test_002",
        title: "invoice-002.pdf",
        chunk: "Invoice INV-1046 from Kampala Hardware, total 3,100,000 UGX, dated 2026-08-14",
        score: 0.88
      }
    ],
    total: 2,
    processing_time_ms: 34
  });
};

const client = new GptClient({
  baseUrl: "https://api.gpt-core.com",
  fetch: fullTextFetch
});

console.log("\n########## TEST 009A: search.query (full-text) ##########");
const fullText = await client.search.query("INV-1045");
console.log("\n=== SDK RESPONSE ===");
console.dir(fullText, { depth: null });

// NOTE: assigning client.config.fetch after construction has NO effect —
// the fetch implementation is captured when the client is constructed.
// So we build a fresh client for the semantic test.
const semanticClient = new GptClient({
  baseUrl: "https://api.gpt-core.com",
  fetch: semanticFetch
});

console.log("\n########## TEST 009B: search.semantic (vector) ##########");
const semantic = await semanticClient.search.semantic(
  "which supplier invoices are above 2 million shillings?"
);
console.log("\n=== SDK RESPONSE ===");
console.dir(semantic, { depth: null });
