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

const PRODUCTS = [
  { id: "prod_test_001", type: "catalog-product", attributes: { workspace_id: "ws_test_001", name: "Cement (50kg bag)", sku: "CEM-50", base_price: "41000", currency: "UGX", status: "active", properties: { stock: 42 } } },
  { id: "prod_test_002", type: "catalog-product", attributes: { workspace_id: "ws_test_001", name: "Iron sheets (gauge 30)", sku: "IRN-30", base_price: "68000", currency: "UGX", status: "active", properties: { stock: 8 } } },
  { id: "prod_test_003", type: "catalog-product", attributes: { workspace_id: "ws_test_001", name: "Paint 20L (white)", sku: "PNT-20W", base_price: "125000", currency: "UGX", status: "active", properties: { stock: 0 } } }
];

const router = async (request) => {
  const path = new URL(request.url).pathname;
  await logRequest(request);

  // TEST 017A — create a product
  if (path === "/catalog/products") {
    return jsonapi({
      id: "prod_new_001",
      type: "catalog-product",
      attributes: {
        workspace_id: "ws_test_001",
        name: "Roof nails (5kg)",
        sku: "RNF-5",
        base_price: "18000",
        currency: "UGX",
        status: "active"
      }
    });
  }

  // TEST 017B — list products (path-segment pattern again)
  if (path === "/catalog/products/workspace/ws_test_001") {
    return jsonapi(PRODUCTS);
  }

  // TEST 018A — AI drafts the reminder email
  if (path === "/email/outbound-emails/compose-with-ai") {
    return jsonapi({
      id: "eml_test_001",
      type: "email-outbound-email",
      attributes: {
        subject: "Your cement order is ready for pickup",
        body_html:
          "<p>Dear Sarah,</p><p>Good news — your order of 20 bags of cement is ready for pickup. Total: UGX 820,000.</p><p>Thank you for your business!</p>",
        status: "draft",
        contact_ref_id: "con_test_001"
      }
    });
  }

  // TEST 018B — send it
  if (path === "/email/outbound-emails/eml_test_001/send") {
    return jsonapi({
      id: "eml_test_001",
      type: "email-outbound-email",
      attributes: { status: "sent", sent_at: "2026-09-03T10:15:00Z" }
    });
  }

  // TEST 018C — sent-reminder log for the workspace
  if (path === "/email/outbound-emails/workspace/ws_test_001") {
    return jsonapi([
      {
        id: "eml_test_001",
        type: "email-outbound-email",
        attributes: {
          subject: "Your cement order is ready for pickup",
          status: "sent",
          sent_at: "2026-09-03T10:15:00Z",
          contact_ref_id: "con_test_001"
        }
      }
    ]);
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

console.log("\n########## TEST 017A: catalog.products.create ##########");
const product = await client.catalog.products.create({
  workspace_id: "ws_test_001",
  name: "Roof nails (5kg)",
  sku: "RNF-5",
  base_price: "18000",
  currency: "UGX",
  status: "active"
});
console.log("\n=== SDK RESPONSE ===");
console.dir(product, { depth: null });

console.log("\n########## TEST 017B: catalog.products.list ##########");
const products = await client.catalog.products.list("ws_test_001");
console.log("\n=== SDK RESPONSE ===");
console.dir(products, { depth: null });

console.log("\n########## TEST 018A: email.outboundEmails.composeWithAi ##########");
const draft = await client.email.outboundEmails.composeWithAi({
  to: ["sarah@example.ug"],
  prompt:
    "Write a short, friendly payment/order reminder. The customer's order is ready for pickup: 20 bags of cement, total UGX 820,000. Sign as DukaBooks Hardware.",
  context: { order: "20 bags cement", total: 820000, currency: "UGX" },
  contact_ref_id: "con_test_001"
});
console.log("\n=== SDK RESPONSE ===");
console.dir(draft, { depth: null });

console.log("\n########## TEST 018B: email.outboundEmails.send ##########");
const sent = await client.email.outboundEmails.send(draft.id);
console.log("\n=== SDK RESPONSE ===");
console.dir(sent, { depth: null });

console.log("\n########## TEST 018C: email.outboundEmails.listByWorkspace ##########");
const sentList = await client.email.outboundEmails.listByWorkspace("ws_test_001");
console.log("\n=== SDK RESPONSE ===");
console.dir(sentList, { depth: null });
