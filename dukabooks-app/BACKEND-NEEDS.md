# BACKEND-NEEDS.md — What the SME app needs from GPT Platform

The DukaBooks app (`dukabooks-app/`) is a Nuxt 3 frontend with a Nitro
backend that calls the GPT Platform SDK. This document is the contract it
expects GPT Platform to fulfil. Every SDK call listed has already been verified
at the request/response level by the offline contract tests (see
`../sdk-contract-tests/TEST-NOTES.md`) — what remains is confirming them live
once ISV credentials arrive.

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

## Backend architecture (implemented)

The in-browser mock is gone. The app now has its own backend: Nitro routes in
`server/api/` that call the real `GptClient` (`server/utils/gpt.ts`). The
browser only ever calls `/api/*`, so the API key never leaves the server.

```text
Nuxt page
  -> useSmeApi()                 composables/useSmeApi.js (same method names as before)
  -> $fetch('/api/...')
  -> Nitro route                 server/api/**
  -> useGptClient() + sdk()      server/utils/gpt.ts
  -> GPT Platform
```

| App route | SDK call |
|---|---|
| `GET /api/invoices?field&op&value` | `extraction.results.query(invoiceResultId, { filters })` |
| `POST /api/uploads` | `extraction.documents.beginUpload(attrs)` |
| browser `PUT upload_url` | presigned storage upload (file never touches our server) |
| `PATCH /api/uploads/:id/finish` | `extraction.documents.finishUpload(id)` |
| `GET /api/uploads/:id` (polled) | `extraction.documents.status(id)` → `extraction.results.byDocument(id)` |
| `POST /api/assistant/threads` | `threads.create({ title, agent_id })` |
| `POST /api/assistant/threads/:id/messages` | `threads.messages.stream(id, { content })`, relayed as SSE |
| `GET / POST /api/customers` | `crm.contacts.listByWorkspace` / `create` |
| `PATCH /api/customers/:id/stage` | `crm.contacts.update(id, { lifecycle_stage })` |
| `GET / POST /api/deals` | `crm.deals.listByWorkspace` / `create` |
| `PATCH /api/deals/:id/stage` | `crm.deals.moveStage(id, { stage_id })` |
| `GET /api/deals/stages` | `crm.pipelines.listByWorkspace` → `crm.pipelineStages.listByPipeline` |
| `GET / POST /api/activities` | `crm.activities.listByWorkspace` / `create` |
| `GET / POST /api/products` | `catalog.products.list` / `create` (stock in `properties.stock`) |
| `POST /api/reminders/compose` | `email.outboundEmails.composeWithAi(...)` |
| `POST /api/reminders/:id/send` | `email.outboundEmails.send(id)` |
| `GET /api/reminders` | `email.outboundEmails.listByWorkspace` |
| `GET /api/services` | `scheduling.eventTypes.list(ws)` |
| `GET / POST /api/appointments` | `scheduling.events.listByDateRange` / `create` |
| `PATCH /api/appointments/:id/complete\|cancel` | `scheduling.events.complete` / `cancel` |

Configuration (`.env`, see `.env.example`): `NUXT_GPT_PLATFORM_BASE_URL`,
`NUXT_GPT_PLATFORM_API_KEY`, `NUXT_GPT_PLATFORM_WORKSPACE_ID`,
`NUXT_GPT_PLATFORM_AGENT_ID`, `NUXT_GPT_PLATFORM_INVOICE_RESULT_ID`. Without a
key every route answers `503 GPT Platform is not configured`. SDK errors are
passed through with their status code and request id.

Things the mock used to hide that the backend now handles:

- The invoice result id, agent id and workspace id are config, not hardcoded.
- The Deals board finds the pipeline id via `crm.pipelines.listByWorkspace`.
- Scan uses the real document id and polls status instead of a fixed delay.
- `threads.messages.stream()` returns a **Promise** of an async iterator, so it
  must be awaited before `for await`.
- A 2xx with no `{ data }` envelope is turned into a `502` (SDK finding #1).

**Live smoke test order** (same suite as TEST-NOTES.md, against the real API):
1. `new GptClient({ apiKey })` — auth works
2. `crm.contacts.listByWorkspace(ws)` — workspace scoping works
3. `extraction.documents.beginUpload` → PUT → `finishUpload` — upload path works
4. `extraction.results.query` — server-side filtering works
5. `threads.create` + `messages.stream` — grounded chat works
