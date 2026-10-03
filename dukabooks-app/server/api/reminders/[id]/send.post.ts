// Reminders: send a composed draft (Test 018B — the SDK sends it as a PATCH).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;
  return sdk(() => useGptClient(event).email.outboundEmails.send(id));
});
