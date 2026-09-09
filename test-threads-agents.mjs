import { GptClient } from "@gpt-platform/client";

const jsonapi = (payload) =>
  new Response(JSON.stringify({ data: payload }), {
    status: 200,
    headers: { "Content-Type": "application/vnd.api+json" }
  });

// Route the request to a canned response per endpoint.
const router = async (request) => {
  const url = new URL(request.url);
  const path = url.pathname;
  const bodyText = await request.text(); // read ONCE

  console.log("\n=== MOCK REQUEST ===");
  console.log("URL:", request.url);
  console.log("Method:", request.method);
  console.log("Body:", bodyText);

  // ---- Threads ----
  if (request.method === "POST" && path === "/threads") {
    return jsonapi({
      id: "thr_test_001",
      type: "chat-thread",
      attributes: {
        title: "SME Invoice Assistant",
        agent_id: "agt_test_001",
        status: "active",
        created_at: "2026-09-02T09:00:00Z"
      }
    });
  }

  if (request.method === "POST" && path === "/threads/thr_test_001/messages") {
    return jsonapi({
      id: "msg_test_002",
      type: "chat-message",
      attributes: {
        thread_id: "thr_test_001",
        role: "assistant",
        content:
          "3 invoices exceed UGX 2,000,000: INV-1045 (ABC Supplies Ltd, UGX 2,450,000), " +
          "INV-1046 (Kampala Hardware, UGX 3,100,000) and INV-1055 (Kampala Hardware, UGX 4,750,000). " +
          "Combined total: UGX 10,300,000.",
        metadata: {
          sources: ["result_test_001", "doc_test_001", "doc_test_002"],
          grounded: true
        },
        created_at: "2026-09-02T09:01:05Z"
      }
    });
  }

  if (request.method === "POST" && path === "/threads/thr_test_001/messages/stream") {
    const tokens = [
      "Your 2 Kampala Hardware invoices total ",
      "UGX 7,850,000 ",
      "(INV-1046: 3,100,000 + INV-1055: 4,750,000). ",
      "Both are above the UGX 2M threshold."
    ];
    const sseEvents = [
      ...tokens.map((t) => `data: ${JSON.stringify({ type: "token", content: t })}\n\n`),
      `data: ${JSON.stringify({
        type: "done",
        metadata: { sources: ["result_test_001"], grounded: true }
      })}\n\n`,
      "data: [DONE]\n\n"
    ];
    return new Response(
      new ReadableStream({
        start(controller) {
          for (const evt of sseEvents) controller.enqueue(new TextEncoder().encode(evt));
          controller.close();
        }
      }),
      { status: 200, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  // ---- Agents ----
  if (request.method === "POST" && path === "/agents") {
    return jsonapi({
      id: "agt_test_001",
      type: "agent",
      attributes: {
        name: "SME Invoice Analyst",
        slug: "sme-invoice-analyst",
        description: "Answers questions about the SME's extracted invoices",
        status: "draft",
        created_at: "2026-09-02T08:55:00Z"
      }
    });
  }

  if (request.method === "POST" && path === "/agents/agt_test_001/test") {
    return jsonapi({
      id: "agt_test_001",
      type: "agent",
      attributes: {
        name: "SME Invoice Analyst",
        slug: "sme-invoice-analyst",
        status: "draft",
        test_status: "passed",
        test_summary: "2/2 test cases passed"
      }
    });
  }

  if (request.method === "POST" && path === "/agents/agt_test_001/validate") {
    return jsonapi({
      id: "agt_test_001",
      type: "agent",
      attributes: {
        name: "SME Invoice Analyst",
        validation_status: "valid",
        validation_errors: []
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

// ---------- TEST 011: Threads — the conversational answer step ----------
console.log("\n########## TEST 011A: threads.create ##########");
const thread = await client.threads.create({
  title: "SME Invoice Assistant",
  agent_id: "agt_test_001"
});
console.log("\n=== SDK RESPONSE ===");
console.dir(thread, { depth: null });

console.log("\n########## TEST 011B: messages.send (synchronous answer) ##########");
const reply = await client.threads.messages.send(
  thread.id,
  "Which supplier invoices are above UGX 2 million?"
);
console.log("\n=== SDK RESPONSE ===");
console.dir(reply, { depth: null });

console.log("\n########## TEST 011C: messages.stream (streamed answer) ##########");
const stream = await client.threads.messages.stream(thread.id, {
  content: "How much do I owe Kampala Hardware in total?"
});
let streamedText = "";
for await (const chunk of stream) {
  if (chunk.type === "token") {
    streamedText += chunk.content ?? "";
    process.stdout.write(chunk.content ?? "");
  } else if (chunk.type === "done") {
    console.log("\n--- stream done, metadata:", JSON.stringify(chunk.metadata));
  }
}
console.log("\nFull streamed answer:", streamedText);

// ---------- TEST 012: Agents — create, validate, test ----------
console.log("\n########## TEST 012A: agents.create ##########");
const agent = await client.agents.create("SME Invoice Analyst", {
  description: "Answers questions about the SME's extracted invoices",
  instructions:
    "You help small business owners understand their invoices. " +
    "Answer using extracted invoice data in the workspace. Always cite invoice numbers.",
  vertical: "finance",
  tags: ["invoices", "sme", "uganda"]
});
console.log("\n=== SDK RESPONSE ===");
console.dir(agent, { depth: null });

console.log("\n########## TEST 012B: agents.validate + agents.test ##########");
const validated = await client.agents.validate(agent.id);
console.log("\n=== VALIDATE RESPONSE ===");
console.dir(validated, { depth: null });

const tested = await client.agents.test(agent.id);
console.log("\n=== TEST RESPONSE ===");
console.dir(tested, { depth: null });
