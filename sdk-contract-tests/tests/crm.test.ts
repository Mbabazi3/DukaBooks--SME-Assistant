import { describe, expect, it } from "vitest";
import { mockPlatform, resource } from "../support/mock-platform";

// Tests 008A, 013–016 — customers, companies, deals, pipelines, follow-ups.
const WS = "ws_test_001";

describe("crm.contacts", () => {
  it("008A create() posts a crm-contact", async () => {
    const platform = mockPlatform({
      "POST /crm/contacts": ({ body }) => resource("con_test_001", "crm-contact", body.data.attributes),
    });

    const contact: any = await platform.client.crm.contacts.create({
      workspace_id: WS, first_name: "Sarah", last_name: "Nabukenya", phone: "+256772123456",
    } as any);

    expect(platform.last.body.data.type).toBe("crm-contact");
    expect(contact).toMatchObject({ id: "con_test_001", first_name: "Sarah" });
  });

  it("013B listByWorkspace() puts the workspace in the PATH and filters in the query", async () => {
    const platform = mockPlatform({
      [`GET /crm/contacts/workspace/${WS}`]: () => [
        resource("con_test_002", "crm-contact", { first_name: "David", lifecycle_stage: "lead" }),
      ],
    });

    const contacts: any[] = await platform.client.crm.contacts.listByWorkspace(WS, { status: "lead" } as any);

    expect(platform.last).toMatchObject({ method: "GET", path: `/crm/contacts/workspace/${WS}`, query: { status: "lead" } });
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ id: "con_test_002", lifecycle_stage: "lead" });
  });

  it("016A update() is a PATCH carrying only the changed fields", async () => {
    const platform = mockPlatform({
      "PATCH /crm/contacts/con_test_002": () => resource("con_test_002", "crm-contact", { first_name: "David", lifecycle_stage: "customer" }),
    });

    const contact: any = await platform.client.crm.contacts.update("con_test_002", { lifecycle_stage: "customer" } as any);

    expect(platform.last.body).toEqual({
      data: { id: "con_test_002", type: "crm-contact", attributes: { lifecycle_stage: "customer" } },
    });
    expect(contact.lifecycle_stage).toBe("customer");
  });
});

describe("crm.companies", () => {
  it("013A create() posts a crm-company", async () => {
    const platform = mockPlatform({
      "POST /crm/companies": ({ body }) => resource("cmp_test_001", "crm-company", body.data.attributes),
    });

    const company: any = await platform.client.crm.companies.create({
      workspace_id: WS, name: "Kampala Hardware Ltd", industry: "retail", location: "Kampala",
    } as any);

    expect(platform.last.body.data).toEqual({
      type: "crm-company",
      attributes: { workspace_id: WS, name: "Kampala Hardware Ltd", industry: "retail", location: "Kampala" },
    });
    expect(company.name).toBe("Kampala Hardware Ltd");
  });
});

describe("crm.deals", () => {
  it("014A create() sends amount as a NUMBER", async () => {
    const platform = mockPlatform({
      "POST /crm/deals": ({ body }) => resource("deal_test_001", "crm-deal", body.data.attributes),
    });

    await platform.client.crm.deals.create({
      workspace_id: WS, name: "Kampala Hardware — bulk cement order", amount: 3100000, currency: "UGX", pipeline_stage_id: "stage_negotiating",
    } as any);

    expect(platform.last.body.data.type).toBe("crm-deal");
    expect(platform.last.body.data.attributes.amount).toBe(3100000);
  });

  it("listByWorkspace() uses the same path-segment pattern as contacts", async () => {
    const platform = mockPlatform({
      [`GET /crm/deals/workspace/${WS}`]: () => [resource("deal_test_001", "crm-deal", { name: "Bulk cement", amount: 3100000 })],
    });

    const deals: any[] = await platform.client.crm.deals.listByWorkspace(WS);

    expect(deals[0]).toMatchObject({ id: "deal_test_001", amount: 3100000 });
  });

  it("014B moveStage() is a PATCH with stage_id in the attributes", async () => {
    const platform = mockPlatform({
      "PATCH /crm/deals/deal_test_001/move-stage": () => resource("deal_test_001", "crm-deal", { pipeline_stage_id: "stage_closed_won" }),
    });

    const deal: any = await platform.client.crm.deals.moveStage("deal_test_001", { stage_id: "stage_closed_won" } as any);

    expect(platform.last.body).toEqual({
      data: { type: "crm-deal", id: "deal_test_001", attributes: { stage_id: "stage_closed_won" } },
    });
    expect(deal.pipeline_stage_id).toBe("stage_closed_won");
  });
});

describe("crm.pipelines + pipelineStages", () => {
  it("015A/B list the workspace's pipelines, then a pipeline's stages", async () => {
    const platform = mockPlatform({
      [`GET /crm/pipelines/workspace/${WS}`]: () => [resource("pipe_test_001", "crm-pipeline", { name: "Sales" })],
      "GET /crm/pipeline-stages/pipeline/pipe_test_001": () => [
        resource("stage_lead", "crm-pipeline-stage", { name: "Lead", order: 1 }),
        resource("stage_closed_won", "crm-pipeline-stage", { name: "Won", order: 4 }),
      ],
    });

    const [pipeline]: any[] = await platform.client.crm.pipelines.listByWorkspace(WS);
    const stages: any[] = await platform.client.crm.pipelineStages.listByPipeline(pipeline.id);

    expect(pipeline.id).toBe("pipe_test_001");
    expect(stages.map((s) => s.name)).toEqual(["Lead", "Won"]);
  });
});

describe("crm.activities", () => {
  it("016B create() logs a follow-up at workspace level", async () => {
    const platform = mockPlatform({
      "POST /crm/activities": ({ body }) => resource("act_test_001", "crm-activity", body.data.attributes),
    });

    await platform.client.crm.activities.create({
      workspace_id: WS, type: "note", subject: "Call David about cement quote", body: "He asked for a discount on bulk orders.",
    } as any);

    expect(platform.last.body.data).toEqual({
      type: "crm-activity",
      attributes: { workspace_id: WS, type: "note", subject: "Call David about cement quote", body: "He asked for a discount on bulk orders." },
    });
  });

  it("016C listByWorkspace() returns recent follow-ups", async () => {
    const platform = mockPlatform({
      [`GET /crm/activities/workspace/${WS}`]: () => [resource("act_test_001", "crm-activity", { type: "note", subject: "Call David" })],
    });

    const activities: any[] = await platform.client.crm.activities.listByWorkspace(WS);

    expect(activities[0]).toMatchObject({ type: "note", subject: "Call David" });
  });
});
