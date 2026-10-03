// Ask AI: open a chat thread bound to our agent (Test 011A).
export default defineEventHandler(async (event) => {
  const { title = "SME Invoice Assistant" } = await readBody(event);
  const { agentId } = useGptConfig();
  // agent_id is optional: without GPT_PLATFORM_AGENT_ID the thread uses the platform default.
  return sdk(() => useGptClient().threads.create({ title, ...(agentId && { agent_id: agentId }) } as any));
});
