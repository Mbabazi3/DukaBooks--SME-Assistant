# DukaBooks App

DukaBooks is an SME assistant for a Ugandan shop owner: invoices, scanning,
an AI chat over your invoices, customers, deals, stock, reminders and
appointments. It is also the end-to-end test of the GPT Platform SDK: every
screen runs on real SDK calls.

- **Frontend:** Nuxt 3 pages in `pages/`, calling `composables/useSmeApi.js`.
- **Backend:** Nitro routes in `server/api/`, which call `@gpt-platform/client`
  through `server/utils/gpt.ts`. The API key lives only here.

```text
page → useSmeApi() → /api/* (Nitro) → GptClient → GPT Platform
```

## Setup

Requires Node.js 18+.

```bash
cd dukabooks-app
npx -y npm@11 install
# create .env with the settings below
npx -y npm@11 run dev     # http://localhost:3000
```

Create `dukabooks-app/.env` (git ignores it) with:

| Variable | What it is |
|---|---|
| `GPT_PLATFORM_BASE_URL` | API host, e.g. `https://staging.api.gpt-core.com` |
| `GPT_PLATFORM_APP_ID` | Your app's id (kept for reference; the SDK doesn't need it) |
| `GPT_PLATFORM_APP_KEY` | App key; used only if the server key is empty |
| `GPT_PLATFORM_APP_SERVER_KEY` | Server key the backend uses for every SDK call |
| `GPT_PLATFORM_WORKSPACE_ID` | Workspace UUID the shop lives in (`npm run test:live` in `sdk-contract-tests/` lists them) |
| `GPT_PLATFORM_AGENT_ID` | Optional: agent the Ask AI threads are bound to |
| `GPT_PLATFORM_INVOICE_RESULT_ID` | Optional: extraction result the Dashboard/Invoices query |

Without credentials the app starts, but every `/api` route returns
`503 GPT Platform is not configured`.

Production: `npm run build` then `npm start` (loads `.env` with `node --env-file`).

## Screens

| Route | Screen | Backend routes |
|---|---|---|
| `/` | Dashboard | `/api/invoices`, `/api/customers`, `/api/deals` |
| `/invoices` | Invoices above an amount | `/api/invoices` |
| `/upload` | Scan an invoice | `/api/uploads`, `/api/uploads/:id/finish`, `/api/uploads/:id` |
| `/ask` | Ask AI (streaming) | `/api/assistant/threads`, `/api/assistant/threads/:id/messages` |
| `/inventory` | Products and stock | `/api/products` |
| `/customers` | Customers and follow-ups | `/api/customers`, `/api/activities` |
| `/deals` | Sales pipeline board | `/api/deals`, `/api/deals/stages` |
| `/reminders` | AI-written email reminders | `/api/reminders`, `/api/reminders/compose` |
| `/appointments` | Bookings, day/week view | `/api/services`, `/api/appointments` |

The full route → SDK call map, open questions for the platform team and the
live smoke-test order are in [`BACKEND-NEEDS.md`](BACKEND-NEEDS.md).

## Structure

```text
dukabooks-app/
├── app.vue                 layout + navigation
├── pages/                  one file per screen
├── composables/useSmeApi.js  browser → /api adapter
├── assets/css/main.css
├── server/
│   ├── utils/gpt.ts        GptClient, env config, SDK error mapping
│   ├── utils/shape.ts      small response shapers
│   └── api/                one route per operation
├── nuxt.config.ts
└── .env                    your settings (not committed)
```
