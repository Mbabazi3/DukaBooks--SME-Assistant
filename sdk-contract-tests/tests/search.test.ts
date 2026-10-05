import { describe, expect, it } from "vitest";
import { mockPlatform } from "../support/mock-platform";

// Test 009 — keyword and semantic search over workspace documents.
describe("search", () => {
  it("009A query() is a full-text GET /search with the query string", async () => {
    const platform = mockPlatform({
      "GET /search": () => ({
        hits: [{ id: "doc_test_001", title: "invoice-001.pdf", snippet: "ABC Supplies Ltd ... INV-1045" }],
        total: 1,
        processing_time_ms: 12,
      }),
    });

    const res: any = await platform.client.search.query("INV-1045");

    expect(platform.last).toMatchObject({ method: "GET", path: "/search", query: { query: "INV-1045" } });
    expect(res).toMatchObject({ total: 1, processing_time_ms: 12 });
    expect(res.hits[0].id).toBe("doc_test_001");
  });

  it("009B semantic() is GET /search/semantic and returns hits ranked by score", async () => {
    const question = "which supplier invoices are above 2 million shillings?";
    const platform = mockPlatform({
      "GET /search/semantic": () => ({
        hits: [
          { id: "doc_test_001", chunk: "Invoice INV-1045 ...", score: 0.93 },
          { id: "doc_test_002", chunk: "Invoice INV-1046 ...", score: 0.88 },
        ],
        total: 2,
        processing_time_ms: 34,
      }),
    });

    const res: any = await platform.client.search.semantic(question);

    expect(platform.last).toMatchObject({ method: "GET", path: "/search/semantic", query: { query: question } });
    expect(res.hits.map((h: any) => h.score)).toEqual([0.93, 0.88]);
  });
});
