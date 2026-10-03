// Appointments: mark done or cancel (Test 019D — both are PATCHes).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;
  const action = getRouterParam(event, "action");
  const events = useGptClient(event).scheduling.events;
  if (action === "complete") return sdk(() => events.complete(id));
  if (action === "cancel") return sdk(() => events.cancel(id));
  throw createError({ statusCode: 404, statusMessage: `Unknown appointment action: ${action}` });
});
