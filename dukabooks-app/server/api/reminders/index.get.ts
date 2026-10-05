// Reminders: sent-email log (Test 018C).
export default defineEventHandler(async (event) => {
  const { workspaceId } = useGptConfig();
  return sdk(() => useGptClient().email.outboundEmails.listByWorkspace(workspaceId));
});
