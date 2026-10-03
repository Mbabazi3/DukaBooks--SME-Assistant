# GPT Platform SDK — Test Notes (Client SDK v1.2.0)

Local mock-fetch testing of `@gpt-platform/client`. Each test intercepts the
network layer to verify the exact HTTP requests the SDK generates and how it
unwraps responses. No live API key required.

## Tests run

| Test | SDK call | Verified request | Result |
|------|----------|------------------|--------|
| 001 | `new GptClient(...)` | — | Client constructs; `apiVersion: 2026-07-12`; UA `GPTCore/JS 1.2.0` |
| 008A | `crm.contacts.create(...)` | `POST /crm/contacts` | JSON:API body `{ data: { type: "crm-contact", attributes } }`; auto `Idempotency-Key` header |
| 008B | `extraction.documents.beginUpload(...)` → `finishUpload(id)` | `POST /extraction/documents/begin-upload` → `PATCH /extraction/documents/:id/finish-upload` | Lifecycle `pending_upload` → `processing`; returns presigned `upload_url` |
| 008C | `extraction.results.byDocument(id)` | `GET /extraction/results/document/:id` | Unwraps JSON:API array; attributes flattened to top level |
| 009A | `search.query("INV-1045")` | `GET /search?query=...` | Full-text (Meilisearch); returns `{ hits, total, processing_time_ms }` |
| 009B | `search.semantic("...")` | `GET /search/semantic?query=...` | Vector search (pgvector); hits ranked by cosine `score` |
| 010A | `results.query(id, { filters: [{ total gt 2000000 }] })` | `POST /extraction/results/:id/query` | Server-side row filter; returns `{ rows, total, filtered, limit, offset }` |
| 010B | `results.query(id, { filters: [supplier contains + total gt] })` | `POST /extraction/results/:id/query` | Multiple filters AND-ed together |
| 011A | `threads.create({ title, agent_id })` | `POST /threads` | Thread created, agent-bound |
| 011B | `threads.messages.send(id, question)` | `POST /threads/:id/messages` | Assistant reply unwrapped; sources in `metadata` |
| 011C | `threads.messages.stream(id, { content })` | `POST /threads/:id/messages/stream` | SSE: `token` events + `done` with sources |
| 012A | `agents.create("SME Invoice Analyst", {...})` | `POST /agents` | Agent created with instructions/vertical/tags |
| 012B | `agents.validate(id)` / `agents.test(id)` | `POST /agents/:id/validate`, `/test` | Schema validation + test run |
| 013A | `crm.companies.create({...})` | `POST /crm/companies` | Company created (JSON:API `crm-company`) |
| 013B | `crm.contacts.listByWorkspace(ws)` | `GET /crm/contacts/workspace/:ws` | Note: workspace is a **path segment**, not query param; supports `status`/`filters`/`tags` params |
| 014A | `crm.deals.create({...})` | `POST /crm/deals` | Deal created with amount/currency/pipeline_stage_id |
| 014B | `crm.deals.moveStage(id, { stage_id })` | `PATCH /crm/deals/:id/move-stage` | Body: `{ data: { type, id, attributes: { stage_id } } }` |
| 015A | `crm.pipelines.listByWorkspace(ws)` | `GET /crm/pipelines/workspace/:ws` | Same path-segment pattern as contacts |
| 015B | `crm.pipelineStages.listByPipeline(pipeId)` | `GET /crm/pipeline-stages/pipeline/:id` | Ordered stage definitions — drives the Deals board columns |
| 016A | `crm.contacts.update(id, { lifecycle_stage })` | `PATCH /crm/contacts/:id` | PATCH semantics — only sent fields change (lead → customer) |
| 016B | `crm.activities.create({ type, subject, body })` | `POST /crm/activities` | Workspace-level follow-up record (no direct contact link field; use `source_ref`/`properties`) |
| 016C | `crm.activities.listByWorkspace(ws)` | `GET /crm/activities/workspace/:ws` | Recent follow-ups, paginated |
| 017A | `catalog.products.create({...})` | `POST /catalog/products` | **`base_price` is typed as a decimal STRING** — intentional per docblock (`'29.99'`, precision), but inconsistent with `crm.deals.amount` (number). See finding #3 |
| 017B | `catalog.products.list(ws)` | `GET /catalog/products/workspace/:ws` | Note: method is `list(ws)` (takes workspaceId directly); stock lives in `properties` |
| 018A | `email.outboundEmails.composeWithAi({ to, prompt, context })` | `POST /email/outbound-emails/compose-with-ai` | Platform AI drafts subject + body_html from a prompt + structured context |
| 018B | `email.outboundEmails.send(id)` | `PATCH /email/outbound-emails/:id/send` | **Send is a PATCH**, not POST; body is bare `{ data: { id, type } }` |
| 018C | `email.outboundEmails.listByWorkspace(ws)` | `GET /email/outbound-emails/workspace/:ws` | Sent-mail log with status + sent_at |
| 019A | `scheduling.eventTypes.create({ name, duration_minutes })` | `POST /scheduling/event-types` | Bookable service types (slug, booking_enabled, capacity) |
| 019B | `scheduling.events.create({ start_time, end_time, title })` | `POST /scheduling/events` | **No workspace_id in the body** — platform infers from auth |
| 019C | `scheduling.events.listByDateRange(ws, start, end)` | `GET /scheduling/events/by_date_range` | workspace_id + times as **query params**; day-view friendly |
| 019D | `scheduling.events.complete(id)` | `PATCH /scheduling/events/:id/complete` | **Another PATCH** (like email send); `cancel` follows same pattern |
| 020A | `reviews.queues.summaries()` | `GET /review-queues/summaries` | Per-queue pending + SLA-overdue counts (human-in-loop for low-confidence extractions) |
| 020B | `reviews.reviews.list({ pageSize })` | `GET /reviews?size=20` | Open review items. **Note the nesting:** item methods live on `client.reviews.reviews`, not `client.reviews` |
| 020C | `reviews.reviews.claim(id)` | `PATCH /reviews/:id/claim` | Reviewer takes ownership |
| 020D | `reviews.reviews.correct(id, { ... })` | `PATCH /reviews/:id/correct` | Human fixes an extracted value |
| 020E | `reviews.reviews.approve(id, { decision_payload })` | `PATCH /reviews/:id/approve` | Human confirms the AI value |

## Key type contracts (from dist/*.d.ts)

- `ExtractionResult.attributes`: `status` (pending/completed/failed),
  `extracted_fields` (key/value map), `rows` (tabular output),
  `avg_confidence` / `classification_confidence`, `field_status`
  (per-field: extracted/failed/inferred/pending/retried), `document_type`,
  `domain`, OCR + timing metadata, `schema_id/revision/version`, `credits_used`.
- `results.query(resultId, { filters, limit, offset })` — **server-side row
  filtering** over extracted rows. `AttributeFilter` = `{ field, op, value }`
  with ops `eq, not_eq, contains, in, lt, gt, not_null`. Limit default 1000,
  server max 5000. This powers questions like "which invoices are above
  UGX 2,000,000?" without client-side filtering.

## SDK findings (worth reporting to Russ)

1. **Silent `undefined` on non-envelope responses.** `execute()` reads
   `body?.data` and unwraps that (`dist/index.mjs:1091`). If the server (or a
   mock) returns a bare JSON body without the JSON:API `{ data: ... }`
   envelope, every namespace method returns `undefined` instead of throwing.
   A defensive check with a clear error would help integrators a lot.
2. **`client.config.fetch` is bound at construction.** Assigning
   `client.config.fetch = fn` after `new GptClient(...)` has no effect; the
   fetch implementation is captured when the client is built. For tests, pass
   `fetch` in the constructor and create a new client per mock.

## SME POC — verified RAG pipeline (all endpoints confirmed via mocks)

```
Upload      extraction.documents.beginUpload → PUT to upload_url → finishUpload
Extract     platform processes → results.byDocument(id) → structured fields/rows
Query rows  results.query(resultId, { filters: [{ field: 'total', op: 'gt', value: 2000000 }] })
Retrieve    search.query (keywords) / search.semantic (natural language)
Answer      agents / threads namespaces  ← next to test
```

## Test files

- `test-client.mjs` — Test 008C (extraction results by document)
- `test-search.mjs` — Test 009A/009B (full-text + semantic search)
- `test-results-query.mjs` — Test 010A/010B (server-side row filtering)
- `test-threads-agents.mjs` — Tests 011/012 (chat threads, streaming, agents)
- `test-crm.mjs` — Tests 013/014 (companies, contacts list, deals, moveStage)
- `test-crm2.mjs` — Tests 015/016 (pipelines, stages, contact promote, activities)
- `test-phase3.mjs` — Tests 017/018 (catalog products, AI-composed reminders, send)
- `test-phase4.mjs` — Test 019 (event types, events, date-range day view, complete)
- `test-reviews.mjs` — Test 020 (review queues, claim/correct/approve)
- `test-blank-response.mjs` — silent-`undefined` demo (finding #1)
- `test-sdk-demo.mjs` — self-contained 14-check harness for the SDK author (`npm run test:demo`)
- `run-all.mjs` — runs every `test-*.mjs` and prints PASS/FAIL (`npm test`)

### Mock-writing gotcha

A `Request` body can only be read once. In a mock fetch, call
`await request.text()` a single time, store the string, and reuse it —
reading it twice throws `Body is unusable: Body has already been read`
(which the SDK's retry wrapper then reports as an opaque `NetworkError`).

## Next steps

1. ~~Test the AI answer step (threads/agents)~~ — done, tests 011/012.
2. Get real ISV credentials from Russ → re-run the suite against the live API.
3. ~~Scaffold the Nuxt frontend~~ — done, see `../dukabooks-app/`.
