// Follow-ups: log a call or note (Test 016B).
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { workspaceId } = useGptConfig(event);
  return sdk(() => useGptClient(event).crm.activities.create({ ...body, workspace_id: workspaceId } as any));
});
