// Deals board: move a deal to another column (Test 014B).
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")!;
  const { stage_id } = await readBody(event);
  const deal = await sdk(() => useGptClient(event).crm.deals.moveStage(id, { stage_id } as any));
  return withCompany(deal);
});
