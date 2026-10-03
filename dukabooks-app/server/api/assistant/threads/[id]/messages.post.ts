// Ask AI: stream the agent's answer to the browser as Server-Sent Events (Test 011C).
// Each SDK chunk ({ type: "token" | "done" | ... }) is forwarded as one `data:` line.
export default defineEventHandler(async (event) => {
  const threadId = getRouterParam(event, "id")!;
  const { content } = await readBody(event);
  const client = useGptClient(event);
  const iterator = await sdk(() => client.threads.messages.stream(threadId, { content }));

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

  setResponseHeaders(event, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  return sendStream(event, stream);
});
