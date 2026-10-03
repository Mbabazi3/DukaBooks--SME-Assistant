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
cp .env.example .env      # then fill in your GPT Platform values
npx -y npm@11 run dev     # http://localhost:3000
```

| Variable | What it is |
|---|---|
| `NUXT_GPT_PLATFORM_BASE_URL` | API host (default `https://api.gpt-core.com`) |
| `NUXT_GPT_PLATFORM_API_KEY` | ISV / app server key (`sk_app_…`) |
| `NUXT_GPT_PLATFORM_WORKSPACE_ID` | Workspace the shop lives in |
| `NUXT_GPT_PLATFORM_AGENT_ID` | Agent the Ask AI threads are bound to |
| `NUXT_GPT_PLATFORM_INVOICE_RESULT_ID` | Extraction result the Dashboard/Invoices query |

Without credentials the app starts, but every `/api` route returns
`503 GPT Platform is not configured`.

Other commands: `npm run build`, `npm run preview`.

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
│   ├── utils/gpt.ts        GptClient, config, SDK error mapping
│   ├── utils/shape.ts      small response shapers
│   └── api/                one route per operation
├── nuxt.config.ts          runtimeConfig.gptPlatform (server-only)
└── .env.example
```
