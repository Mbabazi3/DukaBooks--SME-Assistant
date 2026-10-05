// Appointments: bookable service types.
export default defineEventHandler(async (event) => {
  const { workspaceId } = useGptConfig();
  return sdk(() => useGptClient().scheduling.eventTypes.list(workspaceId));
});
