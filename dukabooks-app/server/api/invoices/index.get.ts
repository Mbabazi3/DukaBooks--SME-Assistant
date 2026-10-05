// Dashboard + Invoices: every processed document's extracted invoice, optionally
// filtered (e.g. ?field=total&op=gt&value=2000000). Same shape as results.query.
type Op = "gt" | "lt" | "eq" | "contains";

const test = (row: any, field: string, op: Op, value: any) => {
  const v = row[field];
  switch (op) {
    case "gt": return Number(v) > Number(value);
    case "lt": return Number(v) < Number(value);
    case "eq": return String(v) === String(value);
    case "contains": return String(v ?? "").toLowerCase().includes(String(value).toLowerCase());
    default: return true;
  }
};

export default defineEventHandler(async (event) => {
  const { field, op, value } = getQuery(event) as { field?: string; op?: Op; value?: string };
  const all = await loadInvoices();
  const rows = field && op && value !== undefined && value !== "" ? all.filter((r) => test(r, field, op, value)) : all;
  rows.sort((a, b) => String(a.invoice_date ?? "").localeCompare(String(b.invoice_date ?? "")));
  return { rows, total: all.length, filtered: rows.length };
});
