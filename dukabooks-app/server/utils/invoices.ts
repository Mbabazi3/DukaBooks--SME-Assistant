// Turns extraction results into invoice rows the Dashboard, Invoices and Ask AI use.
//
// On the real platform every uploaded document gets its own extraction result,
// so "all my invoices" = every processed document in the workspace → its result
// → the extracted fields. Field names depend on the extraction schema, so we
// accept the common variants and normalise them.

export interface InvoiceRow {
  document_id: string;
  result_id?: string;
  supplier: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total: number;
  currency: string;
  confidence: number | null;
}

const DONE = ["completed", "partial"];

const FIELD_ALIASES: Record<string, string[]> = {
  supplier: ["supplier", "supplier_name", "vendor", "vendor_name", "seller", "seller_name", "issuer", "from", "company_name"],
  invoice_number: ["invoice_number", "invoice_no", "invoice_id", "number", "document_number", "reference"],
  invoice_date: ["invoice_date", "date", "issue_date", "issued_on", "document_date"],
  total: ["total", "total_amount", "grand_total", "amount_due", "amount", "invoice_total", "balance_due"],
  currency: ["currency", "currency_code"],
};

/** A field may be a plain value or { value, confidence }. */
const plain = (v: unknown): unknown => (v && typeof v === "object" && "value" in (v as any) ? (v as any).value : v);

function pick(fields: Record<string, unknown>, key: keyof typeof FIELD_ALIASES): unknown {
  const lower = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k.toLowerCase(), v]));
  for (const alias of FIELD_ALIASES[key]) {
    const v = plain(lower[alias]);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

/** "UGX 1,200,000" / "1.200.000" / 1200000 → 1200000 */
export function toAmount(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return 0;
  const digits = v.replace(/[^\d.,-]/g, "");
  // Treat both , and . as thousands separators unless the last group looks like decimals.
  const m = digits.match(/^(.*?)[.,](\d{1,2})$/);
  const whole = (m ? m[1] : digits).replace(/[.,]/g, "");
  const n = Number(m ? `${whole}.${m[2]}` : whole);
  return Number.isFinite(n) ? n : 0;
}

/** Normalised view of one result's extracted fields (raw fields kept alongside). */
export function normaliseFields(fields: Record<string, unknown> = {}) {
  const total = pick(fields, "total");
  return {
    supplier: (pick(fields, "supplier") as string) ?? null,
    invoice_number: (pick(fields, "invoice_number") as string) ?? null,
    invoice_date: (pick(fields, "invoice_date") as string) ?? null,
    total: toAmount(total),
    currency: String(pick(fields, "currency") ?? "UGX"),
  };
}

export async function loadInvoices(limit = 50): Promise<InvoiceRow[]> {
  const { workspaceId } = useGptConfig();
  const client = useGptClient();
  const docs: any[] = await sdk(() => client.extraction.documents.listByWorkspace(workspaceId, { pageSize: limit }));
  const processed = docs.filter((d) => DONE.includes(d.status));

  const rows = await Promise.all(
    processed.map(async (doc): Promise<InvoiceRow | null> => {
      const results: any[] = await client.extraction.results.byDocument(doc.id).catch(() => []);
      const result = results?.[0];
      if (!result) return null;
      const f = normaliseFields(result.extracted_fields);
      return {
        document_id: doc.id,
        result_id: result.id,
        ...f,
        invoice_number: f.invoice_number ?? doc.filename ?? doc.id,
        confidence: result.avg_confidence ?? null,
      };
    })
  );
  return rows.filter((r): r is InvoiceRow => r !== null);
}
