// Inventory: catalog products (Test 017B). Stock lives in `properties` on the platform.
export default defineEventHandler(async (event) => {
  const { workspaceId } = useGptConfig();
  const products: any[] = await sdk(() => useGptClient().catalog.products.list(workspaceId));
  return products.map(withStock);
});
