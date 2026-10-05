// Deals board: create a deal (Test 014A). The company goes into `properties`.
export default defineEventHandler(async (event) => {
  const { company, ...rest } = await readBody(event);
  const { workspaceId } = useGptConfig();
  const deal = await sdk(() =>
    useGptClient().crm.deals.create({
      currency: "UGX",
      ...rest,
      workspace_id: workspaceId,
      properties: { company },
    } as any)
  );
  return withCompany(deal);
});
