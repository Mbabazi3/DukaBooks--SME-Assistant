# SDK Contract Tests

Offline contract tests for
[`@gpt-platform/client`](https://www.npmjs.com/package/@gpt-platform/client),
written with [Vitest](https://vitest.dev).

Each test gives the SDK a fake platform (`support/mock-platform.ts`) instead of
the network, then asserts the exact request it sends (method, path, query,
JSON:API body, headers) and the shape it returns. No API key or network needed.

## Run

```bash
cd sdk-contract-tests
npx -y npm@11 install
npm test                      # run everything once
npm run test:watch            # re-run on save
npx vitest run tests/crm      # one file
npx vitest run -t "014B"      # one test by name
npm run typecheck
npm run test:live             # read-only checks against the REAL platform (see below)
```

## Live tests (real platform, real credentials)

`npm test` never touches the network — its key (`sk_app_contract_test`) is a
dummy on purpose. `npm run test:live` runs `live/*.live.test.ts` against the
real platform with the SDK:

- Credentials come from `../dukabooks-app/.env` (or the file in
  `GPT_PLATFORM_ENV_FILE`). Nothing secret is stored in this folder.
- **Read-only:** the client's fetch blocks every non-GET request before it is
  sent, so nothing in the workspace is created, changed or deleted.
- Skipped with a message if the settings are missing.
- It prints useful ids, e.g. candidate `GPT_PLATFORM_INVOICE_RESULT_ID` and
  `GPT_PLATFORM_AGENT_ID` values for the app.

In VS Code, install the **Vitest** extension (`vitest.explorer`) to see each
test in the Testing panel with run/debug buttons.

## Layout

```text
sdk-contract-tests/
├── support/mock-platform.ts   fake platform: records requests, returns JSON:API
├── tests/*.test.ts            offline: one file per SDK area (see TEST-NOTES.md)
├── live/                      live read-only checks against the real platform
├── vitest.config.ts           offline suite (npm test)
├── vitest.live.config.ts      live suite (npm run test:live)
└── TEST-NOTES.md              verified calls, endpoint shapes, SDK findings
```

## Writing a test

```ts
import { expect, it } from "vitest";
import { mockPlatform, resource } from "../support/mock-platform";

it("014B moveStage() is a PATCH with stage_id in the attributes", async () => {
  const platform = mockPlatform({
    "PATCH /crm/deals/deal_1/move-stage": () => resource("deal_1", "crm-deal", { pipeline_stage_id: "won" }),
  });

  const deal = await platform.client.crm.deals.moveStage("deal_1", { stage_id: "won" });

  expect(platform.last.body).toEqual({ data: { type: "crm-deal", id: "deal_1", attributes: { stage_id: "won" } } });
  expect(deal.pipeline_stage_id).toBe("won");
});
```

- Handlers are keyed `"METHOD /path"`; returning plain data wraps it in `{ data }`.
- `platform.last` / `platform.requests` hold what the SDK sent.
- Unmocked routes get a JSON:API 404, so a wrong path fails loudly.
- Take the next test number and add a row to `TEST-NOTES.md`.
