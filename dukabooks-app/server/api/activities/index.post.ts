// Follow-ups: log a call or note (Test 016B).
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { workspaceId } = useGptConfig();
  return sdk(() => useGptClient().crm.activities.create({ ...body, workspace_id: workspaceId } as any));
});
