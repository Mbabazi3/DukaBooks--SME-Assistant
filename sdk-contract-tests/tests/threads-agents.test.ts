import { describe, expect, it } from "vitest";
import { mockPlatform, resource, sse } from "../support/mock-platform";

// Tests 011 and 012 — the "Ask AI" chat over invoices.

const THREAD = resource("thr_test_001", "chat-thread", { title: "SME Invoice Assistant", agent_id: "agt_test_001", status: "active" });

describe("threads", () => {
  it("011A create() opens a thread bound to an agent", async () => {
    const platform = mockPlatform({ "POST /threads": () => THREAD });

    const thread: any = await platform.client.threads.create({ title: "SME Invoice Assistant", agent_id: "agt_test_001" } as any);

    expect(platform.last.body).toEqual({
      data: { type: "chat-thread", attributes: { title: "SME Invoice Assistant", agent_id: "agt_test_001" } },
    });
    expect(thread).toMatchObject({ id: "thr_test_001", agent_id: "agt_test_001", status: "active" });
  });

  it("011B messages.send() returns the assistant reply with its sources", async () => {
    const platform = mockPlatform({
      "POST /threads/thr_test_001/messages": () =>
        resource("msg_test_002", "chat-message", {
          role: "assistant",
          content: "3 invoices exceed UGX 2,000,000 ...",
          metadata: { sources: ["result_test_001"], grounded: true },
        }),
    });

    const reply: any = await platform.client.threads.messages.send("thr_test_001", "Which supplier invoices are above UGX 2 million?");

    const attrs = platform.last.body.data.attributes;
    expect(attrs.content).toBe("Which supplier invoices are above UGX 2 million?");
    // The SDK adds the caller's timezone/locale/local time on its own.
    expect(attrs.metadata.context).toEqual(
      expect.objectContaining({ timezone: expect.any(String), locale: expect.any(String), local_time: expect.any(String) })
    );
    expect(reply).toMatchObject({ role: "assistant", metadata: { sources: ["result_test_001"], grounded: true } });
  });

  it("011C messages.stream() resolves to an async iterator of token + done events", async () => {
    const tokens = ["You ", "owe ", "UGX ", "7,850,000."];
    const platform = mockPlatform({
      "POST /threads/thr_test_001/messages/stream": () =>
        sse([
          ...tokens.map((content) => ({ type: "token", content })),
          { type: "done", metadata: { sources: ["result_test_001"], grounded: true } },
        ]),
    });

    // Note: stream() returns a Promise — it must be awaited before `for await`.
    const stream = await platform.client.threads.messages.stream("thr_test_001", {
      content: "How much do I owe Kampala Hardware in total?",
    });
    let text = "";
    let done: any;
    for await (const chunk of stream as AsyncIterable<any>) {
      if (chunk.type === "token") text += chunk.content ?? "";
      if (chunk.type === "done") done = chunk;
    }

    expect(text).toBe("You owe UGX 7,850,000.");
    expect(done.metadata).toEqual({ sources: ["result_test_001"], grounded: true });
    // Unlike send(), stream() puts `content` directly under `data`, not under `data.attributes`.
    expect(platform.last.body.data).toMatchObject({ type: "chat-thread", content: "How much do I owe Kampala Hardware in total?" });
    expect(platform.last.body.data.attributes).toBeUndefined();
  });
});

describe("agents", () => {
  it("012A create(name, attrs) sends the name inside the attributes", async () => {
    const platform = mockPlatform({
      "POST /agents": () => resource("agt_test_001", "agent", { name: "SME Invoice Analyst", status: "draft" }),
    });

    const agent: any = await platform.client.agents.create("SME Invoice Analyst", {
      description: "Answers questions about the SME's extracted invoices",
      instructions: "Answer using extracted invoice data. Always cite invoice numbers.",
      vertical: "finance",
      tags: ["invoices", "sme", "uganda"],
    } as any);

    expect(platform.last.body.data).toEqual({
      type: "agent",
      attributes: {
        name: "SME Invoice Analyst",
        description: "Answers questions about the SME's extracted invoices",
        instructions: "Answer using extracted invoice data. Always cite invoice numbers.",
        vertical: "finance",
        tags: ["invoices", "sme", "uganda"],
      },
    });
    expect(agent).toMatchObject({ id: "agt_test_001", status: "draft" });
  });

  it("012B validate() and test() are POSTs on the agent", async () => {
    const platform = mockPlatform({
      "POST /agents/agt_test_001/validate": () => resource("agt_test_001", "agent", { validation_status: "valid", validation_errors: [] }),
      "POST /agents/agt_test_001/test": () => resource("agt_test_001", "agent", { test_status: "passed" }),
    });

    const validated: any = await platform.client.agents.validate("agt_test_001");
    const tested: any = await platform.client.agents.test("agt_test_001");

    expect(platform.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      "POST /agents/agt_test_001/validate",
      "POST /agents/agt_test_001/test",
    ]);
    expect(validated.validation_status).toBe("valid");
    expect(tested.test_status).toBe("passed");
  });
});
