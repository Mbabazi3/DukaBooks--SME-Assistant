// Customers: CRM contacts for the workspace (Test 013B).
export default defineEventHandler(async (event) => {
  const { status } = getQuery(event);
  const { workspaceId } = useGptConfig(event);
  return sdk(() =>
    useGptClient(event).crm.contacts.listByWorkspace(workspaceId, status ? { status: String(status) } : {} as any)
  );
});
