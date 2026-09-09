# BACKEND-NEEDS.md — What the SME app needs from GPT Platform

The frontend (`sme-app/`) is a working Nuxt 3 app running entirely on mock
data. This document is the contract it expects the backend to fulfil. Every
SDK call listed has already been verified at the request/response level by
the offline mock suite (see `TEST-NOTES.md`) — what remains is confirming
them live once ISV credentials arrive.

## Screen-by-screen requirements

| Screen | Feature needed | SDK call | Endpoint (verified) | Status |
|---|---|---|---|---|
| Dashboard | Totals over extracted invoices | `extraction.results.query(resultId, { filters: [] })` | `POST /extraction/results/:id/query` | ✅ mock-verified (010) |
| Dashboard | Live refresh when an upload finishes | `channels` (WebSocket `chat_thread:*` / document events) | WS channels | ⬜ needs live test |
| Invoices | Filtered list ("above UGX X") — **server-side** | `extraction.results.query(resultId, { filters: [{ field: 'total', op: 'gt', value }] })` | `POST /extraction/results/:id/query` | ✅ mock-verified (010A/B) |
| Scan | Get secure upload link | `extraction.documents.beginUpload(attrs)` | `POST /extraction/documents/begin-upload` | ✅ mock-verified (008A) |
| Scan | Upload the file | `PUT` to returned presigned `upload_url` | storage | ⬜ needs live test |
| Scan | Queue AI processing | `extraction.documents.finishUpload(id)` | `PATCH /extraction/documents/:id/finish-upload` | ✅ mock-verified (008B) |
| Scan | Poll until processed | `extraction.documents.status(id)` | — | ⬜ needs live test |
| Scan | Extracted fields + confidence | `extraction.results.byDocument(id)` | `GET /extraction/results/document/:id` | ✅ mock-verified (008C) |
| Scan | Low-confidence → human review | `extraction.documents.reviewQueue(workspaceId)` | — | ⬜ needs live test |
| Ask AI | Chat thread bound to our agent | `threads.create({ title, agent_id })` | `POST /threads` | ✅ mock-verified (011A) |
| Ask AI | Streamed, grounded answers citing invoice numbers | `threads.messages.stream(threadId, { content })` | `POST /threads/:id/messages/stream` | ✅ mock-verified (011C) |
| Customers | List customers (with lifecycle stage) | `crm.contacts.listByWorkspace(ws, { status?, filters?, tags? })` | `GET /crm/contacts/workspace/:ws` | ✅ mock-verified (013B) |
| Customers | Add a customer | `crm.contacts.create(attrs)` | `POST /crm/contacts` | ✅ mock-verified (008A) |
| Deals | List deals for the board | `crm.deals.listByWorkspace(ws)` | — | ⬜ same pattern as 013B, needs live test |
| Deals | Create a deal | `crm.deals.create(attrs)` | `POST /crm/deals` | ✅ mock-verified (014A) |
| Deals | Move deal between stages | `crm.deals.moveStage(id, { stage_id })` | `PATCH /crm/deals/:id/move-stage` | ✅ mock-verified (014B) |
| Deals | Board columns from pipeline stages | `crm.pipelines.listByWorkspace(ws)` + `crm.pipelineStages.listByPipeline(id)` | `GET /crm/pipelines/workspace/:ws`, `GET /crm/pipeline-stages/pipeline/:id` | ✅ mock-verified (015A/B) |
| Companies | Create/list suppliers as companies | `crm.companies.create(attrs)` | `POST /crm/companies` | ✅ mock-verified (013A) |
| Customers | Promote lead → customer | `crm.contacts.update(id, { lifecycle_stage })` | `PATCH /crm/contacts/:id` | ✅ mock-verified (016A) |
| Follow-ups | Log a call/note | `crm.activities.create({ type, subject, body })` | `POST /crm/activities` | ✅ mock-verified (016B) |
| Follow-ups | Recent follow-ups | `crm.activities.listByWorkspace(ws)` | `GET /crm/activities/workspace/:ws` | ✅ mock-verified (016C) |
| Inventory | List products/stock | `catalog.products.list(ws)` | `GET /catalog/products/workspace/:ws` | ✅ mock-verified (017B) |
| Inventory | Add a product | `catalog.products.create(attrs)` | `POST /catalog/products` | ✅ mock-verified (017A) |
| Inventory | Update stock levels | `catalog.products.update(id, attrs)` | — | ⬜ needs live test |
| Reminders | AI-draft a reminder | `email.outboundEmails.composeWithAi({ to, prompt, context, contact_ref_id })` | `POST /email/outbound-emails/compose-with-ai` | ✅ mock-verified (018A) |
| Reminders | Send the draft | `email.outboundEmails.send(id)` | `PATCH /email/outbound-emails/:id/send` | ✅ mock-verified (018B) |
| Reminders | Sent-reminder log | `email.outboundEmails.listByWorkspace(ws)` | `GET /email/outbound-emails/workspace/:ws` | ✅ mock-verified (018C) |
| Reminders | WhatsApp/SMS channel | `communication` gateway / campaigns | — | ⬜ needs live test (email verified; WhatsApp channel TBD) |
| Appointments | Bookable services list | `scheduling.eventTypes.list(ws)` | — | ⬜ same pattern as 019A create, needs live test |
| Appointments | Book an appointment | `scheduling.events.create({ start_time, end_time, title })` | `POST /scheduling/events` | ✅ mock-verified (019B — no workspace_id in body) |
| Appointments | Day/week view | `scheduling.events.listByDateRange(ws, start, end)` | `GET /scheduling/events/by_date_range` | ✅ mock-verified (019C) |
| Appointments | Mark done / cancel | `scheduling.events.complete(id)` / `cancel(id)` | `PATCH /scheduling/events/:id/complete` | ✅ mock-verified (019D) |
| Appointments | Recurring events | `recurrence_rule` on event create | — | ⬜ needs live test |
| Ask AI | Attach a photo/PDF directly in chat | `SendMessageAttributes.attachments` | — | ⬜ needs live test |
| Future | Payment reminders via WhatsApp/Email | `communication` / multi-channel gateway | — | ⬜ needs live test |
| Future | Weekly auto-summary | `scheduler` (recurring) | — | ⬜ needs live test |
| Future | Owner vs staff access | `roles` / `permissions` | — | ⬜ needs live test |

## Questions for Russ (blocking or clarifying)

1. **ISV credentials** — account, API key, and one sandbox workspace (no real credits burned).
2. **baseUrl** — confirm `https://api.gpt-core.com` is the right host for ISV integrations.
3. **Agent setup** — do we create our own agent via `agents.create` + `threads` with `agent_id`, or is there a system agent to clone? (Test 012 verified the calls; the *seeding model* is a platform decision.)
4. **Grounding** — does a thread's agent automatically see the workspace's extraction results, or must we pass context per message? This decides how the Ask AI screen is wired.
5. **Credits/billing** — does `billing` show per-workspace credit usage so we can display "credits left" to the SME owner?
6. **CORS / key safety** — recommended architecture is: the Nuxt server (Nitro) holds the API key and proxies SDK calls via `server/api/*` routes; the browser never sees the key. Confirm the platform allows server-side (Node) SDK usage with the ISV key, and whether per-portal-user tokens (`portal`/`identity`) exist for later multi-tenant use.

## Swap plan (when credentials arrive) — Russ's cutover design

Confirmed by Russ: build mocks that follow the SDK patterns so cutover is
trivial. That is now implemented in `sme-app/composables/useSmeApi.js`:

- `mockClient` mirrors the `GptClient` surface **1:1** — same namespaces
  (`crm.contacts`, `crm.deals`, `crm.pipelines`, `crm.pipelineStages`,
  `crm.activities`, `catalog.products`, `email.outboundEmails`,
  `extraction.documents/results`, `threads`, `search`), same method names,
  same parameter shapes, same return shapes.
- It is **stateful** like a real server: created records appear in lists,
  moved deals stay moved, composed drafts persist until sent.
- `useSmeApi()` is a thin adapter the pages call; it only adds display
  formatting (UGX) and maps intent → prompt for `composeWithAi`.

### Local SDK smoke-test swap

For a local, server-side smoke test only, the mock can be replaced directly
with the real SDK client:

```js
const client = mockClient;
```

becomes:

```js
import { GptClient } from "@gpt-platform/client";
const client = new GptClient({ baseUrl: GPTCORE_BASE_URL, apiKey: GPTCORE_API_KEY });
```

This is not the production browser architecture. The API key must never be
bundled into the Nuxt client or exposed to the browser.

### Production cutover

For production, keep the pages unchanged and replace the mock transport inside
`useSmeApi()` with calls to Nuxt Nitro routes:

```text
Nuxt page
  -> useSmeApi()
  -> $fetch('/api/...')
  -> Nitro server/api route
  -> GptClient({ baseUrl, apiKey })
  -> GPT Platform
```

Production steps:

1. Add `GPTCORE_BASE_URL` and `GPTCORE_API_KEY` to the server environment.
2. Add `sme-app/server/api/*` routes for the operations used by the pages.
3. Instantiate `GptClient` only in the Nitro server layer.
4. Update `useSmeApi()` to call those routes with `$fetch`.
5. Keep the page-facing adapter method names and return shapes stable.
6. Run the live smoke-test order below before enabling real users.

The mock-to-real boundary is therefore one adapter change, not a literal
one-line browser replacement.

**Live smoke test order** (same suite as TEST-NOTES.md, against the real API):
1. `new GptClient({ apiKey })` — auth works
2. `crm.contacts.listByWorkspace(ws)` — workspace scoping works
3. `extraction.documents.beginUpload` → PUT → `finishUpload` — upload path works
4. `extraction.results.query` — server-side filtering works
5. `threads.create` + `messages.stream` — grounded chat works
