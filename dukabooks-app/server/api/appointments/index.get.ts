// Appointments: day/week view (Test 019C).
export default defineEventHandler(async (event) => {
  const { start, end } = getQuery(event);
  const { workspaceId } = useGptConfig(event);
  const events: any[] = await sdk(() =>
    useGptClient(event).scheduling.events.listByDateRange(workspaceId, String(start), String(end))
  );
  return [...events].sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
});
