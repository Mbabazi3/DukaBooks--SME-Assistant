// Inventory: add a product (Test 017A). base_price must be a decimal STRING.
export default defineEventHandler(async (event) => {
  const { stock = 0, base_price, ...rest } = await readBody(event);
  const { workspaceId } = useGptConfig();
  const product = await sdk(() =>
    useGptClient().catalog.products.create({
      currency: "UGX",
      ...rest,
      base_price: String(base_price),
      workspace_id: workspaceId,
      properties: { stock: Number(stock) },
    } as any)
  );
  return withStock(product);
});
