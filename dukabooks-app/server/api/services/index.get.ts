// Appointments: bookable service types.
export default defineEventHandler(async (event) => {
  const { workspaceId } = useGptConfig(event);
  return sdk(() => useGptClient(event).scheduling.eventTypes.list(workspaceId));
});
