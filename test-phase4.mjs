import { GptClient } from "@gpt-platform/client";

const logRequest = async (request) => {
  console.log("\n=== MOCK REQUEST ===");
  console.log("URL:", request.url);
  console.log("Method:", request.method);
  const bodyText = await request.text(); // read once
  if (bodyText) console.log("Body:", bodyText);
};

const jsonapi = (payload) =>
  new Response(JSON.stringify({ data: payload }), {
    status: 200,
    headers: { "Content-Type": "application/vnd.api+json" }
  });

const EVENT_TYPES = [
  { id: "evt_type_001", type: "scheduling-event-type", attributes: { name: "Shop consultation", duration_minutes: 30, slug: "shop-consultation", booking_enabled: true, location_type: "in_person" } },
  { id: "evt_type_002", type: "scheduling-event-type", attributes: { name: "Site measurement", duration_minutes: 60, slug: "site-measurement", booking_enabled: true, location_type: "in_person" } }
];

const TODAY_EVENTS = [
  { id: "evt_test_001", type: "scheduling-event", attributes: { title: "Site measurement — Nile Agro Traders", start_time: "2026-09-03T09:00:00Z", end_time: "2026-09-03T10:00:00Z", status: "confirmed", location_type: "in_person" } },
  { id: "evt_test_002", type: "scheduling-event", attributes: { title: "Consultation — David Okello", start_time: "2026-09-03T14:00:00Z", end_time: "2026-09-03T14:30:00Z", status: "confirmed", location_type: "in_person" } }
];

const router = async (request) => {
  const path = new URL(request.url).pathname;
  await logRequest(request);

  // TEST 019A — create a bookable service type
  if (path === "/scheduling/event-types") {
    return jsonapi({
      id: "evt_type_003",
      type: "scheduling-event-type",
      attributes: {
        name: "Shop consultation",
        duration_minutes: 30,
        slug: "shop-consultation",
        booking_enabled: true,
        location_type: "in_person"
      }
    });
  }

  // TEST 019B — book an event (note: NO workspace_id in the body)
  if (path === "/scheduling/events") {
    return jsonapi({
      id: "evt_new_001",
      type: "scheduling-event",
      attributes: {
        title: "Consultation — Grace Atim",
        start_time: "2026-09-04T11:00:00Z",
        end_time: "2026-09-04T11:30:00Z",
        status: "confirmed",
        location_type: "in_person",
        event_type_id: "evt_type_001"
      }
    });
  }

  // TEST 019C — day view
  if (path === "/scheduling/events/by_date_range") {
    return jsonapi(TODAY_EVENTS);
  }

  // TEST 019D — mark an event done
  if (path.startsWith("/scheduling/events/") && path.endsWith("/complete")) {
    return jsonapi({
      id: path.split("/")[3],
      type: "scheduling-event",
      attributes: { status: "completed" }
    });
  }

  return new Response(
    JSON.stringify({ errors: [{ title: "unrouted", detail: path }] }),
    { status: 404, headers: { "Content-Type": "application/vnd.api+json" } }
  );
};

const client = new GptClient({
  baseUrl: "https://api.gpt-core.com",
  fetch: router
});

console.log("\n########## TEST 019A: scheduling.eventTypes.create ##########");
const eventType = await client.scheduling.eventTypes.create({
  name: "Shop consultation",
  duration_minutes: 30,
  booking_enabled: true,
  location_type: "in_person"
});
console.log("\n=== SDK RESPONSE ===");
console.dir(eventType, { depth: null });

console.log("\n########## TEST 019B: scheduling.events.create ##########");
const event = await client.scheduling.events.create({
  title: "Consultation — Grace Atim",
  start_time: "2026-09-04T11:00:00Z",
  end_time: "2026-09-04T11:30:00Z",
  status: "confirmed",
  location_type: "in_person",
  event_type_id: eventType.id
});
console.log("\n=== SDK RESPONSE ===");
console.dir(event, { depth: null });

console.log("\n########## TEST 019C: scheduling.events.listByDateRange (today) ##########");
const todays = await client.scheduling.events.listByDateRange(
  "ws_test_001",
  "2026-09-03T00:00:00Z",
  "2026-09-03T23:59:59Z"
);
console.log("\n=== SDK RESPONSE ===");
console.dir(todays, { depth: null });

console.log("\n########## TEST 019D: scheduling.events.complete ##########");
const done = await client.scheduling.events.complete(TODAY_EVENTS[0].id);
console.log("\n=== SDK RESPONSE ===");
console.dir(done, { depth: null });
