# GPT Platform SDK — Test Notes (Client SDK v1.2.0)

Local mock-fetch testing of `@gpt-platform/client` with Vitest. Each test intercepts the
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

Vitest suites in `tests/` (run `npm test`); the fake platform is `support/mock-platform.ts`.

| File | Tests |
|---|---|
| `tests/client.test.ts` | 001 + shared request shape (JSON:API body, Idempotency-Key, User-Agent, versioned Accept, `x-application-key`) |
| `tests/extraction.test.ts` | 008B upload lifecycle, `status()`, 008C `byDocument`, 010A/B server-side `query` |
| `tests/search.test.ts` | 009A full-text, 009B semantic |
| `tests/threads-agents.test.ts` | 011A–C threads + streaming, 012A–B agents |
| `tests/crm.test.ts` | 008A, 013–016 contacts, companies, deals, pipelines, activities |
| `tests/catalog-email.test.ts` | 017 catalog (incl. `update`), 018 AI-composed email |
| `tests/scheduling.test.ts` | 019 event types (incl. `list`), events (incl. `cancel`) |
| `tests/reviews.test.ts` | 020 review queues, claim/correct/approve |
| `tests/sdk-findings.test.ts` | Findings #1 and #2 (replaces the old 14-check demo harness) |

Every test asserts the exact method, path, query and body the SDK sends, and
the shape it returns — a change in SDK behaviour fails the test.

### Live checks

`live/staging.live.test.ts` (`npm run test:live`) runs read-only list calls
against the real platform using `dukabooks-app/.env`: contacts (auth check),
deals/pipelines/stages, activities, products, emails, event types + events,
extraction documents → results, search, review queues, agents. Non-GET
requests are blocked in the client's fetch.

### Staging findings (live runs, 2026-10-05)

- Workspace ids are UUIDs. The old `ws_duka_001` is a mock id → `400 invalid_argument`.
- `new GptClient({ workspaceId })` appends `?workspace_id=` to EVERY request.
  Staging rejects a request that also has the workspace in the path
  (`/crm/contacts/workspace/:id`) with `400 invalid_query "conflict path and
  query params"`. So: don't set `workspaceId` on the client when calling
  path-scoped methods; pass the id per call.
- `reviews.queues.summaries()` is typed `ReviewQueueSummary[]` but returns `{ items: [...] }`.
- `search.query()` returns `500` even with a valid workspace
  (request `GNufCqnh-iuFO6AAG2PD`) — report to Russ.
- `platform.applications.readCurrent()` returned no name/id with the server key.
- With the correct workspace (run 3): email log, extraction documents, review
  queues and agents **work**; CRM (contacts, deals, activities), catalog and
  scheduling return `403 forbidden` — the key is valid but lacks those
  permissions (requests `GNufRcWrCmRS7PQAG2ij`, `GNufRga07SxS7PQAG2kD`,
  `GNufRi4PQo5S7PQAPJAh`). Search still `500` (`GNufRpNOkLAGRZgAG2kj`).

### Other observations (not reported)

- `threads.messages.send()` wraps content in `data.attributes` and adds
  `metadata.context` (timezone, locale, local time) by itself, but
  `threads.messages.stream()` puts `content` directly under `data`.
- `extraction.results.query()` sends a bare `{ filters, limit, offset }` body,
  not a JSON:API envelope.
- A 500 is retried (default retry config) before the error is thrown.
- SDK v2.0.0 moves the API version to `2026-09-17`; the rest of this suite
  passes unchanged against v2.0.0.

### Mock-writing gotcha

A `Request` body can only be read once. In a mock fetch, call
`await request.text()` a single time, store the string, and reuse it —
reading it twice throws `Body is unusable: Body has already been read`
(which the SDK's retry wrapper then reports as an opaque `NetworkError`).

## Next steps

1. ~~Test the AI answer step (threads/agents)~~ — done, tests 011/012.
2. Get real ISV credentials from Russ → re-run the suite against the live API.
3. ~~Scaffold the Nuxt frontend~~ — done, see `../dukabooks-app/`.
