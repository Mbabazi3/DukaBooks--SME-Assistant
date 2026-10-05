import { describe, expect, it } from "vitest";
import { GptClient } from "@gpt-platform/client";
import { API_KEY, BASE_URL, DEFAULT_API_VERSION, SDK_VERSION, mockPlatform, resource } from "../support/mock-platform";

// Test 001 + the request shape every namespace shares.
describe("GptClient basics", () => {
  it("001 constructs without network access", () => {
    const client = new GptClient({ baseUrl: BASE_URL, apiKey: API_KEY });
    expect(client.apiVersion).toBe(DEFAULT_API_VERSION);
    expect(DEFAULT_API_VERSION).toBe("2026-07-12"); // the version TEST-NOTES was written against
  });

  it("puts a JSON:API request on the wire with the standard headers", async () => {
    const platform = mockPlatform({
      "POST /crm/contacts": () => resource("con_456", "crm-contact", { first_name: "Jane" }),
    });

    await platform.client.crm.contacts.create({ workspace_id: "ws_1", first_name: "Jane" } as any);

    const req = platform.last;
    expect(req.method).toBe("POST");
    expect(req.path).toBe("/crm/contacts");
    expect(req.body).toEqual({
      data: { type: "crm-contact", attributes: { workspace_id: "ws_1", first_name: "Jane" } },
    });
    expect(req.headers["idempotency-key"]).toBeTruthy();
    expect(req.headers["user-agent"]).toBe(`GPTCore/JS ${SDK_VERSION}`);
    expect(req.headers["accept"]).toBe(`application/vnd.api+json; version=${DEFAULT_API_VERSION}`);
    expect(req.headers["x-application-key"]).toBe(API_KEY);
  });

  it("flattens resource attributes onto the returned object", async () => {
    const platform = mockPlatform({
      "GET /crm/contacts/con_123": () => resource("con_123", "crm-contact", { first_name: "John", last_name: "Doe" }),
    });

    const contact: any = await platform.client.crm.contacts.get("con_123");

    expect(contact).toMatchObject({ id: "con_123", type: "crm-contact", first_name: "John", last_name: "Doe" });
  });
});
