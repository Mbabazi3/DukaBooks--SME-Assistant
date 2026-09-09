# HANDOFF — DukaBooks × GPT Platform SDK (checkpoint: Phase 4 in progress — scheduling done)

Assignment (from Russ): test the GPT Platform SDKs offline, understand the
platform deeply, and have something to show Jonathan. Vehicle: **DukaBooks**,
an SME business app for a Ugandan shop owner, built on `@gpt-platform/client`
v1.2.0. Strategy confirmed by Russ: mocks that follow SDK patterns → simple
cutover when ISV credentials arrive.

## Folder map (`~/ai-coding/gpt-platform-sdk-lab/`)

| Path | What it is |
|---|---|
| `TEST-NOTES.md` | Master test log: 24 verified calls, endpoints, findings |
| `BACKEND-NEEDS.md` | App→backend contract per screen + cutover plan + live smoke order |
| `test-*.mjs` | Offline mock suite: 008–018 series (extraction, search, threads/agents, CRM, catalog, email) |
| `test-blank-response.mjs` | Demo of finding #1 (silent undefined) |
| `russ-sdk-demo.mjs` | Self-contained 14-check harness for Russ (runs offline, PASS/FAIL) |
| `sme-app/` | Nuxt 3 app (8 screens). Dev: `npx -y npm@11 run dev` → localhost:3000 |

## The app (all screens verified rendering)

Dashboard · Invoices (server-side filter) · **Inventory** (catalog) ·
**Customers** (list/add/promote) · **Deals board** (API-driven stages,
moveStage) · **Follow-ups** (activities) · **Reminders** (AI-draft → send) ·
Scan (upload lifecycle) · Ask AI (streaming chat).

## Architecture that matters

- `sme-app/composables/useSmeApi.js` = **the seam**. `mockClient` mirrors the
  real GptClient surface 1:1 (namespaces, method names, params, returns),
  stateful. `useSmeApi()` is a thin adapter pages call.
- **Cutover = one line**: `const client = mockClient` → `new GptClient({ baseUrl, apiKey })`.
- Mock behaviours are backed by real offline tests against the actual SDK —
  not guesses.

## SDK findings (for Russ — message drafted, not yet sent)

1. **Silent `undefined`**: non-envelope 2xx/204 responses make every namespace
   method return `undefined` (no shape validation in `execute()`, index.mjs:1091).
   5 repro scenarios. Real 4xx/5xx throw properly.
2. Minor: `fetch` captured at construction; `client.config.fetch` reassign is a no-op.
3. Dropped from message per decision: `base_price` decimal-string is intentional
   (documented); only cross-namespace inconsistency (crm amount = number) noted in TEST-NOTES.

## Conventions / gotchas learned

- SDK is strict JSON:API — every mock response must be wrapped `{ data: … }`.
- Workspace listings use **path segments** (`/crm/contacts/workspace/:id`), not query params.
- `catalog.base_price` is a **string**; `email.send` is a **PATCH**; CRM activities are
  workspace-level (no contact_id field).
- Mock gotcha: a Request body can be read **once** (`request.text()` twice throws,
  surfacing as opaque NetworkError via retry wrapper).
- Local npm 9.2.0 is broken (arborist crash) → always `npx -y npm@11 …` in this workspace.

## Blocked / pending

- ⬜ ISV credentials from Russ (account + API key + sandbox workspace + baseUrl confirm)
- ⬜ Send Russ: the drafted message + `russ-sdk-demo.mjs` + TEST-NOTES.md
- ⬜ Live smoke test (order in BACKEND-NEEDS.md): auth → contacts list → upload
  path → results.query → threads stream

## Next phases

- **Phase 4 — Run the shop**: `scheduling` (appointments + recurring), `forms`,
  `support` tickets, `reviews` (human-in-loop for low-confidence extractions)
- **Phase 5 — Depth**: `memory`/knowledge graph, `voice`, `connectors`,
  `channels`/`events` (WebSocket refresh), `billing` (credits display)
- Pattern for each new module: inspect d.ts → offline test (next number) →
  mockClient method → thin adapter → page → verify → docs.
