import { GptClient } from "@gpt-platform/client";

const logRequest = async (request) => {
  console.log("\n=== MOCK REQUEST ===");
  console.log("URL:", request.url);
  console.log("Method:", request.method);
  const bodyText = await request.text(); // read once
  if (bodyText) console.log("Body:", bodyText);
  return bodyText;
};

const jsonapi = (payload) =>
  new Response(JSON.stringify({ data: payload }), {
    status: 200,
    headers: { "Content-Type": "application/vnd.api+json" }
  });

const router = async (request) => {
  const url = new URL(request.url);
  const path = url.pathname;
  await logRequest(request);

  // TEST 013A — create a company
  if (path === "/crm/companies") {
    return jsonapi({
      id: "com_test_001",
      type: "crm-company",
      attributes: {
        workspace_id: "ws_test_001",
        name: "Kampala Hardware Ltd",
        industry: "retail",
        location: "Kampala"
      }
    });
  }

  // TEST 013B — list contacts in the workspace
  // (SDK uses a path segment, not a query param: /crm/contacts/workspace/:id)
  if (path === "/crm/contacts/workspace/ws_test_001") {
    return jsonapi([
      {
        id: "con_test_001",
        type: "crm-contact",
        attributes: {
          workspace_id: "ws_test_001",
          first_name: "Sarah",
          last_name: "Nabukenya",
          phone: "+256772123456",
          lifecycle_stage: "customer"
        }
      },
      {
        id: "con_test_002",
        type: "crm-contact",
        attributes: {
          workspace_id: "ws_test_001",
          first_name: "David",
          last_name: "Okello",
          phone: "+256701987654",
          lifecycle_stage: "lead"
        }
      }
    ]);
  }

  // TEST 014A — create a deal
  if (path === "/crm/deals") {
    return jsonapi({
      id: "deal_test_001",
      type: "crm-deal",
      attributes: {
        workspace_id: "ws_test_001",
        name: "Kampala Hardware — bulk cement order",
        amount: 3100000,
        currency: "UGX",
        status: "open",
        pipeline_stage_id: "stage_negotiating"
      }
    });
  }

  // TEST 014B — move a deal to another stage
  if (path === "/crm/deals/deal_test_001/move-stage") {
    return jsonapi({
      id: "deal_test_001",
      type: "crm-deal",
      attributes: {
        workspace_id: "ws_test_001",
        name: "Kampala Hardware — bulk cement order",
        amount: 3100000,
        currency: "UGX",
        status: "open",
        pipeline_stage_id: "stage_closed_won"
      }
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

console.log("\n########## TEST 013A: crm.companies.create ##########");
const company = await client.crm.companies.create({
  workspace_id: "ws_test_001",
  name: "Kampala Hardware Ltd",
  industry: "retail",
  location: "Kampala"
});
console.log("\n=== SDK RESPONSE ===");
console.dir(company, { depth: null });

console.log("\n########## TEST 013B: crm.contacts.listByWorkspace ##########");
const contacts = await client.crm.contacts.listByWorkspace("ws_test_001");
console.log("\n=== SDK RESPONSE ===");
console.dir(contacts, { depth: null });

console.log("\n########## TEST 014A: crm.deals.create ##########");
const deal = await client.crm.deals.create({
  workspace_id: "ws_test_001",
  name: "Kampala Hardware — bulk cement order",
  amount: 3100000,
  currency: "UGX",
  pipeline_stage_id: "stage_negotiating"
});
console.log("\n=== SDK RESPONSE ===");
console.dir(deal, { depth: null });

console.log("\n########## TEST 014B: crm.deals.moveStage ##########");
const moved = await client.crm.deals.moveStage("deal_test_001", {
  stage_id: "stage_closed_won"
});
console.log("\n=== SDK RESPONSE ===");
console.dir(moved, { depth: null });
