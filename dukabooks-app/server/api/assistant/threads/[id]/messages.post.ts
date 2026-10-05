// Ask AI: stream the agent's answer to the browser as Server-Sent Events (Test 011C).
//
// Grounding: the shop's extracted invoices are attached to each question as
// JSON, so the agent answers from the shop's own data. (Whether a thread's
// agent can read workspace extractions directly is an open platform question —
// see BACKEND-NEEDS.md.)
const MAX_ROWS = 50;

export default defineEventHandler(async (event) => {
  const threadId = getRouterParam(event, "id")!;
  const { content } = (await readBody(event)) ?? {};
  if (!content?.trim()) throw createError({ statusCode: 400, statusMessage: "content is required" });

  const invoices = (await loadInvoices().catch(() => [])).slice(-MAX_ROWS);
  const context = invoices.map(({ supplier, invoice_number, invoice_date, total, currency }) => ({
    supplier, invoice_number, invoice_date, total, currency,
  }));
  const message = `${content.trim()}\n\n[DukaBooks invoices (${context.length})]\n${JSON.stringify(context)}`;

  const iterator = await sdk(() => useGptClient().threads.messages.stream(threadId, { content: message }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      try {
        for await (const chunk of iterator) send(chunk);
      } catch (err: any) {
        send({ type: "error", error: err?.message ?? "stream failed" });
      } finally {
        controller.close();
      }
    },
  });

  setResponseHeaders(event, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  return sendStream(event, stream);
});
