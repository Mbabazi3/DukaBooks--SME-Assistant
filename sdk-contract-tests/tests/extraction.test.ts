import { describe, expect, it } from "vitest";
import { mockPlatform, resource } from "../support/mock-platform";

// Tests 008B, 008C, 010 — the invoice upload → extract → query pipeline.

const INVOICE_ROWS = [
  { supplier: "ABC Supplies Ltd", invoice_number: "INV-1042", total: 850000, currency: "UGX" },
  { supplier: "ABC Supplies Ltd", invoice_number: "INV-1045", total: 2450000, currency: "UGX" },
  { supplier: "Kampala Hardware", invoice_number: "INV-1046", total: 3100000, currency: "UGX" },
  { supplier: "Nile Agro Traders", invoice_number: "INV-1051", total: 1200000, currency: "UGX" },
  { supplier: "Kampala Hardware", invoice_number: "INV-1055", total: 4750000, currency: "UGX" },
];

type Filter = { field: string; op: string; value: any };
const matches = (row: any, f: Filter) => {
  switch (f.op) {
    case "gt": return row[f.field] > f.value;
    case "lt": return row[f.field] < f.value;
    case "eq": return row[f.field] === f.value;
    case "contains": return String(row[f.field]).includes(f.value);
    default: return true;
  }
};

// Behaves like the platform's query endpoint: filters rows and reports counts.
const queryEndpoint = ({ body }: { body: any }) => {
  const filters: Filter[] = body.filters ?? [];
  const rows = INVOICE_ROWS.filter((r) => filters.every((f) => matches(r, f)));
  return { rows, total: INVOICE_ROWS.length, filtered: rows.length, limit: body.limit ?? 1000, offset: body.offset ?? 0 };
};

describe("extraction.documents — upload lifecycle", () => {
  it("008B beginUpload returns a presigned upload_url, finishUpload queues processing", async () => {
    const platform = mockPlatform({
      "POST /extraction/documents/begin-upload": ({ body }) =>
        resource("doc_test_001", "extraction-document", {
          ...body.data.attributes,
          status: "pending_upload",
          upload_url: "https://storage.example.com/upload/doc_test_001",
        }),
      "PATCH /extraction/documents/doc_test_001/finish-upload": () =>
        resource("doc_test_001", "extraction-document", { status: "processing" }),
    });

    const doc: any = await platform.client.extraction.documents.beginUpload({
      workspace_id: "ws_test_001",
      filename: "invoice-001.pdf",
      file_type: "pdf",
      content_type: "application/pdf",
    } as any);

    expect(platform.last.body.data).toMatchObject({
      type: "extraction-document",
      attributes: { workspace_id: "ws_test_001", filename: "invoice-001.pdf", content_type: "application/pdf" },
    });
    expect(doc.status).toBe("pending_upload");
    expect(doc.upload_url).toMatch(/^https:\/\//);

    const finished: any = await platform.client.extraction.documents.finishUpload(doc.id);

    expect(platform.last).toMatchObject({ method: "PATCH", path: "/extraction/documents/doc_test_001/finish-upload" });
    expect(finished.status).toBe("processing");
  });

  it("status(id) reads the processing status", async () => {
    const platform = mockPlatform({
      "GET /extraction/documents/doc_test_001/status": () =>
        resource("doc_test_001", "extraction-document", { status: "completed", progress: 100 }),
    });

    const doc: any = await platform.client.extraction.documents.status("doc_test_001");

    expect(doc).toMatchObject({ status: "completed", progress: 100 });
  });
});

describe("extraction.results", () => {
  it("008C byDocument unwraps the result array with fields flattened", async () => {
    const platform = mockPlatform({
      "GET /extraction/results/document/doc_test_001": () => [
        resource("result_test_001", "extraction-result", {
          document_id: "doc_test_001",
          status: "completed",
          extracted_fields: { supplier: "ABC Supplies Ltd", total: 2450000 },
          rows: [INVOICE_ROWS[1]],
          avg_confidence: 0.96,
        }),
      ],
    });

    const results: any[] = await platform.client.extraction.results.byDocument("doc_test_001");

    expect(platform.last.method).toBe("GET");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "result_test_001",
      status: "completed",
      extracted_fields: { supplier: "ABC Supplies Ltd", total: 2450000 },
      avg_confidence: 0.96,
    });
    expect(results[0].rows[0].invoice_number).toBe("INV-1045");
  });

  it("010A query sends the filter to the server and returns only matching rows", async () => {
    const platform = mockPlatform({ "POST /extraction/results/result_test_001/query": queryEndpoint });

    const res: any = await platform.client.extraction.results.query("result_test_001", {
      filters: [{ field: "total", op: "gt", value: 2000000 }],
      limit: 100,
      offset: 0,
    } as any);

    expect(platform.last.body).toEqual({
      filters: [{ field: "total", op: "gt", value: 2000000 }],
      limit: 100,
      offset: 0,
    });
    expect(res.rows.map((r: any) => r.invoice_number)).toEqual(["INV-1045", "INV-1046", "INV-1055"]);
    expect(res).toMatchObject({ total: 5, filtered: 3, limit: 100, offset: 0 });
  });

  it("010B multiple filters are combined (AND)", async () => {
    const platform = mockPlatform({ "POST /extraction/results/result_test_001/query": queryEndpoint });

    const res: any = await platform.client.extraction.results.query("result_test_001", {
      filters: [
        { field: "supplier", op: "contains", value: "Kampala Hardware" },
        { field: "total", op: "gt", value: 2000000 },
      ],
    } as any);

    expect(platform.last.body.filters).toHaveLength(2);
    expect(res.rows.map((r: any) => r.invoice_number)).toEqual(["INV-1046", "INV-1055"]);
  });
});
