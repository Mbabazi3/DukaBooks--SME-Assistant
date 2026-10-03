// Dashboard + Invoices: server-side row filtering over extracted invoices (Test 010).
export default defineEventHandler(async (event) => {
  const { field = "total", op = "gt", value = 0 } = getQuery(event);
  const { invoiceResultId } = useGptConfig(event);
  const client = useGptClient(event);
  return sdk(() =>
    client.extraction.results.query(invoiceResultId, {
      filters: [{ field: String(field), op: String(op), value: Number(value) }],
      limit: 100,
      offset: 0,
    } as any)
  );
});
