import { describe, expect, it } from "vitest";
import { mockPlatform, resource } from "../support/mock-platform";

// Test 019 — appointments.
const WS = "ws_test_001";

describe("scheduling.eventTypes", () => {
  it("019A create() posts a bookable service", async () => {
    const platform = mockPlatform({
      "POST /scheduling/event-types": ({ body }) => resource("evt_type_003", "scheduling-event-type", { ...body.data.attributes, slug: "shop-consultation" }),
    });

    const type: any = await platform.client.scheduling.eventTypes.create({
      name: "Shop consultation", duration_minutes: 30, booking_enabled: true, location_type: "in_person",
    } as any);

    expect(platform.last.body.data.type).toBe("scheduling-event-type");
    expect(type).toMatchObject({ id: "evt_type_003", slug: "shop-consultation", duration_minutes: 30 });
  });

  it("list(ws) passes the workspace as a query param", async () => {
    const platform = mockPlatform({
      "GET /scheduling/event-types": () => [resource("evt_type_001", "scheduling-event-type", { name: "Shop consultation" })],
    });

    await platform.client.scheduling.eventTypes.list(WS);

    expect(platform.last.query).toEqual({ workspace_id: WS });
  });
});

describe("scheduling.events", () => {
  it("019B create() has NO workspace_id in the body", async () => {
    const platform = mockPlatform({
      "POST /scheduling/events": ({ body }) => resource("evt_test_010", "scheduling-event", body.data.attributes),
    });

    await platform.client.scheduling.events.create({
      title: "Consultation — Grace Atim",
      start_time: "2026-09-04T11:00:00Z",
      end_time: "2026-09-04T11:30:00Z",
      status: "confirmed",
      location_type: "in_person",
      event_type_id: "evt_type_003",
    } as any);

    expect(platform.last.body.data.type).toBe("scheduling-event");
    expect(platform.last.body.data.attributes).not.toHaveProperty("workspace_id");
  });

  it("019C listByDateRange() sends workspace and times as query params", async () => {
    const platform = mockPlatform({
      "GET /scheduling/events/by_date_range": () => [
        resource("evt_test_001", "scheduling-event", { title: "Site measurement", start_time: "2026-09-03T09:00:00Z" }),
      ],
    });

    const events: any[] = await platform.client.scheduling.events.listByDateRange(WS, "2026-09-03T00:00:00Z", "2026-09-03T23:59:59Z");

    expect(platform.last.query).toEqual({
      workspace_id: WS,
      start_time: "2026-09-03T00:00:00Z",
      end_time: "2026-09-03T23:59:59Z",
    });
    expect(events[0].title).toBe("Site measurement");
  });

  it.each(["complete", "cancel"] as const)("019D %s() is a PATCH with a bare { id, type } body", async (action) => {
    const platform = mockPlatform({
      [`PATCH /scheduling/events/evt_test_001/${action}`]: () =>
        resource("evt_test_001", "scheduling-event", { status: action === "complete" ? "completed" : "cancelled" }),
    });

    await platform.client.scheduling.events[action]("evt_test_001");

    expect(platform.last.body).toEqual({ data: { id: "evt_test_001", type: "scheduling-event" } });
  });
});
