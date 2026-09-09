import { GptClient } from "@gpt-platform/client";

// The workspace has already processed 5 supplier invoices.
// result_test_001 holds their extracted rows.
const allRows = [
  { supplier: "ABC Supplies Ltd", invoice_number: "INV-1042", invoice_date: "2026-07-18", total: 850000, currency: "UGX" },
  { supplier: "ABC Supplies Ltd", invoice_number: "INV-1045", invoice_date: "2026-08-01", total: 2450000, currency: "UGX" },
  { supplier: "Kampala Hardware", invoice_number: "INV-1046", invoice_date: "2026-08-14", total: 3100000, currency: "UGX" },
  { supplier: "Nile Agro Traders", invoice_number: "INV-1051", invoice_date: "2026-08-20", total: 1200000, currency: "UGX" },
  { supplier: "Kampala Hardware", invoice_number: "INV-1055", invoice_date: "2026-08-28", total: 4750000, currency: "UGX" }
];

const logRequest = async (request) => {
  console.log("\n=== MOCK REQUEST ===");
  console.log("URL:", request.url);
  console.log("Method:", request.method);
  console.log("Headers:", Object.fromEntries(request.headers.entries()));
  const bodyText = await request.text(); // read ONCE — a Request body is not reusable
  console.log("Body:", bodyText);
  return bodyText;
};

// Server-side query endpoint: filters rows in PostgreSQL and returns
// only the matches, with counts. Must be wrapped in { data: ... }.
const queryFetch = async (request) => {
  const bodyText = await logRequest(request);

  const body = JSON.parse(bodyText);
  const filters = body.filters ?? [];

  const matches = allRows.filter((row) =>
    filters.every((f) => {
      switch (f.op) {
        case "gt": return row[f.field] > f.value;
        case "lt": return row[f.field] < f.value;
        case "eq": return row[f.field] === f.value;
        case "contains": return String(row[f.field]).includes(f.value);
        default: return true;
      }
    })
  );

  return new Response(
    JSON.stringify({
      data: {
        rows: matches,
        total: allRows.length,
        filtered: matches.length,
        limit: body.limit ?? 1000,
        offset: body.offset ?? 0
      }
    }),
    { status: 200, headers: { "Content-Type": "application/vnd.api+json" } }
  );
};

const client = new GptClient({
  baseUrl: "https://api.gpt-core.com",
  fetch: queryFetch
});

console.log("\n########## TEST 010A: single filter — invoices above UGX 2,000,000 ##########");
const bigTickets = await client.extraction.results.query("result_test_001", {
  filters: [{ field: "total", op: "gt", value: 2000000 }],
  limit: 100,
  offset: 0
});
console.log("\n=== SDK RESPONSE ===");
console.dir(bigTickets, { depth: null });

console.log("\n########## TEST 010B: combined filters — Kampala Hardware above UGX 2,000,000 ##########");
const combined = await client.extraction.results.query("result_test_001", {
  filters: [
    { field: "supplier", op: "contains", value: "Kampala Hardware" },
    { field: "total", op: "gt", value: 2000000 }
  ],
  limit: 100,
  offset: 0
});
console.log("\n=== SDK RESPONSE ===");
console.dir(combined, { depth: null });
