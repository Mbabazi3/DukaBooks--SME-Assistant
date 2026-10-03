// Deals board columns: first pipeline in the workspace → its ordered stages (Test 015).
export default defineEventHandler(async (event) => {
  const { workspaceId } = useGptConfig(event);
  const client = useGptClient(event);
  const pipelines: any[] = await sdk(() => client.crm.pipelines.listByWorkspace(workspaceId));
  if (!pipelines.length) return [];
  const stages: any[] = await sdk(() => client.crm.pipelineStages.listByPipeline(pipelines[0].id));
  return [...stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
});
