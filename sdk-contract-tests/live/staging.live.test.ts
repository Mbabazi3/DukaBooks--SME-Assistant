import { beforeAll, describe, expect, it } from "vitest";
import { call, live, liveClient, looksLikeUuid, skipReason } from "./live-client";

// Read-only smoke tests against the real platform (see live-client.ts).
// Run with `npm run test:live`. Each test checks the call succeeds and the SDK
// returns real data (not `undefined` — see SDK finding #1).

const isList = (x: unknown) => expect(Array.isArray(x), `expected an array, got ${JSON.stringify(x)}`).toBe(true);

if (skipReason) console.warn(`\n[live tests skipped] ${skipReason}\n`);

describe.skipIf(skipReason)(`GPT Platform live (${live.baseUrl})`, () => {
  /** Workspace the scoped tests use; empty if it couldn't be worked out (they skip). */
  let WS = "";
  let workspaces: any[] = [];
  // Two clients, because staging rejects a request that has the workspace in
  // BOTH the path and ?workspace_id= ("conflict path and query params"):
  //  - `client` (no workspaceId) for calls that take the workspace as an argument;
  //  - `scoped` (adds ?workspace_id=WS) for calls with no workspace argument (search, review queues).
  const client = liveClient();
  let scoped = liveClient();

  beforeAll(async () => {
    const unscoped = liveClient();
    workspaces = (await unscoped.platform.workspaces.list().catch(() => null)) ?? [];
    if (!workspaces.length) workspaces = (await unscoped.platform.workspaces.mine().catch(() => null)) ?? [];

    const configured = workspaces.find((w) => w.id === live.workspaceId);
    const byName = workspaces.filter((w) => /duka/i.test(w.name ?? ""));
    const picked = configured ?? (workspaces.length === 1 ? workspaces[0] : byName.length === 1 ? byName[0] : undefined);
    WS = picked?.id ?? "";
    if (WS) scoped = liveClient(WS);
    if (picked && !configured) {
      console.warn(`using "${picked.name}" (${WS}) for this run — set GPT_PLATFORM_WORKSPACE_ID=${WS} in dukabooks-app/.env`);
    }
  });

  /** Skips a workspace-scoped test when there's no usable workspace. */
  const needsWorkspace = (ctx: { skip: (note?: string) => void }) => {
    if (!WS) ctx.skip("no usable workspace — see test 0");
  };

  it("0. the key works and GPT_PLATFORM_WORKSPACE_ID is a real workspace", async () => {
    const app: any = await call("current application", () => liveClient().platform.applications.readCurrent());
    if (app === undefined) console.warn("applications.readCurrent() returned undefined (empty 2xx — SDK finding #1)");
    else console.info(`application: ${app.name ?? app.attributes?.name ?? "?"} (${app.id ?? "?"})`);
    console.info(
      `workspaces visible to this key: ${workspaces.map((w) => `${w.name} → ${w.id}`).join(", ") || "none listed"}`
    );

    // Which permissions exist for the modules DukaBooks needs — useful when asking for access.
    const perms: any = await liveClient().platform.permissions.list().catch(() => null);
    const permList: any[] = Array.isArray(perms) ? perms : perms?.data ?? perms?.items ?? [];
    const wanted = permList
      .map((p) => p.id ?? p.name ?? p.key)
      .filter((id) => typeof id === "string" && /^(crm|catalog|scheduling|email|extraction|search|threads|agents)[.:]/i.test(id));
    if (wanted.length) console.info(`permissions DukaBooks uses: ${wanted.join(", ")}`);

    const ok = workspaces.some((w) => w.id === live.workspaceId);
    expect(
      ok,
      `GPT_PLATFORM_WORKSPACE_ID="${live.workspaceId}" is not one of this key's workspaces` +
        (looksLikeUuid(live.workspaceId) ? "" : " (platform ids are UUIDs)") +
        (workspaces.length ? ` — use one of: ${workspaces.map((w) => `${w.id} (${w.name})`).join(", ")}` : ""),
    ).toBe(true);
  });

  it("1. CRM contacts", async (ctx) => {
    needsWorkspace(ctx);
    const contacts = await call("contacts list", () => client.crm.contacts.listByWorkspace(WS));
    isList(contacts);
    console.info(`contacts: ${contacts.length}`);
  });

  it("2. CRM deals, pipelines and stages", async (ctx) => {
    needsWorkspace(ctx);
    isList(await call("deals list", () => client.crm.deals.listByWorkspace(WS)));
    const pipelines: any[] = await call("pipelines list", () => client.crm.pipelines.listByWorkspace(WS));
    isList(pipelines);
    console.info(`pipelines: ${pipelines.map((p) => `${p.name} (${p.id})`).join(", ") || "none"}`);
    if (pipelines[0]) {
      const stages: any[] = await call("pipeline stages", () => client.crm.pipelineStages.listByPipeline(pipelines[0].id));
      isList(stages);
      console.info(`stages of ${pipelines[0].name}: ${stages.map((s) => s.name).join(" → ")}`);
    }
  });

  it("3. CRM activities (follow-ups)", async (ctx) => {
    needsWorkspace(ctx);
    isList(await call("activities list", () => client.crm.activities.listByWorkspace(WS)));
  });

  it("4. catalog products", async (ctx) => {
    needsWorkspace(ctx);
    const products: any[] = await call("products list", () => client.catalog.products.list(WS));
    isList(products);
    for (const p of products) expect(typeof p.base_price === "string" || p.base_price == null).toBe(true);
    console.info(`products: ${products.length}`);
  });

  it("5. sent emails log", async (ctx) => {
    needsWorkspace(ctx);
    isList(await call("emails list", () => client.email.outboundEmails.listByWorkspace(WS)));
    const senders: any[] = await call("sender profiles", () => client.email.senderProfiles.listByWorkspace(WS));
    isList(senders);
    console.info(
      `email sender profiles: ${senders.map((p) => `${p.email}${p.is_default ? " (default)" : ""}${p.dns_validated ? "" : " (DNS not validated)"} → ${p.id}`).join(", ") || "none — composeWithAi/send may need one"}`
    );
  });

  it("6. scheduling: event types and this week's events", async (ctx) => {
    needsWorkspace(ctx);
    isList(await call("event types list", () => client.scheduling.eventTypes.list(WS)));
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 86_400_000);
    isList(await call("events by date range", () =>
      client.scheduling.events.listByDateRange(WS, now.toISOString(), weekLater.toISOString())));
  });

  it("7. extraction documents — and the result ids the app needs", async (ctx) => {
    needsWorkspace(ctx);
    const docs: any[] = await call("documents list", () => client.extraction.documents.listByWorkspace(WS));
    isList(docs);
    console.info(`documents: ${docs.length}`);
    const done = docs.find((d) => d.status === "completed" || d.status === "partial");
    if (!done) return console.info("no processed documents yet — scan one in the app (Scan page)");
    const results: any[] = await call("results by document", () => client.extraction.results.byDocument(done.id));
    isList(results);
    console.info(`document ${done.id} → result ids: ${results.map((r) => r.id).join(", ")}`);
  });

  it("8. search", async (ctx) => {
    needsWorkspace(ctx);
    const res: any = await call("search", () => scoped.search.query("invoice"));
    expect(res).toBeDefined();
  });

  it("9. review queues and agents", async (ctx) => {
    needsWorkspace(ctx);
    const summaries: any = await call("review queue summaries", () => scoped.reviews.queues.summaries());
    // Typed as ReviewQueueSummary[], but staging returns { items: [...] }.
    isList(Array.isArray(summaries) ? summaries : summaries?.items);
    const agents: any[] = await call("agents list", () => client.agents.list());
    isList(agents);
    console.info(`agents: ${agents.map((a) => `${a.name} (${a.id})`).join(", ") || "none"} (candidate GPT_PLATFORM_AGENT_ID)`);
  });

  it("the guard blocks anything that is not a GET", async () => {
    await expect(client.crm.contacts.create({ workspace_id: WS, first_name: "never-sent" } as any)).rejects.toThrow(/read-only: blocked POST/);
  });
});
