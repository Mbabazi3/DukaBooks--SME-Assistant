import { describe, expect, it } from "vitest";
import { mockPlatform, resource } from "../support/mock-platform";

// Test 020 — human review of low-confidence extractions.
// Note the nesting: item methods live on client.reviews.reviews, queues on client.reviews.queues.

describe("reviews", () => {
  it("020A queues.summaries() returns pending + overdue counts per queue", async () => {
    const platform = mockPlatform({
      "GET /review-queues/summaries": () => [
        { queue_id: "queue_invoice_checks", name: "Invoice checks", pending_count: 2, sla_overdue_count: 1 },
      ],
    });

    const summaries: any[] = await platform.client.reviews.queues.summaries();

    expect(summaries[0]).toMatchObject({ queue_id: "queue_invoice_checks", pending_count: 2, sla_overdue_count: 1 });
  });

  it("020B reviews.list({ pageSize }) maps pageSize to ?size=", async () => {
    const platform = mockPlatform({
      "GET /reviews": () => [resource("rev_test_001", "review", { status: "pending", review_type: "field" })],
    });

    const open: any[] = await platform.client.reviews.reviews.list({ pageSize: 20 } as any);

    expect(platform.last.query).toEqual({ size: "20" });
    expect(open[0]).toMatchObject({ id: "rev_test_001", status: "pending" });
  });

  it("020C claim() is a PATCH with a bare { type, id } body", async () => {
    const platform = mockPlatform({
      "PATCH /reviews/rev_test_001/claim": () => resource("rev_test_001", "review", { status: "claimed" }),
    });

    const claimed: any = await platform.client.reviews.reviews.claim("rev_test_001");

    expect(platform.last.body).toEqual({ data: { type: "review", id: "rev_test_001" } });
    expect(claimed.status).toBe("claimed");
  });

  it("020D correct() sends the human's corrected value", async () => {
    const platform = mockPlatform({
      "PATCH /reviews/rev_test_001/correct": () => resource("rev_test_001", "review", { status: "corrected" }),
    });

    await platform.client.reviews.reviews.correct("rev_test_001", {
      correction_payload: { total: 2050000 },
      notes: "Actual total on paper is UGX 2,050,000",
    } as any);

    expect(platform.last.body.data).toEqual({
      type: "review",
      id: "rev_test_001",
      attributes: { correction_payload: { total: 2050000 }, notes: "Actual total on paper is UGX 2,050,000" },
    });
  });

  it("020E approve() confirms the AI's value", async () => {
    const platform = mockPlatform({
      "PATCH /reviews/rev_test_002/approve": () => resource("rev_test_002", "review", { status: "approved" }),
    });

    const approved: any = await platform.client.reviews.reviews.approve("rev_test_002", {
      decision_payload: { verdict: "ai_was_right" },
    } as any);

    expect(platform.last.body.data.attributes).toEqual({ decision_payload: { verdict: "ai_was_right" } });
    expect(approved.status).toBe("approved");
  });
});
