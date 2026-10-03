// Ask AI: open a chat thread bound to our agent (Test 011A).
export default defineEventHandler(async (event) => {
  const { title = "SME Invoice Assistant" } = await readBody(event);
  const { agentId } = useGptConfig(event);
  return sdk(() => useGptClient(event).threads.create({ title, agent_id: agentId } as any));
});
