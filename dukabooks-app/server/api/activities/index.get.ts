// Follow-ups: recent CRM activities (Test 016C).
export default defineEventHandler(async (event) => {
  const { workspaceId } = useGptConfig();
  return sdk(() => useGptClient().crm.activities.listByWorkspace(workspaceId));
});
