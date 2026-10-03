// Appointments: book (Test 019B). No workspace_id in the body — the platform infers it.
export default defineEventHandler(async (event) => {
  const { title, startIso, endIso, serviceId } = await readBody(event);
  return sdk(() =>
    useGptClient(event).scheduling.events.create({
      title,
      start_time: startIso,
      end_time: endIso,
      status: "confirmed",
      location_type: "in_person",
      event_type_id: serviceId,
    } as any)
  );
});
