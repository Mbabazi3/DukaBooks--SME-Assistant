// Customers: promote lead → customer (Test 016A, PATCH semantics).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;
  const { lifecycle_stage } = await readBody(event);
  return sdk(() => useGptClient().crm.contacts.update(id, { lifecycle_stage } as any));
});
