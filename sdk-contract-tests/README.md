# SDK Contract Tests

Offline request/response contract tests for
[`@gpt-platform/client`](https://www.npmjs.com/package/@gpt-platform/client).

Each `test-*.mjs` passes a mock `fetch` into `new GptClient({ fetch })`, so it
checks the exact HTTP request the SDK builds (method, path, JSON:API body,
headers) and how it unwraps the response. No API key or network is needed.

## Run

```bash
cd sdk-contract-tests
npx -y npm@11 install
npm test                 # every test file, PASS/FAIL summary
npm test -- crm          # only files whose name contains "crm"
npm test -- --verbose    # include each test's request/response log
npm run test:demo        # the 14-check harness for the SDK author
node test-phase4.mjs     # any single file
```

## Files

| File | Covers |
|---|---|
| `test-client.mjs` | 008C extraction results by document |
| `test-search.mjs` | 009 full-text + semantic search |
| `test-results-query.mjs` | 010 server-side row filtering |
| `test-threads-agents.mjs` | 011/012 threads, streaming, agents |
| `test-crm.mjs` | 013/014 companies, contacts, deals, moveStage |
| `test-crm2.mjs` | 015/016 pipelines, stages, promote, activities |
| `test-phase3.mjs` | 017/018 catalog, AI-composed email, send |
| `test-phase4.mjs` | 019 scheduling |
| `test-reviews.mjs` | 020 review queues (human-in-the-loop) |
| `test-blank-response.mjs` | Finding #1: silent `undefined` |
| `test-sdk-demo.mjs` | Self-contained 14-check harness |
| `run-all.mjs` | Test runner |

Results, endpoint shapes and SDK findings are logged in
[`TEST-NOTES.md`](TEST-NOTES.md).

## Adding a test

Inspect the namespace in `node_modules/@gpt-platform/client/dist/index.d.ts`,
copy an existing file, take the next test number, and add a row to
`TEST-NOTES.md`. Wrap every mock response in `{ data: … }` (JSON:API), and read
`request.text()` only once.
