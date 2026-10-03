# HANDOFF — DukaBooks × GPT Platform SDK (checkpoint: Phase 4 in progress — scheduling done)

Assignment (from Russ): test the GPT Platform SDKs offline, understand the
platform deeply, and have something to show Jonathan. Vehicle: **DukaBooks**,
an SME business app for a Ugandan shop owner, built on `@gpt-platform/client`
v1.2.0. Strategy confirmed by Russ: mocks that follow SDK patterns → simple
cutover when ISV credentials arrive. Status: cutover done in code — the app's
backend now calls the real SDK; it needs ISV credentials in `.env` to run.

## Folder map (`~/ai-coding/gpt-platform-sdk-lab/`)

| Path | What it is |
|---|---|
| `sdk-contract-tests/` | Offline SDK tests (`npm test` runs them all) |
| `sdk-contract-tests/TEST-NOTES.md` | Master test log: verified calls, endpoints, findings |
| `sdk-contract-tests/test-sdk-demo.mjs` | Self-contained 14-check harness for Russ (PASS/FAIL) |
| `sdk-contract-tests/test-blank-response.mjs` | Demo of finding #1 (silent undefined) |
| `dukabooks-app/` | Nuxt 3 app: frontend `pages/` + backend `server/api/` on the real SDK |
| `dukabooks-app/BACKEND-NEEDS.md` | Screen → route → SDK contract, questions for Russ, live smoke order |

## The app (all screens verified rendering)

Dashboard · Invoices (server-side filter) · **Inventory** (catalog) ·
**Customers** (list/add/promote) · **Deals board** (API-driven stages,
moveStage) · **Follow-ups** (activities) · **Reminders** (AI-draft → send) ·
Scan (upload lifecycle) · Ask AI (streaming chat).

## Architecture that matters

- **Browser never sees the key.** Pages call `composables/useSmeApi.js`, which
  calls the app's own `/api/*` routes. Those Nitro routes call `GptClient`
  via `server/utils/gpt.ts` (config from `GPT_PLATFORM_*` vars in `dukabooks-app/.env`).
- The in-browser `mockClient` was removed; the app runs on the real SDK only.
  Without credentials, `/api/*` returns `503 GPT Platform is not configured`.
- Offline proof of each call stays in `sdk-contract-tests/`.

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
- ⬜ Send Russ: the drafted message + `sdk-contract-tests/test-sdk-demo.mjs` + TEST-NOTES.md
- ⬜ Live smoke test (order in BACKEND-NEEDS.md): auth → contacts list → upload
  path → results.query → threads stream

## Next phases

- **Phase 4 — Run the shop**: `scheduling` (appointments + recurring), `forms`,
  `support` tickets, `reviews` (human-in-loop for low-confidence extractions)
- **Phase 5 — Depth**: `memory`/knowledge graph, `voice`, `connectors`,
  `channels`/`events` (WebSocket refresh), `billing` (credits display)
- Pattern for each new module: inspect d.ts → offline test in
  `sdk-contract-tests/` (next number) → `server/api` route → `useSmeApi` method →
  page → verify → docs.
