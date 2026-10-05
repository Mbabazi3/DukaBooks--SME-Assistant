import { describe, expect, it } from "vitest";
import { mockPlatform, resource } from "../support/mock-platform";

// Tests 017 (inventory) and 018 (AI-written reminders).
const WS = "ws_test_001";

describe("catalog.products", () => {
  it("017A create() keeps base_price as a decimal STRING", async () => {
    const platform = mockPlatform({
      "POST /catalog/products": ({ body }) => resource("prod_test_004", "catalog-product", body.data.attributes),
    });

    const product: any = await platform.client.catalog.products.create({
      workspace_id: WS, name: "Roof nails (5kg)", sku: "RNF-5", base_price: "18000", currency: "UGX", status: "active",
    } as any);

    expect(platform.last.body.data.type).toBe("catalog-product");
    expect(platform.last.body.data.attributes.base_price).toBe("18000");
    expect(typeof product.base_price).toBe("string");
  });

  it("017B list(ws) takes the workspace id directly; stock lives in properties", async () => {
    const platform = mockPlatform({
      [`GET /catalog/products/workspace/${WS}`]: () => [
        resource("prod_test_001", "catalog-product", { name: "Cement (50kg bag)", base_price: "41000", properties: { stock: 42 } }),
      ],
    });

    const products: any[] = await platform.client.catalog.products.list(WS);

    expect(platform.last.path).toBe(`/catalog/products/workspace/${WS}`);
    expect(products[0]).toMatchObject({ name: "Cement (50kg bag)", properties: { stock: 42 } });
  });

  it("update() is a PATCH of the given fields", async () => {
    const platform = mockPlatform({
      "PATCH /catalog/products/prod_test_001": ({ body }) => resource("prod_test_001", "catalog-product", body.data.attributes),
    });

    await platform.client.catalog.products.update("prod_test_001", { properties: { stock: 40 } } as any);

    expect(platform.last.body).toEqual({
      data: { type: "catalog-product", id: "prod_test_001", attributes: { properties: { stock: 40 } } },
    });
  });
});

describe("email.outboundEmails", () => {
  it("018A composeWithAi() sends the prompt + context and returns a draft", async () => {
    const platform = mockPlatform({
      "POST /email/outbound-emails/compose-with-ai": () =>
        resource("eml_test_001", "email-outbound-email", {
          status: "draft", subject: "Your order is ready for pickup", body_html: "<p>Dear Sarah ...</p>",
        }),
    });

    const draft: any = await platform.client.email.outboundEmails.composeWithAi({
      to: ["sarah@example.ug"],
      prompt: "Write a short, friendly order-ready reminder. Sign as DukaBooks Hardware.",
      context: { order: "20 bags cement", total: 820000, currency: "UGX" },
      contact_ref_id: "con_test_001",
    } as any);

    expect(platform.last.body.data).toEqual({
      type: "email-outbound-email",
      attributes: {
        to: ["sarah@example.ug"],
        prompt: "Write a short, friendly order-ready reminder. Sign as DukaBooks Hardware.",
        context: { order: "20 bags cement", total: 820000, currency: "UGX" },
        contact_ref_id: "con_test_001",
      },
    });
    expect(draft).toMatchObject({ id: "eml_test_001", status: "draft", subject: "Your order is ready for pickup" });
  });

  it("018B send() is a PATCH with a bare { id, type } body", async () => {
    const platform = mockPlatform({
      "PATCH /email/outbound-emails/eml_test_001/send": () =>
        resource("eml_test_001", "email-outbound-email", { status: "sent", sent_at: "2026-09-03T10:15:00Z" }),
    });

    const sent: any = await platform.client.email.outboundEmails.send("eml_test_001");

    expect(platform.last.method).toBe("PATCH");
    expect(platform.last.body).toEqual({ data: { id: "eml_test_001", type: "email-outbound-email" } });
    expect(sent.status).toBe("sent");
  });

  it("018C listByWorkspace() returns the sent log", async () => {
    const platform = mockPlatform({
      [`GET /email/outbound-emails/workspace/${WS}`]: () => [
        resource("eml_test_001", "email-outbound-email", { status: "sent", sent_at: "2026-09-03T10:15:00Z" }),
      ],
    });

    const emails: any[] = await platform.client.email.outboundEmails.listByWorkspace(WS);

    expect(emails[0]).toMatchObject({ status: "sent", sent_at: "2026-09-03T10:15:00Z" });
  });
});
