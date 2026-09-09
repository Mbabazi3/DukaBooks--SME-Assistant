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

// One flagged invoice extraction awaiting human eyes.
const REVIEW = {
  id: "rev_test_001",
  type: "review",
  attributes: {
    workspace_id: "ws_test_001",
    queue_id: "queue_invoice_checks",
    status: "open",
    priority: "high",
    review_type: "field",
    reviewable_id: "doc_test_009",
    reviewable_type: "document",
    field_path: "total",
    notes: "Low confidence on extracted total (0.58)",
    opened_at: "2026-09-05T08:40:00Z",
    due_at: "2026-09-05T09:40:00Z",
    decision_payload: null,
    correction_payload: null
  }
};
let review = structuredClone(REVIEW);

const withStatus = (status, extra = {}) => ({
  ...review,
  attributes: { ...review.attributes, status, ...extra }
});

const router = async (request) => {
  const path = new URL(request.url).pathname;
  await logRequest(request);

  // TEST 020A — queue summaries (dashboard badge data)
  if (path === "/review-queues/summaries") {
    return jsonapi([
      { queue_id: "queue_invoice_checks", slug: "invoice-checks", name: "Invoice checks", pending_count: 2, sla_overdue_count: 1 }
    ]);
  }

  // TEST 020B — open reviews
  if (path === "/reviews") {
    return jsonapi([review]);
  }

  // TEST 020C — claim it
  if (path === "/reviews/rev_test_001/claim") {
    review = withStatus("assigned", { assigned_user_id: "user_anthony", claim_was_assigned: false });
    return jsonapi(review);
  }

  // TEST 020D — send the correction (human fixed the total)
  if (path === "/reviews/rev_test_001/correct") {
    review = withStatus("corrected", {
      correction_payload: { total: 2050000 },
      completed_at: "2026-09-05T08:52:00Z"
    });
    return jsonapi(review);
  }

  // TEST 020E — approve a different one
  if (path === "/reviews/rev_test_002/approve") {
    return jsonapi({
      id: "rev_test_002",
      type: "review",
      attributes: {
        workspace_id: "ws_test_001",
        queue_id: "queue_invoice_checks",
        status: "approved",
        review_type: "field",
        reviewable_id: "doc_test_010",
        reviewable_type: "document",
        decision_payload: { verdict: "ai_was_right" },
        completed_at: "2026-09-05T08:55:00Z"
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

console.log("\n########## TEST 020A: reviews.queues.summaries ##########");
const summaries = await client.reviews.queues.summaries();
console.log("\n=== SDK RESPONSE ===");
console.dir(summaries, { depth: null });

console.log("\n########## TEST 020B: reviews.list ##########");
const open = await client.reviews.list({ pageSize: 20 });
console.log("\n=== SDK RESPONSE ===");
console.dir(open, { depth: null });

console.log("\n########## TEST 020C: reviews.claim ##########");
const claimed = await client.reviews.claim("rev_test_001");
console.log("\n=== SDK RESPONSE ===");
console.dir(claimed, { depth: null });

console.log("\n########## TEST 020D: reviews.correct (human fixes the value) ##########");
const corrected = await client.reviews.correct("rev_test_001", {
  correction_payload: { total: 2050000 },
  notes: "Actual total on paper is UGX 2,050,000"
});
console.log("\n=== SDK RESPONSE ===");
console.dir(corrected, { depth: null });

console.log("\n########## TEST 020E: reviews.approve (AI was right) ##########");
const approved = await client.reviews.approve("rev_test_002", {
  decision_payload: { verdict: "ai_was_right" }
});
console.log("\n=== SDK RESPONSE ===");
console.dir(approved, { depth: null });
