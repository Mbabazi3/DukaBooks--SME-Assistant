// Customers: add a contact (Test 008A).
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { workspaceId } = useGptConfig(event);
  return sdk(() => useGptClient(event).crm.contacts.create({ lifecycle_stage: "lead", ...body, workspace_id: workspaceId } as any));
});
