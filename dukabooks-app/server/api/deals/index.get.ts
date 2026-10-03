// Deals board: deals for the workspace, with the company name surfaced.
export default defineEventHandler(async (event) => {
  const { workspaceId } = useGptConfig();
  const deals: any[] = await sdk(() => useGptClient().crm.deals.listByWorkspace(workspaceId));
  return deals.map(withCompany);
});
