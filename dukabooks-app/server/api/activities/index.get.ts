// Follow-ups: recent CRM activities (Test 016C).
export default defineEventHandler(async (event) => {
  const { workspaceId } = useGptConfig(event);
  return sdk(() => useGptClient(event).crm.activities.listByWorkspace(workspaceId));
});
