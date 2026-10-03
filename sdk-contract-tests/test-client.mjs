import { GptClient } from "@gpt-platform/client";

const mockFetch = async (request) => {
  console.log("\n=== MOCK REQUEST ===");
  console.log("URL:", request.url);
  console.log("Method:", request.method);
  console.log(
    "Headers:",
    Object.fromEntries(request.headers.entries())
  );
  console.log("Body:", await request.text());

  return new Response(
    JSON.stringify({
      data: [
        {
          id: "result_test_001",
          type: "extraction-result",
          attributes: {
            document_id: "doc_test_001",
            status: "completed",
            rows: [
              {
                supplier: "ABC Supplies Ltd",
                invoice_number: "INV-1045",
                invoice_date: "2026-08-01",
                total: 2450000,
                currency: "UGX"
              }
            ]
          }
        }
      ]
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.api+json"
      }
    }
  );
};

const client = new GptClient({
  baseUrl: "https://api.gpt-core.com",
  fetch: mockFetch
});

const results =
  await client.extraction.results.byDocument("doc_test_001");

console.log("\n=== SDK RESPONSE ===");
console.dir(results, { depth: null });
