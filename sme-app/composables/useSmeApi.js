/**
 * GPT CLIENT SEAM — Russ's cutover design (Sep 2026).
 *
 * `mockClient` below mirrors the REAL GptClient surface 1:1:
 *   - same namespaces        (crm.contacts, catalog.products, email.outboundEmails, …)
 *   - same method names      (listByWorkspace, moveStage, composeWithAi, …)
 *   - same parameter shapes  (workspaceId first, JSON:API-style attrs objects)
 *   - same return shapes     (exactly what the SDK returns after unwrapping)
 *
 * It is stateful, so flows work like the real thing: created customers appear
 * in lists, moved deals stay moved, sent reminders land in the sent log.
 *
 * ===== CUTOVER (credentials day) =====
 * Replace ONE line below:
 *   const client = mockClient;
 * with:
 *   import { GptClient } from "@gpt-platform/client";
 *   const client = new GptClient({ baseUrl: GPTCORE_BASE_URL, apiKey: GPTCORE_API_KEY });
 * (In production the client lives in a Nitro server/api route so the browser
 * never sees the key — see BACKEND-NEEDS.md.)
 * Nothing else in the app changes.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WS = "ws_duka_001"; // the workspace id the app operates on

// ---------------------------------------------------------------------------
// In-memory workspace state (same shapes as verified in TEST-NOTES.md)
// ---------------------------------------------------------------------------

const CONTACTS = [
  { id: "con_test_001", first_name: "Sarah", last_name: "Nabukenya", phone: "+256772123456", email: "sarah@example.ug", lifecycle_stage: "customer" },
  { id: "con_test_002", first_name: "David", last_name: "Okello", phone: "+256701987654", email: "david@example.ug", lifecycle_stage: "lead" },
  { id: "con_test_003", first_name: "Grace", last_name: "Atim", phone: "+256758445566", email: "grace@example.ug", lifecycle_stage: "customer" },
  { id: "con_test_004", first_name: "Moses", last_name: "Tumusiime", phone: "+256783112233", email: "moses@example.ug", lifecycle_stage: "lead" }
];

const PIPELINE_STAGES = [
  { id: "stage_lead", pipeline_id: "pipe_001", name: "Lead", order: 1 },
  { id: "stage_quoted", pipeline_id: "pipe_001", name: "Quoted", order: 2 },
  { id: "stage_negotiating", pipeline_id: "pipe_001", name: "Negotiating", order: 3 },
  { id: "stage_closed_won", pipeline_id: "pipe_001", name: "Won", order: 4 },
  { id: "stage_closed_lost", pipeline_id: "pipe_001", name: "Lost", order: 5 }
];

const DEALS = [
  { id: "deal_test_001", name: "Kampala Hardware — bulk cement order", amount: 3100000, currency: "UGX", properties: { company: "Kampala Hardware Ltd" }, pipeline_stage_id: "stage_negotiating" },
  { id: "deal_test_002", name: "Nile Agro Traders — seed supply contract", amount: 6200000, currency: "UGX", properties: { company: "Nile Agro Traders" }, pipeline_stage_id: "stage_lead" },
  { id: "deal_test_003", name: "ABC Supplies — monthly restock", amount: 2450000, currency: "UGX", properties: { company: "ABC Supplies Ltd" }, pipeline_stage_id: "stage_quoted" },
  { id: "deal_test_004", name: "Gulu Traders — shop fittings", amount: 1800000, currency: "UGX", properties: { company: "Gulu Traders" }, pipeline_stage_id: "stage_closed_won" }
];

const ACTIVITIES = [
  { id: "act_test_001", type: "call", subject: "Called Sarah about delivery", body: "She wants cement delivered Friday morning.", occurred_at: "2026-09-01T09:30:00Z" },
  { id: "act_test_002", type: "note", subject: "David asked for bulk discount", body: "Considering 5% off orders above UGX 3M.", occurred_at: "2026-09-02T14:10:00Z" }
];

const PRODUCTS = [
  { id: "prod_test_001", name: "Cement (50kg bag)", sku: "CEM-50", base_price: "41000", currency: "UGX", stock: 42 },
  { id: "prod_test_002", name: "Iron sheets (gauge 30)", sku: "IRN-30", base_price: "68000", currency: "UGX", stock: 8 },
  { id: "prod_test_003", name: "Paint 20L (white)", sku: "PNT-20W", base_price: "125000", currency: "UGX", stock: 0 }
];

const REMINDERS = [
  { id: "eml_test_001", subject: "Your cement order is ready for pickup", to: "sarah@example.ug", customer: "Sarah Nabukenya", status: "sent", sent_at: "2026-09-03T10:15:00Z" }
];

// Drafts the AI composed but that haven't been sent yet (server-side state —
// composeWithAi creates them, send() moves them into REMINDERS).
const DRAFTS = {};

// Invoice extraction rows (the result behind result_test_001 — Test 010).
const INVOICE_ROWS = [
  { supplier: "ABC Supplies Ltd", invoice_number: "INV-1042", invoice_date: "2026-07-18", total: 850000, currency: "UGX" },
  { supplier: "ABC Supplies Ltd", invoice_number: "INV-1045", invoice_date: "2026-08-01", total: 2450000, currency: "UGX" },
  { supplier: "Kampala Hardware", invoice_number: "INV-1046", invoice_date: "2026-08-14", total: 3100000, currency: "UGX" },
  { supplier: "Nile Agro Traders", invoice_number: "INV-1051", invoice_date: "2026-08-20", total: 1200000, currency: "UGX" },
  { supplier: "Kampala Hardware", invoice_number: "INV-1055", invoice_date: "2026-08-28", total: 4750000, currency: "UGX" }
];

// Scheduling state. Events are generated relative to "today" so the day view
// always has content (verified contract — Test 019).
const EVENT_TYPES = [
  { id: "evt_type_001", name: "Shop consultation", duration_minutes: 30, slug: "shop-consultation", booking_enabled: true, location_type: "in_person" },
  { id: "evt_type_002", name: "Site measurement", duration_minutes: 60, slug: "site-measurement", booking_enabled: true, location_type: "in_person" }
];

const atHour = (dayOffset, hour, minutes = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minutes, 0, 0);
  return d.toISOString();
};

const EVENTS = [
  { id: "evt_test_001", title: "Site measurement — Nile Agro Traders", start_time: atHour(0, 9), end_time: atHour(0, 10), status: "confirmed", location_type: "in_person", event_type_id: "evt_type_002" },
  { id: "evt_test_002", title: "Consultation — David Okello", start_time: atHour(0, 14), end_time: atHour(0, 14, 30), status: "confirmed", location_type: "in_person", event_type_id: "evt_type_001" },
  { id: "evt_test_003", title: "Consultation — Grace Atim", start_time: atHour(1, 11), end_time: atHour(1, 11, 30), status: "confirmed", location_type: "in_person", event_type_id: "evt_type_001" }
];

const formatUGX = (n) =>
  new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(n);

// Grounded answers for the assistant thread (Test 011 contract).
function groundedAnswer(question) {
  const q = question.toLowerCase();
  if (q.includes("kampala") || q.includes("owe")) {
    return {
      content:
        "You owe Kampala Hardware a total of UGX 7,850,000 across 2 invoices: " +
        "INV-1046 (UGX 3,100,000, from 2026-08-14) and INV-1055 (UGX 4,750,000, dated 2026-08-28).",
      metadata: { sources: ["INV-1046", "INV-1055"], grounded: true }
    };
  }
  if (q.includes("above") || q.includes("million") || q.includes("2m")) {
    return {
      content:
        "3 invoices exceed UGX 2,000,000: INV-1045 (ABC Supplies Ltd, UGX 2,450,000), " +
        "INV-1046 (Kampala Hardware, UGX 3,100,000) and INV-1055 (Kampala Hardware, UGX 4,750,000). " +
        "Combined: UGX 10,300,000.",
      metadata: { sources: ["INV-1045", "INV-1046", "INV-1055"], grounded: true }
    };
  }
  if (q.includes("biggest") || q.includes("largest") || q.includes("most expensive")) {
    return {
      content: "Your biggest invoice is INV-1055 from Kampala Hardware at UGX 4,750,000, dated 2026-08-28.",
      metadata: { sources: ["INV-1055"], grounded: true }
    };
  }
  return {
    content:
      "I can answer questions about your 5 extracted invoices — try: " +
      "\"Which supplier invoices are above UGX 2 million?\" or \"How much do I owe Kampala Hardware?\"",
    metadata: { sources: [], grounded: false }
  };
}

// ---------------------------------------------------------------------------
// mockClient — mirrors the GptClient surface (see header)
// ---------------------------------------------------------------------------
const mockClient = {
  crm: {
    contacts: {
      async listByWorkspace(_workspaceId, options = {}) {
        await sleep(150);
        return CONTACTS.filter((c) => (options.status ? c.lifecycle_stage === options.status : true));
      },
      async create(attributes) {
        await sleep(250);
        const contact = { id: "con_new_" + (CONTACTS.length + 1), lifecycle_stage: "lead", ...attributes };
        delete contact.workspace_id;
        CONTACTS.unshift(contact);
        return contact;
      },
      async update(id, attributes) {
        await sleep(200);
        const contact = CONTACTS.find((c) => c.id === id);
        if (contact) Object.assign(contact, attributes); // PATCH semantics
        return { ...contact };
      }
    },
    deals: {
      async listByWorkspace(_workspaceId) {
        await sleep(150);
        return DEALS.map((d) => ({ ...d, company: d.properties?.company }));
      },
      async create(attributes) {
        await sleep(250);
        const deal = {
          id: "deal_new_" + (DEALS.length + 1),
          currency: "UGX",
          pipeline_stage_id: PIPELINE_STAGES[0].id,
          ...attributes
        };
        DEALS.unshift(deal);
        return { ...deal, company: deal.properties?.company };
      },
      async moveStage(id, { stage_id }) {
        await sleep(200);
        const deal = DEALS.find((d) => d.id === id);
        if (deal) deal.pipeline_stage_id = stage_id;
        return { ...deal, company: deal?.properties?.company };
      }
    },
    pipelines: {
      async listByWorkspace(_workspaceId) {
        await sleep(120);
        return [{ id: "pipe_001", workspace_id: WS, name: "Sales" }];
      }
    },
    pipelineStages: {
      async listByPipeline(_pipelineId) {
        await sleep(150);
        return PIPELINE_STAGES.map((s) => ({ ...s }));
      }
    },
    activities: {
      async create(attributes) {
        await sleep(220);
        const activity = { id: "act_new_" + (ACTIVITIES.length + 1), occurred_at: new Date().toISOString(), ...attributes };
        ACTIVITIES.unshift(activity);
        return activity;
      },
      async listByWorkspace(_workspaceId) {
        await sleep(150);
        return ACTIVITIES.map((a) => ({ ...a }));
      }
    }
  },
  catalog: {
    products: {
      async list(_workspaceId) {
        await sleep(150);
        return PRODUCTS.map((p) => ({ ...p }));
      },
      async create(attributes) {
        await sleep(250);
        const product = { id: "prod_new_" + (PRODUCTS.length + 1), currency: "UGX", stock: 0, ...attributes };
        PRODUCTS.unshift(product);
        return product;
      }
    }
  },
  email: {
    outboundEmails: {
      async composeWithAi({ to, context = {}, contact_ref_id }) {
        await sleep(600); // the AI is writing…
        const contact = CONTACTS.find((c) => c.id === contact_ref_id);
        const name = contact?.first_name ?? "there";
        const amount = context.amount ? formatUGX(Number(context.amount)) : "";
        const drafts = {
          order_ready: {
            subject: "Your order is ready for pickup",
            body:
              `Dear ${name},\n\nGood news! Your order is ready for pickup at our shop.` +
              (amount ? ` Total due: ${amount}.` : "") +
              `\n\nThank you for your business!\n— DukaBooks Hardware`
          },
          payment_due: {
            subject: "Friendly reminder: payment due",
            body:
              `Dear ${name},\n\nThis is a gentle reminder about the outstanding balance` +
              (amount ? ` of ${amount}` : "") +
              `. Please let us know if you have any questions.\n\nThank you!\n— DukaBooks Hardware`
          },
          custom: {
            subject: "A message from DukaBooks Hardware",
            body: `Dear ${name},\n\n${amount ? `Regarding ${amount}: ` : ""}we wanted to keep you updated.\n\n— DukaBooks Hardware`
          }
        };
        // Like the real platform: composing creates a persistent server-side draft.
        const draft = {
          id: "eml_new_" + (REMINDERS.length + 1),
          type: "email-outbound-email",
          status: "draft",
          to: to?.[0] ?? contact?.email ?? "",
          contact_ref_id,
          customer: contact ? `${contact.first_name} ${contact.last_name}` : null,
          ...(context.intent ? drafts[context.intent] : drafts.custom)
        };
        DRAFTS[draft.id] = draft;
        return { ...draft };
      },
      async send(id) {
        await sleep(400);
        const draft = DRAFTS[id];
        if (!draft) throw new Error(`unknown draft ${id}`);
        const sent = { ...draft, status: "sent", sent_at: new Date().toISOString() };
        REMINDERS.unshift(sent); // the sent log is server state
        delete DRAFTS[id];
        return { ...sent };
      },
      async listByWorkspace(_workspaceId) {
        await sleep(150);
        return REMINDERS.map((r) => ({ ...r }));
      }
    }
  },
  extraction: {
    documents: {
      async beginUpload(attributes) {
        await sleep(300);
        return {
          id: "doc_new_001",
          type: "extraction-document",
          status: "pending_upload",
          upload_url: "https://storage.example.com/upload/doc_new_001",
          ...attributes
        };
      },
      // Real life: this step is a plain fetch(url, { method: "PUT", body: file })
      // against the presigned URL — not an SDK method.
      async uploadToPresignedUrl(_url) {
        await sleep(700);
        return true;
      },
      async finishUpload(id) {
        await sleep(300);
        return { id, status: "processing" };
      },
      // Real life: poll client.extraction.documents.status(id) until "processed".
      async waitForProcessed(id) {
        await sleep(1600);
        return {
          id,
          status: "processed",
          result_id: "result_new_001",
          extracted_fields: {
            supplier: "Kampala Hardware",
            invoice_number: "INV-1058",
            invoice_date: "2026-09-01",
            total: 1850000,
            currency: "UGX"
          },
          avg_confidence: 0.96
        };
      }
    },
    results: {
      async query(_resultId, params = {}) {
        await sleep(150);
        const filters = params.filters ?? [];
        const rows = INVOICE_ROWS.filter((r) =>
          filters.every((f) => {
            switch (f.op) {
              case "gt": return r[f.field] > f.value;
              case "lt": return r[f.field] < f.value;
              case "eq": return r[f.field] === f.value;
              case "contains": return String(r[f.field]).includes(f.value);
              default: return true;
            }
          })
        );
        return { rows, total: INVOICE_ROWS.length, filtered: rows.length, limit: params.limit ?? 1000, offset: params.offset ?? 0 };
      }
    }
  },
  threads: {
    async create(attributes) {
      await sleep(120);
      return { id: "thr_test_001", status: "active", ...attributes };
    },
    messages: {
      // Mirrors the SDK contract: an async iterator of SSE chunks
      // ({ type: "token", content } … { type: "done", metadata }) — Test 011C.
      async *stream(_threadId, { content }) {
        await sleep(250);
        const { content: full, metadata } = groundedAnswer(content);
        for (const word of full.split(" ")) {
          await sleep(35);
          yield { type: "token", content: word + " " };
        }
        yield { type: "done", metadata };
      }
    }
  },
  search: {
    async semantic(q) {
      await sleep(200);
      return {
        hits: INVOICE_ROWS.filter((r) => q.toLowerCase().includes(r.supplier.toLowerCase().split(" ")[0]))
          .map((r) => ({ id: r.invoice_number, title: `${r.invoice_number}.pdf`, chunk: `${r.supplier} — ${formatUGX(r.total)}`, score: 0.9 })),
        total: INVOICE_ROWS.length,
        processing_time_ms: 34
      };
    }
  },
  scheduling: {
    eventTypes: {
      async list(_workspaceId) {
        await sleep(120);
        return EVENT_TYPES.map((t) => ({ ...t }));
      },
      async create(attributes) {
        await sleep(220);
        const eventType = {
          id: "evt_type_" + (EVENT_TYPES.length + 1),
          slug: (attributes.name ?? "service").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          booking_enabled: true,
          ...attributes
        };
        EVENT_TYPES.push(eventType);
        return { ...eventType };
      }
    },
    events: {
      // REAL: GET /scheduling/events/by_date_range?workspace_id=…&start_time=…&end_time=…
      async listByDateRange(_workspaceId, startTime, endTime) {
        await sleep(150);
        const s = new Date(startTime).getTime();
        const e = new Date(endTime).getTime();
        return EVENTS.filter((ev) => {
          const t = new Date(ev.start_time).getTime();
          return t >= s && t <= e;
        }).map((ev) => ({ ...ev })).sort((a, b) => a.start_time.localeCompare(b.start_time));
      },
      // REAL: POST /scheduling/events — note: NO workspace_id in the body.
      async create(attributes) {
        await sleep(250);
        const event = { id: "evt_new_" + (EVENTS.length + 1), status: "confirmed", ...attributes };
        EVENTS.push(event);
        return { ...event };
      },
      async complete(id) {
        await sleep(200);
        const event = EVENTS.find((ev) => ev.id === id);
        if (event) event.status = "completed";
        return { id, type: "scheduling-event", status: "completed" };
      },
      async cancel(id) {
        await sleep(200);
        const event = EVENTS.find((ev) => ev.id === id);
        if (event) event.status = "cancelled";
        return { id, type: "scheduling-event", status: "cancelled" };
      }
    }
  }
};

// ===== THE CUTOVER LINE =====
// On credentials day, replace `mockClient` with a real GptClient instance.
const client = mockClient;

// ---------------------------------------------------------------------------
// useSmeApi — the thin adapter the pages already use. Delegates everything to
// `client` (mock now, real SDK at cutover) and adds display formatting only.
// ---------------------------------------------------------------------------
export const useSmeApi = () => ({
  formatUGX,

  // Invoices (extraction results)
  async resultsQuery({ field = "total", op = "gt", value = 0 } = {}) {
    return client.extraction.results.query("result_test_001", {
      filters: [{ field, op, value }],
      limit: 100,
      offset: 0
    });
  },

  // Upload flow
  async beginUpload(filename) {
    return client.extraction.documents.beginUpload({
      workspace_id: WS,
      filename,
      file_type: "pdf",
      content_type: "application/pdf"
    });
  },
  async putToPresignedUrl(uploadUrl) {
    return client.extraction.documents.uploadToPresignedUrl(uploadUrl);
  },
  async finishUpload(docId) {
    return client.extraction.documents.finishUpload(docId);
  },
  async waitForProcessed(docId) {
    return client.extraction.documents.waitForProcessed(docId);
  },

  // Assistant thread
  async threadsCreate(title) {
    return client.threads.create({ title, agent_id: "agt_sme_analyst" });
  },
  async messagesStream(threadId, content, onToken) {
    let acc = "";
    let metadata = {};
    for await (const chunk of client.threads.messages.stream(threadId, { content })) {
      if (chunk.type === "token") {
        acc += chunk.content ?? "";
        onToken?.(chunk.content ?? "");
      } else if (chunk.type === "done") {
        metadata = chunk.metadata ?? {};
      }
    }
    return { content: acc, metadata };
  },

  // Customers (CRM contacts)
  async listCustomers(options = {}) {
    return client.crm.contacts.listByWorkspace(WS, options);
  },
  async createCustomer(attrs) {
    return client.crm.contacts.create({ workspace_id: WS, ...attrs });
  },
  async updateCustomerStage(contactId, stage) {
    return client.crm.contacts.update(contactId, { lifecycle_stage: stage });
  },

  // Deals + pipeline
  async listDeals() {
    return client.crm.deals.listByWorkspace(WS);
  },
  async createDeal(attrs) {
    const { company, ...rest } = attrs;
    return client.crm.deals.create({
      workspace_id: WS,
      currency: "UGX",
      ...rest,
      properties: { company }
    });
  },
  async moveDealStage(dealId, stageId) {
    return client.crm.deals.moveStage(dealId, { stage_id: stageId });
  },
  async listPipelineStages() {
    return client.crm.pipelineStages.listByPipeline("pipe_001");
  },

  // Follow-ups (CRM activities)
  async createActivity(attrs) {
    return client.crm.activities.create({ workspace_id: WS, ...attrs });
  },
  async listActivities() {
    return client.crm.activities.listByWorkspace(WS);
  },

  // Inventory (catalog)
  async listProducts() {
    return client.catalog.products.list(WS);
  },
  async createProduct(attrs) {
    return client.catalog.products.create({ workspace_id: WS, ...attrs });
  },

  // Reminders (email)
  async composeReminder({ customer, intent, amount }) {
    return client.email.outboundEmails.composeWithAi({
      to: [customer?.email ?? ""],
      prompt:
        `Write a short, friendly ${intent === "payment_due" ? "payment reminder" : "order update"} for a small-business customer. Sign as DukaBooks Hardware.`,
      context: { intent, amount },
      contact_ref_id: customer?.id
    });
  },
  async sendReminder(draft) {
    return client.email.outboundEmails.send(draft.id);
  },
  async listReminders() {
    return client.email.outboundEmails.listByWorkspace(WS);
  },

  // Appointments (scheduling)
  async listServices() {
    return client.scheduling.eventTypes.list(WS);
  },
  async listAppointmentsBetween(startIso, endIso) {
    return client.scheduling.events.listByDateRange(WS, startIso, endIso);
  },
  async createAppointment({ title, startIso, endIso, serviceId }) {
    // REAL: no workspace_id in this body — the platform infers it from auth.
    return client.scheduling.events.create({
      title,
      start_time: startIso,
      end_time: endIso,
      status: "confirmed",
      location_type: "in_person",
      event_type_id: serviceId
    });
  },
  async completeAppointment(id) {
    return client.scheduling.events.complete(id);
  },
  async cancelAppointment(id) {
    return client.scheduling.events.cancel(id);
  }
});
