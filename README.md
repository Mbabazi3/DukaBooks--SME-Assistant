# GPT Platform SDK Tests and DukaBooks SME Demo

This repository is primarily an offline test lab for the `@gpt-platform/client`
SDK. It also contains DukaBooks, a Nuxt 3 frontend that demonstrates how an
SME invoice assistant can use the tested SDK capabilities.

## Repository Contents

- `test-*.mjs` - Offline SDK request and response contract tests
- `TEST-NOTES.md` - Verified SDK behavior, endpoint shapes, and findings
- `BACKEND-NEEDS.md` - Backend integration contract for the SME app
- `HANDOFF.md` - Project status and implementation handoff notes
- `sme-app/` - Nuxt 3 DukaBooks frontend demo

## Requirements

- Node.js 18 or newer
- npm

## Install SDK Test Dependencies

From the repository root:

```bash
npx -y npm@11 install
```

## Run SDK Tests

The test files use local mock fetch handlers, so they do not require an API key
or live network access.

Run an individual test:

```bash
node test-threads-agents.mjs
```

Run all root test files:

```bash
for file in test-*.mjs; do node "$file" || exit 1; done
```

The root `package.json` does not yet define an automated test runner. See
`TEST-NOTES.md` for the purpose and result of each test file.

## Run the DukaBooks Frontend

The frontend has its own dependencies and package scripts:

```bash
cd sme-app
npx -y npm@11 install
npx -y npm@11 run dev
```

Open [http://localhost:3000](http://localhost:3000).

The frontend currently uses a stateful in-memory mock client. It does not
require GPT Platform credentials, and data is not persisted to a database.
Frontend-specific commands and routes are documented in
[`sme-app/Readme.md`](sme-app/Readme.md).

## Production Integration

The planned production architecture keeps the GPT Platform API key in Nuxt
Nitro server routes. The browser calls application routes, and those routes
use `GptClient` server-side. See `BACKEND-NEEDS.md` for the integration
contract, open backend questions, and live smoke-test order.

## License

No license has been selected for this project yet.