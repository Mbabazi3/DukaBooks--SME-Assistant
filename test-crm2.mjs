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

const STAGES = [
  { id: "stage_lead", type: "crm-pipeline-stage", pipeline_id: "pipe_test_001", name: "Lead", order: 1 },
  { id: "stage_quoted", type: "crm-pipeline-stage", pipeline_id: "pipe_test_001", name: "Quoted", order: 2 },
  { id: "stage_negotiating", type: "crm-pipeline-stage", pipeline_id: "pipe_test_001", name: "Negotiating", order: 3 },
  { id: "stage_closed_won", type: "crm-pipeline-stage", pipeline_id: "pipe_test_001", name: "Won", order: 4 },
  { id: "stage_closed_lost", type: "crm-pipeline-stage", pipeline_id: "pipe_test_001", name: "Lost", order: 5 }
];

const router = async (request) => {
  const path = new URL(request.url).pathname;
  await logRequest(request);

  // TEST 015A — pipelines for the workspace
  if (path === "/crm/pipelines/workspace/ws_test_001") {
    return jsonapi([
      { id: "pipe_test_001", type: "crm-pipeline", attributes: { workspace_id: "ws_test_001", name: "Sales" } }
    ]);
  }

  // TEST 015B — stages of a pipeline
  if (path === "/crm/pipeline-stages/pipeline/pipe_test_001") {
    return jsonapi(STAGES.map(({ id, type, ...attributes }) => ({ id, type, attributes })));
  }

  // TEST 016A — promote a contact (lifecycle stage change)
  if (path === "/crm/contacts/con_test_002") {
    return jsonapi({
      id: "con_test_002",
      type: "crm-contact",
      attributes: {
        workspace_id: "ws_test_001",
        first_name: "David",
        last_name: "Okello",
        phone: "+256701987654",
        lifecycle_stage: "customer"
      }
    });
  }

  // TEST 016B — log a follow-up activity
  if (path === "/crm/activities") {
    return jsonapi({
      id: "act_test_001",
      type: "crm-activity",
      attributes: {
        workspace_id: "ws_test_001",
        type: "note",
        subject: "Call David about cement quote",
        body: "He asked for a discount on bulk orders.",
        occurred_at: "2026-09-03T10:00:00Z"
      }
    });
  }

  // TEST 016C — recent activities
  if (path === "/crm/activities/workspace/ws_test_001") {
    return jsonapi([
      {
        id: "act_test_001",
        type: "crm-activity",
        attributes: {
          workspace_id: "ws_test_001",
          type: "note",
          subject: "Call David about cement quote",
          body: "He asked for a discount on bulk orders.",
          occurred_at: "2026-09-03T10:00:00Z"
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

console.log("\n########## TEST 015A: crm.pipelines.listByWorkspace ##########");
const pipelines = await client.crm.pipelines.listByWorkspace("ws_test_001");
console.log("\n=== SDK RESPONSE ===");
console.dir(pipelines, { depth: null });

console.log("\n########## TEST 015B: crm.pipelineStages.listByPipeline ##########");
const stages = await client.crm.pipelineStages.listByPipeline(pipelines[0].id);
console.log("\n=== SDK RESPONSE ===");
console.dir(stages, { depth: null });

console.log("\n########## TEST 016A: crm.contacts.update (promote lead → customer) ##########");
const promoted = await client.crm.contacts.update("con_test_002", {
  lifecycle_stage: "customer"
});
console.log("\n=== SDK RESPONSE ===");
console.dir(promoted, { depth: null });

console.log("\n########## TEST 016B: crm.activities.create (follow-up note) ##########");
const activity = await client.crm.activities.create({
  workspace_id: "ws_test_001",
  type: "note",
  subject: "Call David about cement quote",
  body: "He asked for a discount on bulk orders."
});
console.log("\n=== SDK RESPONSE ===");
console.dir(activity, { depth: null });

console.log("\n########## TEST 016C: crm.activities.listByWorkspace ##########");
const activities = await client.crm.activities.listByWorkspace("ws_test_001");
console.log("\n=== SDK RESPONSE ===");
console.dir(activities, { depth: null });
