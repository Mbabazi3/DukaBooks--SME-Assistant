// Inventory: catalog products (Test 017B). Stock lives in `properties` on the platform.
export default defineEventHandler(async (event) => {
  const { workspaceId } = useGptConfig(event);
  const products: any[] = await sdk(() => useGptClient(event).catalog.products.list(workspaceId));
  return products.map(withStock);
});
