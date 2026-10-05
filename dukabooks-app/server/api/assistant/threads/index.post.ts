// Ask AI: open a chat thread bound to the DukaBooks agent (Test 011A).
export default defineEventHandler(async (event) => {
  const { title = "SME Invoice Assistant" } = (await readBody(event)) ?? {};
  const agent_id = await ensureAgentId();
  const thread: any = await sdk(() => useGptClient().threads.create({ title, agent_id }));
  const invoices = await loadInvoices().catch(() => []);
  return { id: thread.id, agent_id, invoice_count: invoices.length };
});
