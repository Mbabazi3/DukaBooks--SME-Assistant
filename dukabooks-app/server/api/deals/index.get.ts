// Deals board: deals for the workspace, with the company name surfaced.
export default defineEventHandler(async (event) => {
  const { workspaceId } = useGptConfig(event);
  const deals: any[] = await sdk(() => useGptClient(event).crm.deals.listByWorkspace(workspaceId));
  return deals.map(withCompany);
});
