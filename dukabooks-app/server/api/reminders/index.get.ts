// Reminders: sent-email log (Test 018C).
export default defineEventHandler(async (event) => {
  const { workspaceId } = useGptConfig(event);
  return sdk(() => useGptClient(event).email.outboundEmails.listByWorkspace(workspaceId));
});
